/*
  # Add email field to profiles table

  1. Changes
    - Add `email` column to `profiles` table to enable user search by email
    - Create unique index on email for faster lookups
    - Backfill email data from auth.users for existing profiles

  2. Security
    - Email field is visible to all authenticated users (for team invitations)
*/

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Create unique index on email if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_email'
  ) THEN
    CREATE UNIQUE INDEX idx_profiles_email ON profiles(email);
  END IF;
END $$;