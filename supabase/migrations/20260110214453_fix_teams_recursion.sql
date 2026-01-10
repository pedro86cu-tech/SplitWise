/*
  # Fix Infinite Recursion Between teams and team_members

  1. Changes
    - Create security function to check team membership without RLS
    - Drop and recreate teams SELECT policy using the security function
  
  2. Security Functions
    - is_team_member: Checks if a user is a member of a team (SECURITY DEFINER bypasses RLS)
  
  3. New Policies
    - Teams SELECT: Users can view teams they created OR are members of (using security function)
*/

-- Create function to check team membership without RLS recursion
CREATE OR REPLACE FUNCTION is_team_member(team_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_id_param
    AND user_id = user_id_param
  );
$$;

-- Drop existing teams SELECT policy
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;

-- Create new teams SELECT policy using security function
CREATE POLICY "Users can view teams they are part of"
  ON teams FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR
    is_team_member(id, auth.uid())
  );
