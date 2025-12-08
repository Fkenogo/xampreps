-- Create storage bucket for question images
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Admin can upload question images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'question-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow public read access for question images
CREATE POLICY "Public can view question images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

-- Allow admin to update question images
CREATE POLICY "Admin can update question images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'question-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow admin to delete question images
CREATE POLICY "Admin can delete question images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'question-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);