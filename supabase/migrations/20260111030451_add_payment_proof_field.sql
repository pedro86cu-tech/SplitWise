/*
  # Add payment proof field

  1. Changes
    - Add `payment_proof_url` column to `expense_splits` table
      - Stores the URL of the uploaded payment proof/receipt
      - Optional field (nullable)
    - Add `settled_by` column to track who marked the split as settled
    - Add `settled_at` timestamp to track when it was marked as settled

  2. Notes
    - This allows users to upload proof of payment when settling a debt
    - The creator of the expense can verify payments with proof
*/

-- Add payment proof URL field to expense_splits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_splits' AND column_name = 'payment_proof_url'
  ) THEN
    ALTER TABLE expense_splits ADD COLUMN payment_proof_url text;
  END IF;
END $$;

-- Add settled_by field to track who settled the debt
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_splits' AND column_name = 'settled_by'
  ) THEN
    ALTER TABLE expense_splits ADD COLUMN settled_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add settled_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_splits' AND column_name = 'settled_at'
  ) THEN
    ALTER TABLE expense_splits ADD COLUMN settled_at timestamptz;
  END IF;
END $$;

-- Create index for payment proof queries
CREATE INDEX IF NOT EXISTS idx_expense_splits_settled_by ON expense_splits(settled_by);
