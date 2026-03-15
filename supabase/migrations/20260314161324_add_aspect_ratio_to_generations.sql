/*
  # Add aspect_ratio column to generations table

  1. Modified Tables
    - `generations`
      - Added `aspect_ratio` (text, default '1:1') - The aspect ratio used for generation

  2. Important Notes
    - Existing rows will default to '1:1'
    - No destructive changes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'generations' AND column_name = 'aspect_ratio'
  ) THEN
    ALTER TABLE generations ADD COLUMN aspect_ratio text DEFAULT '1:1';
  END IF;
END $$;
