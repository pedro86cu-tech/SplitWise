/*
  # Add settlement tracking fields to expense_splits

  1. Changes
    - Add `settled_by` column to track who marked the split as settled
    - Add `settled_at` column to track when it was settled
    - Add index for querying settled splits

  2. Purpose
    - Better tracking of who confirmed payments
    - Audit trail for settlements
    - Fixes issue where payments weren't being marked as settled
*/

-- Add settled_by column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_splits' AND column_name = 'settled_by'
  ) THEN
    ALTER TABLE expense_splits ADD COLUMN settled_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add settled_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_splits' AND column_name = 'settled_at'
  ) THEN
    ALTER TABLE expense_splits ADD COLUMN settled_at timestamptz;
  END IF;
END $$;

-- Create index for settled_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_expense_splits_settled_by'
  ) THEN
    CREATE INDEX idx_expense_splits_settled_by ON expense_splits(settled_by);
  END IF;
END $$;