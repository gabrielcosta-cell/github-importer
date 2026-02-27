-- Create storage bucket for client logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public to view logos (for blog display)
CREATE POLICY "Public can view client logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'client-logos');

-- Authenticated users can upload logos
CREATE POLICY "Authenticated users can upload client logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'client-logos' AND auth.uid() IS NOT NULL);

-- Authenticated users can update their logos
CREATE POLICY "Authenticated users can update client logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'client-logos' AND auth.uid() IS NOT NULL);

-- Authenticated users can delete logos
CREATE POLICY "Authenticated users can delete client logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'client-logos' AND auth.uid() IS NOT NULL);