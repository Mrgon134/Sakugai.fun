import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getFalKey(): Promise<string | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return null;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "FAL_API_KEY")
      .maybeSingle();

    return data?.value ?? null;
  } catch {
    return null;
  }
}

const ALLOWED_IMAGE_MODELS = [
  "fal-ai/flux/schnell",
  "fal-ai/bytedance/seedream/v3/text-to-image",
];

const ALLOWED_VIDEO_MODELS = [
  "fal-ai/pixverse/v4.5/text-to-video",
  "fal-ai/minimax/hailuo-02/standard/text-to-video",
  "fal-ai/kling-video/v2.1/master/text-to-video",
];

const RATIO_TO_IMAGE_SIZE: Record<string, string> = {
  "1:1": "square_hd",
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9",
  "4:3": "landscape_4_3",
  "21:9": "landscape_16_9",
};

const SEEDREAM_SUPPORTED_RATIOS = ["1:1", "3:4", "4:3", "16:9", "9:16", "2:3", "3:2", "21:9"];
const PIXVERSE_SUPPORTED_RATIOS = ["16:9", "9:16", "4:3", "3:4", "1:1"];
const KLING_SUPPORTED_RATIOS = ["16:9", "9:16", "1:1"];

function clampRatio(ratio: string, supported: string[]): string {
  if (supported.includes(ratio)) return ratio;
  if (ratio === "21:9" && supported.includes("16:9")) return "16:9";
  if (ratio === "4:3" && supported.includes("16:9")) return "16:9";
  return supported[0];
}

const IMAGE_PROMPT_SUFFIX = "anime style, vibrant colors, detailed lineart, high quality illustration";

const VIDEO_STYLE_PROMPTS: Record<string, string> = {
  "Shounen": "2D anime style, hand-drawn animation, cel shading, vibrant colors, dynamic action lines, fluid motion, Japanese anime aesthetic, Studio MAPPA style, high quality anime animation, NOT CGI, NOT 3D render, NOT realistic",
  "Shoujo": "2D anime style, soft watercolor aesthetic, delicate lineart, pastel tones, shojo manga style, flowing hair animation, romantic lighting, fluid motion, Japanese anime, NOT CGI, NOT 3D render, NOT realistic",
  "Cyberpunk Anime": "2D anime style, cyberpunk anime aesthetic, neon-lit, cel-shaded animation, Ghost in the Shell style, Akira style, fluid motion, glowing neon colors, dark atmospheric anime, NOT CGI, NOT 3D render, NOT photorealistic",
  "Dark Fantasy": "2D anime style, dark fantasy anime, cel-shaded animation, dramatic shadows, Berserk anime style, fluid motion, dark atmospheric colors, detailed anime lineart, NOT CGI, NOT 3D render, NOT realistic",
  "Chibi": "2D chibi anime style, cute chibi character animation, super deformed SD style, bright pastel colors, bouncy fluid motion, Japanese chibi anime, kawaii aesthetic, NOT CGI, NOT 3D render, NOT realistic",
};

const DEFAULT_VIDEO_SUFFIX = "2D anime style, cel-shaded animation, fluid motion, Japanese anime aesthetic, NOT CGI, NOT 3D render, NOT realistic";

const PIXVERSE_STYLE_CONTEXT: Record<string, string> = {
  "Shounen": "dynamic action sequence, dramatic camera angle, intense expressive eyes, bold saturated colors, speed lines, heroic atmosphere, studio-quality animation, smooth fluid motion, cinematic framing",
  "Shoujo": "romantic soft-focus lighting, gentle breeze effect on hair, delicate pastel color grading, close-up emotional expression, sparkle bokeh effects, dreamy atmosphere, elegant smooth motion, intimate cinematic framing",
  "Cyberpunk Anime": "neon-drenched rain-soaked environment, glowing holographic elements, high-contrast dramatic lighting, lens flare effects, dark moody atmosphere with electric color accents, cinematic wide establishing shot",
  "Dark Fantasy": "torchlit dramatic rim lighting, volumetric fog, deep shadow contrast, epic wide-angle composition, ominous atmosphere, dark earth-tone palette with dramatic highlights, slow ominous camera push-in",
  "Chibi": "exaggerated super-deformed proportions, bouncy springy motion, bright cheerful pastel colors, sparkle and star effects, over-the-top kawaii reactions, playful energetic movement, tight fun framing",
};

const DEFAULT_PIXVERSE_CONTEXT = "cinematic camera movement, dramatic lighting, detailed environment, vibrant saturated colors, smooth fluid motion, high quality animation";

