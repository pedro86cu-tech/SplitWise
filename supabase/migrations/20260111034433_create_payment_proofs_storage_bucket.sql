/*
  # Create Storage Bucket for Payment Proofs

  1. Storage Setup
    - Create a new storage bucket called `payment-proofs` for storing payment proof images
    - Set the bucket to be public so that URLs can be accessed
    - Maximum file size: 5MB
    - Allowed MIME types: image/jpeg, image/png, image/webp

  2. Security
    - Enable RLS on the storage bucket
    - Allow authenticated users to upload their own payment proofs
    - Allow all users to view payment proofs (since they need to be shared with team members)
*/

-- Create the storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload payment proofs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users can upload payment proofs'
  ) THEN
    CREATE POLICY "Authenticated users can upload payment proofs"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'payment-proofs');
  END IF;
END $$;

-- Policy: Allow authenticated users to view payment proofs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users can view payment proofs'
  ) THEN
    CREATE POLICY "Authenticated users can view payment proofs"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'payment-proofs');
  END IF;
END $$;

-- Policy: Allow users to update their own uploaded proofs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can update their own payment proofs'
  ) THEN
    CREATE POLICY "Users can update their own payment proofs"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'payment-proofs' AND auth.uid()::text = owner::text)
      WITH CHECK (bucket_id = 'payment-proofs');
  END IF;
END $$;

-- Policy: Allow users to delete their own uploaded proofs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users can delete their own payment proofs'
  ) THEN
    CREATE POLICY "Users can delete their own payment proofs"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'payment-proofs' AND auth.uid()::text = owner::text);
  END IF;
END $$;