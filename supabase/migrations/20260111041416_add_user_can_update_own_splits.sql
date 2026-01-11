/*
  # Allow users to update their own expense splits

  1. Changes
    - Add policy to allow users to update their own splits (for payment proofs and settling)
    - This allows debtors to mark their own debts as paid and upload payment proofs
  
  2. Security
    - Users can only update splits where they are the debtor (user_id = auth.uid())
    - This is safe as users should be able to settle their own debts
*/

-- Add policy for users to update their own splits
CREATE POLICY "Users can update their own splits"
  ON expense_splits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
