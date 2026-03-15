import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

export interface Subscription {
  id: string;
  email: string;
  plan: 'trial' | 'weekly' | 'monthly' | 'yearly';
  status: 'trialing' | 'active' | 'canceled' | 'past_due' | 'expired';
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  images_used: number;
  videos_used: number;
  images_limit: number;
  videos_limit: number;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  isActive: boolean;
  loading: boolean;
  email: string;
  setEmail: (email: string) => void;
  startTrial: (email: string) => Promise<void>;
  createCheckout: (plan: 'weekly' | 'monthly' | 'yearly') => Promise<string>;
  incrementUsage: (type: 'image' | 'video') => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
  canGenerate: (type: 'image' | 'video') => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const BASE_URL = `${SUPABASE_URL}/functions/v1`;
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

const EMAIL_KEY = 'sakugai_sub_email';

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmailState] = useState<string>(() => localStorage.getItem(EMAIL_KEY) || '');

  const setEmail = useCallback((e: string) => {
    setEmailState(e);
    if (e) localStorage.setItem(EMAIL_KEY, e);
    else localStorage.removeItem(EMAIL_KEY);
  }, []);

  const fetchSubscription = useCallback(async (emailAddr: string) => {
    if (!emailAddr) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/stripe-checkout`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ action: 'get_subscription', email: emailAddr }),
      });
      const data = await res.json();
      setSubscription(data.subscription || null);
      setIsActive(data.is_active || false);
    } catch {
      setSubscription(null);
      setIsActive(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (email) fetchSubscription(email);
  }, [email, fetchSubscription]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success' && email) {
      setTimeout(() => fetchSubscription(email), 2000);
    }
  }, [email, fetchSubscription]);

  const refreshSubscription = useCallback(async () => {
    if (email) await fetchSubscription(email);
  }, [email, fetchSubscription]);

  const startTrial = useCallback(async (emailAddr: string) => {
    const res = await fetch(`${BASE_URL}/stripe-checkout`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ action: 'create_trial', email: emailAddr }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to start trial');
    setEmail(emailAddr);
    await fetchSubscription(emailAddr);
  }, [fetchSubscription, setEmail]);

  const createCheckout = useCallback(async (plan: 'weekly' | 'monthly' | 'yearly'): Promise<string> => {
    if (!email) throw new Error('Email required');
    const res = await fetch(`${BASE_URL}/stripe-checkout`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        action: 'create_checkout',
        email,
        plan,
        success_url: `${window.location.origin}?subscription=success`,
        cancel_url: `${window.location.origin}?subscription=cancel`,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Failed to create checkout');
    return data.url;
  }, [email]);

  const incrementUsage = useCallback(async (type: 'image' | 'video'): Promise<boolean> => {
    if (!email) return false;
    const res = await fetch(`${BASE_URL}/stripe-checkout`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ action: 'increment_usage', email, type }),
    });
    const data = await res.json();
    if (data.limit_reached) return false;
    if (!res.ok) throw new Error(data.error || 'Failed to track usage');
    await fetchSubscription(email);
    return true;
  }, [email, fetchSubscription]);

  const canGenerate = useCallback((type: 'image' | 'video'): boolean => {
    if (!subscription || !isActive) return false;
    if (type === 'video') return subscription.videos_used < subscription.videos_limit;
    return subscription.images_used < subscription.images_limit;
  }, [subscription, isActive]);

  return (
    <SubscriptionContext.Provider value={{
      subscription, isActive, loading, email, setEmail,
      startTrial, createCheckout, incrementUsage, refreshSubscription, canGenerate,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
