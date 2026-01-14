/*
  # Fix Expense Creation Policy for Team Members
  
  ## Problem
  The current INSERT policy on expenses requires `auth.uid() = paid_by`, which prevents 
  team members from creating expenses on behalf of other team members (e.g., when processing
  credit card statements with multiple cardholders).
  
  ## Changes
  1. Drop the old restrictive INSERT policy
  2. Create a new policy that allows any team member to create expenses for any team member,
     as long as both the creator and the payer are members of the team
  
  ## Security
  - The creator must be a member of the team (checked via team_members)
  - The person who paid (paid_by) must also be a member of the team (checked via team_members)
  - This enables processing of credit card statements where one user creates expenses for multiple cardholders
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Team members can create expenses" ON expenses;

-- Create new policy that allows team members to create expenses for other team members
CREATE POLICY "Team members can create expenses for team"
  ON expenses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- The creator must be a member of the team
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = expenses.team_id
      AND team_members.user_id = auth.uid()
    )
    AND
    -- The person who paid must also be a member of the team
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = expenses.team_id
      AND team_members.user_id = expenses.paid_by
    )
  );
