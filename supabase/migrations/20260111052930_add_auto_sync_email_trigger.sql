/*
  # Auto-sync email from auth.users to profiles

  1. Changes
    - Create function to sync email from auth.users to profiles
    - Create trigger to automatically update email when profile is inserted or updated

  2. Purpose
    - Ensures email field is always synchronized with auth.users
    - Enables user search by email for team invitations
*/

-- Create function to sync email from auth.users
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the email from auth.users for this profile
  NEW.email = (
    SELECT email
    FROM auth.users
    WHERE id = NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync email before insert or update
DROP TRIGGER IF EXISTS sync_profile_email_trigger ON profiles;
CREATE TRIGGER sync_profile_email_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();

-- Update existing profiles with their email from auth.users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT au.id, au.email
    FROM auth.users au
    JOIN profiles p ON p.id = au.id
    WHERE p.email IS NULL OR p.email = ''
  LOOP
    UPDATE profiles
    SET email = user_record.email
    WHERE id = user_record.id;
  END LOOP;
END $$;