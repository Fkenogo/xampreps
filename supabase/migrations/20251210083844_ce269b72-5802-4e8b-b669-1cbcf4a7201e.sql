-- Create storage policies for question-images bucket if not exists
DO $$
BEGIN
  -- Policy for admins to upload images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can upload question images'
  ) THEN
    CREATE POLICY "Admins can upload question images"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'question-images' 
      AND has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;

  -- Policy for admins to update images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update question images'
  ) THEN
    CREATE POLICY "Admins can update question images"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'question-images' 
      AND has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;

  -- Policy for admins to delete images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete question images'
  ) THEN
    CREATE POLICY "Admins can delete question images"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'question-images' 
      AND has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;

  -- Policy for anyone to view question images (public bucket)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view question images'
  ) THEN
    CREATE POLICY "Anyone can view question images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'question-images');
  END IF;
END $$;