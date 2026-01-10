/*
  # Fix Infinite Recursion in team_members Policies

  1. Changes
    - Drop existing team_members policies that cause recursion
    - Create new simplified policies without circular references
  
  2. New Policies
    - SELECT: Users can view memberships where they are the user OR the team creator
    - INSERT: Team creators can add members
    - DELETE: Team creators can remove members
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Team members can view team membership" ON team_members;
DROP POLICY IF EXISTS "Team creators can add members" ON team_members;
DROP POLICY IF EXISTS "Team creators can remove members" ON team_members;

-- Create new policies without recursion
-- Allow users to view memberships where they are involved (either as member or as team creator)
CREATE POLICY "Users can view memberships they are involved in"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.created_by = auth.uid()
    )
  );

-- Allow team creators to add members (no recursion, direct check on teams table)
CREATE POLICY "Team creators can add members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_id
      AND teams.created_by = auth.uid()
    )
  );

-- Allow team creators to remove members
CREATE POLICY "Team creators can remove members"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_id
      AND teams.created_by = auth.uid()
    )
  );
