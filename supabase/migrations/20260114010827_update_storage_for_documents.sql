/*
  # Update Storage Bucket to Support Documents

  1. Changes
    - Update `payment-proofs` bucket to accept PDF and DOC files in addition to images
    - Increase file size limit to 10MB to accommodate larger document files
    - Add MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

  2. Security
    - Existing RLS policies remain unchanged
    - All authenticated users can still upload, view, update, and delete their own files
*/

-- Update the storage bucket to support documents
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'payment-proofs';
