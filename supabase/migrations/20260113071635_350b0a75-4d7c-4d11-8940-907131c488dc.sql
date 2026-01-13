-- Create storage bucket for explanation PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('explanation-pdfs', 'explanation-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "Public can view explanation PDFs"
ON storage.objects
FOR SELECT
USING (bucket_id = 'explanation-pdfs');

-- Create policy for admin uploads
CREATE POLICY "Admins can upload explanation PDFs"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'explanation-pdfs' AND has_role(auth.uid(), 'admin'::app_role));

-- Create policy for admin updates
CREATE POLICY "Admins can update explanation PDFs"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'explanation-pdfs' AND has_role(auth.uid(), 'admin'::app_role));

-- Create policy for admin deletions
CREATE POLICY "Admins can delete explanation PDFs"
ON storage.objects
FOR DELETE
USING (bucket_id = 'explanation-pdfs' AND has_role(auth.uid(), 'admin'::app_role));