/*
  # Create app_config table

  1. New Tables
    - `app_config`
      - `key` (text, primary key) - config key name
      - `value` (text, not null) - config value
      - `created_at` (timestamptz) - when the config was created
      - `updated_at` (timestamptz) - when the config was last updated

  2. Security
    - Enable RLS on `app_config` table
    - Add policy for service role only (no public access)
*/

CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can read config"
  ON app_config
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Only service role can insert config"
  ON app_config
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only service role can update config"
  ON app_config
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);
