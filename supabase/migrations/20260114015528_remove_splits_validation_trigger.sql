/*
  # Remove Splits Validation Trigger

  The trigger was causing issues when inserting splits one by one.
  We'll handle validation at the application level instead.

  1. Changes
    - Drop the validation trigger
    - Keep the currency field in expense_splits
*/

-- Drop the trigger
DROP TRIGGER IF EXISTS validate_splits_trigger ON expense_splits;

-- Drop the validation function
DROP FUNCTION IF EXISTS validate_expense_splits();