function buildVideoPrompt(prompt: string, style: string, isPixverse = false): string {
  if (isPixverse) {
    const ctx = PIXVERSE_STYLE_CONTEXT[style] || DEFAULT_PIXVERSE_CONTEXT;
    return `anime scene: ${prompt}, ${ctx}`;
  }
  const styleSuffix = VIDEO_STYLE_PROMPTS[style] || DEFAULT_VIDEO_SUFFIX;
  return `${prompt}, ${styleSuffix}`;
}

function buildImageBody(model: string, prompt: string, negativePrompt: string, aspectRatio: string) {
  if (model === "fal-ai/flux/schnell") {
    return {
      prompt,
      negative_prompt: negativePrompt || "low quality, blurry, distorted",
      image_size: RATIO_TO_IMAGE_SIZE[aspectRatio] || "square_hd",
      num_inference_steps: 4,
      num_images: 1,
    };
  }

  if (model === "fal-ai/bytedance/seedream/v3/text-to-image") {
    const safeRatio = SEEDREAM_SUPPORTED_RATIOS.includes(aspectRatio) ? aspectRatio : "1:1";
    return {
      prompt,
      aspect_ratio: safeRatio,
      guidance_scale: 2.5,
      num_images: 1,
    };
  }

  return { prompt, num_images: 1 };
}

const VIDEO_NEGATIVE_PROMPT = "3D CGI, 3D render, photorealistic, live action, real footage, low quality, blurry, distorted, watermark";

function buildVideoBody(model: string, prompt: string, aspectRatio: string) {
  if (model === "fal-ai/pixverse/v4.5/text-to-video") {
    return {
      prompt,
      aspect_ratio: clampRatio(aspectRatio, PIXVERSE_SUPPORTED_RATIOS),
      negative_prompt: "3D CGI render, photorealistic, live action, low quality, blurry, watermark, bad anatomy, deformed, text overlay",
      duration: "5",
      resolution: "1080p",
      style: "anime",
    };
  }

  if (model === "fal-ai/minimax/hailuo-02/standard/text-to-video") {
    return {
      prompt,
      prompt_optimizer: false,
      duration: "6",
    };
  }

  if (model === "fal-ai/kling-video/v2.1/master/text-to-video") {
    return {
      prompt,
      aspect_ratio: clampRatio(aspectRatio, KLING_SUPPORTED_RATIOS),
      duration: "5",
      negative_prompt: VIDEO_NEGATIVE_PROMPT,
      cfg_scale: 0.5,
    };
  }

  return { prompt };
}

function extractVideoUrl(data: any): string | null {
  return data?.video?.url || null;
}

async function handleImageGenerate(
  falKey: string,
  prompt: string,
  negativePrompt: string,
  style: string,
  aspectRatio: string,
  model: string
) {
  if (!ALLOWED_IMAGE_MODELS.includes(model)) {
    return jsonResponse({ error: `Invalid image model: ${model}` }, 400);
  }

  const enhancedPrompt = `${prompt}, ${IMAGE_PROMPT_SUFFIX}, ${style} style`;
  const body = buildImageBody(model, enhancedPrompt, negativePrompt, aspectRatio);

  const falResponse = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const falText = await falResponse.text();

  if (!falResponse.ok) {
    return jsonResponse(
      { error: `Fal.ai error (${falResponse.status}): ${falText.substring(0, 500)}` },
      falResponse.status >= 400 && falResponse.status < 600 ? falResponse.status : 502
    );
  }

  let falData: any;
  try {
    falData = JSON.parse(falText);
  } catch {
    return jsonResponse({ error: `Invalid response from fal.ai: ${falText.substring(0, 200)}` }, 502);
  }

  const resultUrl = falData?.images?.[0]?.url;
  if (!resultUrl) {
    return jsonResponse({ error: "No image URL in fal.ai response" }, 502);
  }

  return jsonResponse({ url: resultUrl });
}

