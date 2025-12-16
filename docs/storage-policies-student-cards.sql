-- Storage Policies for student-cards bucket
-- Run this in your Supabase SQL Editor
-- Note: You need to create the 'student-cards' bucket in Supabase Storage first

-- Policy: Allow authenticated users to upload their own student cards
CREATE POLICY "Authenticated users can upload student cards"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-cards' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy: Allow authenticated users to read their own student cards
CREATE POLICY "Users can read their own student cards"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'student-cards' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Policy: Allow admins to read all student cards
CREATE POLICY "Admins can read all student cards"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-cards' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Allow authenticated users to delete their own student cards
CREATE POLICY "Users can delete their own student cards"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'student-cards' AND (storage.foldername(name))[1] = auth.uid()::text);

