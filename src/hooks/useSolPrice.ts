import { useState, useEffect, useRef } from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

const EDGE_URL = `${SUPABASE_URL}/functions/v1/generate`;
const EDGE_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};
const REFRESH_INTERVAL = 60_000;

export function useSolPrice() {
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(0);
  const lastKnownRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchPrice = async () => {
      try {
        const res = await fetch(EDGE_URL, {
          method: 'POST',
          headers: EDGE_HEADERS,
          body: JSON.stringify({ type: 'sol_price' }),
        });
        const data = await res.json();
        const price = data?.price;
        if (price && mounted) {
          setSolPrice(price);
          lastKnownRef.current = price;
          setUpdatedAt(Date.now());
        }
      } catch {
        if (lastKnownRef.current && mounted) {
          setSolPrice(lastKnownRef.current);
        }
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, REFRESH_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const usdToSol = (usd: number, markup: number = 3.5): number | null => {
    if (!solPrice) return null;
    return (usd * markup) / solPrice;
  };

  const secondsAgo = updatedAt ? Math.floor((Date.now() - updatedAt) / 1000) : null;

  return { solPrice, updatedAt, secondsAgo, usdToSol };
}
