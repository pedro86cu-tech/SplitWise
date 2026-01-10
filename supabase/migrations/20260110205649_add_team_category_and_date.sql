/*
  # Add Category and Date to Teams

  1. Changes
    - Add `category` column to teams table (text)
    - Add `event_date` column to teams table (date, optional)
    - Create index for better performance
  
  2. Categories
    - Supports: restaurantes, viajes, casa, entretenimiento, otros
*/

-- Add category column to teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'category'
  ) THEN
    ALTER TABLE teams ADD COLUMN category text DEFAULT 'otros' NOT NULL;
  END IF;
END $$;

-- Add event_date column to teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'event_date'
  ) THEN
    ALTER TABLE teams ADD COLUMN event_date date;
  END IF;
END $$;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_teams_category ON teams(category);
