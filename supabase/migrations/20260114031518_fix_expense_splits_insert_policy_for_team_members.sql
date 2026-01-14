/*
  # Fix Expense Splits Creation Policy for Team Members
  
  ## Problem
  The current INSERT policy on expense_splits requires that the user creating the split
  is the one who paid the expense (`expenses.paid_by = auth.uid()`). This prevents team 
  members from creating splits when processing expenses on behalf of other team members.
  
  ## Changes
  1. Drop the old restrictive INSERT policy
  2. Create a new policy that allows any team member to create expense splits for expenses
     in their team
  
  ## Security
  - The creator must be a member of the team that the expense belongs to
  - This enables processing of credit card statements where one user creates expenses 
    and splits for multiple team members
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Expense creators can create splits" ON expense_splits;

-- Create new policy that allows team members to create splits for team expenses
CREATE POLICY "Team members can create splits for team expenses"
  ON expense_splits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- The creator must be a member of the team that the expense belongs to
    EXISTS (
      SELECT 1 
      FROM expenses e
      JOIN team_members tm ON tm.team_id = e.team_id
      WHERE e.id = expense_splits.expense_id
      AND tm.user_id = auth.uid()
    )
  );
