import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PLAN_LIMITS: Record<string, { images: number; videos: number }> = {
  trial:   { images: 10,  videos: 2   },
  weekly:  { images: 20,  videos: 3   },
  monthly: { images: 80,  videos: 10  },
  yearly:  { images: 900, videos: 100 },
};

const PLAN_PRICES: Record<string, { amount: number; interval: string; interval_count: number }> = {
  weekly:  { amount: 599,   interval: "week",  interval_count: 1  },
  monthly: { amount: 1999,  interval: "month", interval_count: 1  },
  yearly:  { amount: 19999, interval: "year",  interval_count: 1  },
};

function getServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, serviceRoleKey);
}

async function getSubscription(email: string) {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  return data;
}

function isSubscriptionActive(sub: any): boolean {
  if (!sub) return false;
  const now = new Date();
  if (sub.status === "trialing") {
    return sub.trial_end ? new Date(sub.trial_end) > now : false;
  }
  if (sub.status === "active") {
    return sub.current_period_end ? new Date(sub.current_period_end) > now : false;
  }
  return false;
}

async function handleGetSubscription(email: string) {
  const sub = await getSubscription(email);
  return jsonResponse({
    subscription: sub || null,
    is_active: isSubscriptionActive(sub),
  });
}

async function handleCreateTrial(email: string) {
  const supabase = getServiceClient();

  const existing = await getSubscription(email);
  if (existing) {
    return jsonResponse({ error: "Email already has a subscription" }, 400);
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const limits = PLAN_LIMITS.trial;

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      email,
      plan: "trial",
      status: "trialing",
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      images_used: 0,
      videos_used: 0,
      images_limit: limits.images,
      videos_limit: limits.videos,
    })
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ subscription: data });
}

async function handleCreateCheckout(
  email: string,
  plan: string,
  successUrl: string,
  cancelUrl: string
) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return jsonResponse({ error: "Stripe not configured" }, 500);
  }

  const priceConfig = PLAN_PRICES[plan];
  if (!priceConfig) {
    return jsonResponse({ error: `Invalid plan: ${plan}` }, 400);
  }

  const supabase = getServiceClient();

  let { data: customer } = await supabase
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("email", email)
    .maybeSingle();

  let customerId = customer?.stripe_customer_id;

  if (!customerId) {
    const customerRes = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ email }),
    });
    const customerData = await customerRes.json();
    if (!customerRes.ok) return jsonResponse({ error: customerData.error?.message }, 500);
    customerId = customerData.id;

    await supabase.from("stripe_customers").insert({ email, stripe_customer_id: customerId });
  }

  const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      customer: customerId,
      mode: "subscription",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": `Sakugai ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      "line_items[0][price_data][unit_amount]": String(priceConfig.amount),
      "line_items[0][price_data][recurring][interval]": priceConfig.interval,
      "line_items[0][price_data][recurring][interval_count]": String(priceConfig.interval_count),
      "line_items[0][quantity]": "1",
      success_url: successUrl,
      cancel_url: cancelUrl,
      "metadata[email]": email,
      "metadata[plan]": plan,
    }),
  });

  const sessionData = await sessionRes.json();
  if (!sessionRes.ok) return jsonResponse({ error: sessionData.error?.message }, 500);

  return jsonResponse({ url: sessionData.url });
}

async function handleIncrementUsage(email: string, type: "image" | "video") {
  const supabase = getServiceClient();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (!sub || !isSubscriptionActive(sub)) {
    return jsonResponse({ error: "No active subscription" }, 403);
  }

  const usedField = type === "image" ? "images_used" : "videos_used";
  const limitField = type === "image" ? "images_limit" : "videos_limit";

  if (sub[usedField] >= sub[limitField]) {
    return jsonResponse({ limit_reached: true });
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({ [usedField]: sub[usedField] + 1, updated_at: new Date().toISOString() })
    .eq("email", email);

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ success: true, limit_reached: false });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "get_subscription") {
      const { email } = body;
      if (!email) return jsonResponse({ error: "email required" }, 400);
      return await handleGetSubscription(email);
    }

    if (action === "create_trial") {
      const { email } = body;
      if (!email) return jsonResponse({ error: "email required" }, 400);
      return await handleCreateTrial(email);
    }

    if (action === "create_checkout") {
      const { email, plan, success_url, cancel_url } = body;
      if (!email || !plan) return jsonResponse({ error: "email and plan required" }, 400);
      return await handleCreateCheckout(email, plan, success_url, cancel_url);
    }

    if (action === "increment_usage") {
      const { email, type } = body;
      if (!email || !type) return jsonResponse({ error: "email and type required" }, 400);
      return await handleIncrementUsage(email, type);
    }

    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (error: any) {
    return jsonResponse({ error: error.message || "Internal server error" }, 500);
  }
});
