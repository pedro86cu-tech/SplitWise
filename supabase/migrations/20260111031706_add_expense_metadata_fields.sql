/*
  # Add expense metadata fields

  1. Changes
    - Add `receipt_image_url` column to `expenses` table to store scanned receipt images
    - Add `category` column to categorize expenses (food, transport, entertainment, etc.)
    - Add `expense_date` column to track when the expense occurred
    - Add `location` column to store where the expense was made

  2. Notes
    - All fields are optional to maintain backward compatibility
    - These fields will help with filtering and organization
*/

-- Add receipt image URL field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'receipt_image_url'
  ) THEN
    ALTER TABLE expenses ADD COLUMN receipt_image_url text;
  END IF;
END $$;

-- Add category field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'category'
  ) THEN
    ALTER TABLE expenses ADD COLUMN category text DEFAULT 'general';
  END IF;
END $$;

-- Add expense date field (different from created_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'expense_date'
  ) THEN
    ALTER TABLE expenses ADD COLUMN expense_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Add location field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'location'
  ) THEN
    ALTER TABLE expenses ADD COLUMN location text;
  END IF;
END $$;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_team_date ON expenses(team_id, expense_date DESC);
