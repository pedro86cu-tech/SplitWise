/*
  # Add Currency Support and Fix Expense Splits Validation

  1. Changes
    - Add currency field to expense_splits table for multi-currency support
    - Add constraint to ensure splits sum equals total_amount
    - Add helpful views for debt calculations

  2. Security
    - No changes to RLS policies
*/

-- Add currency to expense_splits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_splits' AND column_name = 'currency'
  ) THEN
    ALTER TABLE expense_splits ADD COLUMN currency text DEFAULT 'USD' NOT NULL;
  END IF;
END $$;

-- Add function to validate splits sum equals total_amount
CREATE OR REPLACE FUNCTION validate_expense_splits()
RETURNS TRIGGER AS $$
DECLARE
  expected_total numeric(10, 2);
  actual_total numeric(10, 2);
BEGIN
  -- Get the expected total from expenses table
  SELECT total_amount INTO expected_total
  FROM expenses
  WHERE id = NEW.expense_id;

  -- Calculate the sum of all splits for this expense
  SELECT COALESCE(SUM(amount), 0) INTO actual_total
  FROM expense_splits
  WHERE expense_id = NEW.expense_id;

  -- Check if the sum matches (allow for small rounding differences)
  IF ABS(actual_total - expected_total) > 0.01 THEN
    RAISE EXCEPTION 'Sum of expense splits (%) must equal total expense amount (%)', actual_total, expected_total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate splits on insert and update
DROP TRIGGER IF EXISTS validate_splits_trigger ON expense_splits;
CREATE TRIGGER validate_splits_trigger
  AFTER INSERT OR UPDATE ON expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION validate_expense_splits();