async function handleVideoSubmit(
  falKey: string,
  prompt: string,
  style: string,
  aspectRatio: string,
  model: string
) {
  if (!ALLOWED_VIDEO_MODELS.includes(model)) {
    return jsonResponse({ error: `Invalid video model: ${model}` }, 400);
  }

  const isPixverse = model === "fal-ai/pixverse/v4.5/text-to-video";
  const enhancedPrompt = buildVideoPrompt(prompt, style, isPixverse);
  const body = buildVideoBody(model, enhancedPrompt, aspectRatio);

  const falResponse = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const falText = await falResponse.text();

  if (!falResponse.ok) {
    return jsonResponse(
      { error: `Fal.ai error (${falResponse.status}): ${falText.substring(0, 500)}` },
      falResponse.status >= 400 && falResponse.status < 600 ? falResponse.status : 502
    );
  }

  let falData: any;
  try {
    falData = JSON.parse(falText);
  } catch {
    return jsonResponse({ error: `Invalid response from fal.ai: ${falText.substring(0, 200)}` }, 502);
  }

  const requestId = falData?.request_id;
  if (!requestId) {
    return jsonResponse({ error: "No request_id from fal.ai queue", details: falData }, 502);
  }

  return jsonResponse({
    request_id: requestId,
    status: "queued",
    status_url: falData.status_url || `https://queue.fal.run/${model}/requests/${requestId}/status`,
    response_url: falData.response_url || `https://queue.fal.run/${model}/requests/${requestId}`,
  });
}

async function handleVideoStatus(falKey: string, statusUrl: string, responseUrl: string) {
  const statusResponse = await fetch(statusUrl, {
    method: "GET",
    headers: { Authorization: `Key ${falKey}` },
  });

  const statusText = await statusResponse.text();

  if (!statusResponse.ok) {
    return jsonResponse(
      { error: `Fal.ai status error (${statusResponse.status}): ${statusText.substring(0, 500)}` },
      statusResponse.status >= 400 && statusResponse.status < 600 ? statusResponse.status : 502
    );
  }

  let statusData: any;
  try {
    statusData = JSON.parse(statusText);
  } catch {
    return jsonResponse({ error: `Invalid status response: ${statusText.substring(0, 200)}` }, 502);
  }

  const queueStatus = statusData?.status;

  if (queueStatus === "COMPLETED") {
    const resultResponse = await fetch(responseUrl, {
      method: "GET",
      headers: { Authorization: `Key ${falKey}` },
    });

    const resultText = await resultResponse.text();

    if (!resultResponse.ok) {
      return jsonResponse(
        { error: `Fal.ai result error: ${resultText.substring(0, 500)}` },
        resultResponse.status >= 400 && resultResponse.status < 600 ? resultResponse.status : 502
      );
    }

    let resultData: any;
    try {
      resultData = JSON.parse(resultText);
    } catch {
      return jsonResponse({ error: `Invalid result response: ${resultText.substring(0, 200)}` }, 502);
    }

    const videoUrl = extractVideoUrl(resultData);
    if (!videoUrl) {
      return jsonResponse({ error: "No video URL in result", details: resultData }, 502);
    }

    return jsonResponse({ status: "completed", url: videoUrl });
  }

  if (queueStatus === "FAILED" || queueStatus === "CANCELLED") {
    return jsonResponse(
      { status: "failed", error: statusData?.error || "Video generation failed on fal.ai" },
      200
    );
  }

  return jsonResponse({
    status: "processing",
    queue_position: statusData?.queue_position,
    fal_status: queueStatus,
  });
}

async function handleSolPrice() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
  );
  if (!res.ok) {
    return jsonResponse({ error: "Failed to fetch SOL price" }, 502);
  }
  const data = await res.json();
  const price = data?.solana?.usd;
  if (!price) {
    return jsonResponse({ error: "SOL price not found in response" }, 502);
  }
  return jsonResponse({ price });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body;

    if (type === "sol_price") {
      return await handleSolPrice();
    }

    const falKey = await getFalKey();
    if (!falKey) {
      return jsonResponse({ error: "FAL_API_KEY not configured on server" }, 500);
    }

    if (type === "video_status") {
      const { status_url, response_url } = body;
      if (!status_url || !response_url) {
        return jsonResponse({ error: "status_url and response_url are required" }, 400);
      }
      return await handleVideoStatus(falKey, status_url, response_url);
    }

    const { prompt, negativePrompt, style, aspectRatio, model } = body;

    if (!prompt || !style) {
      return jsonResponse({ error: "prompt and style are required" }, 400);
    }

    if (type === "video") {
      return await handleVideoSubmit(falKey, prompt, style, aspectRatio || "16:9", model || ALLOWED_VIDEO_MODELS[0]);
    }

    return await handleImageGenerate(falKey, prompt, negativePrompt || "", style, aspectRatio || "1:1", model || ALLOWED_IMAGE_MODELS[0]);
  } catch (error: any) {
    return jsonResponse({ error: error.message || "Internal server error" }, 500);
  }
});
