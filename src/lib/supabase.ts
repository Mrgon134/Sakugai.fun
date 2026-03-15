import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ldqrjmbznmrdajlaloch.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkcXJqbWJ6bm1yZGFqbGFsb2NoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mjc0ODksImV4cCI6MjA4OTAwMzQ4OX0.1k_km2JGwKBqfarhSZO6hzZKtUQMh0RvvAHf8Hup8Kg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Generation {
  id: string;
  wallet_address: string;
  prompt: string;
  negative_prompt: string;
  style: string;
  type: 'image' | 'video';
  result_url: string;
  cost: number;
  aspect_ratio: string;
  created_at: string;
}
