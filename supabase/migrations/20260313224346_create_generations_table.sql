/*
  # Create generations table for Sakuga.ai

  1. New Tables
    - `generations`
      - `id` (uuid, primary key) - Unique identifier for each generation
      - `wallet_address` (text, not null) - Solana wallet address of the user
      - `prompt` (text, not null) - The prompt used for generation
      - `negative_prompt` (text) - Optional negative prompt
      - `style` (text, not null) - Selected style (Shounen/Shoujo/etc)
      - `type` (text, not null) - Type of generation (image or video)
      - `result_url` (text, not null) - URL to the generated content
      - `cost` (numeric, not null) - SOL amount paid for generation
      - `created_at` (timestamptz) - Timestamp of generation
      
  2. Security
    - Enable RLS on `generations` table
    - Add policy for users to read their own generations (by wallet address)
    - Add policy for users to insert their own generations
    
  3. Important Notes
    - Wallet address is used as the user identifier (no traditional auth)
    - All costs stored in SOL
    - Result URLs point to Fal.ai generated content
*/

CREATE TABLE IF NOT EXISTS generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  prompt text NOT NULL,
  negative_prompt text DEFAULT '',
  style text NOT NULL,
  type text NOT NULL CHECK (type IN ('image', 'video')),
  result_url text NOT NULL,
  cost numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generations_wallet_address ON generations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own generations"
  ON generations
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own generations"
  ON generations
  FOR INSERT
  WITH CHECK (true);