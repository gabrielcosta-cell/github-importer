-- Create storage bucket for approval job attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('approval-attachments', 'approval-attachments', true);

-- Create RLS policies for approval attachments
CREATE POLICY "Authenticated users can view approval attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'approval-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can upload approval attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'approval-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own approval attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'approval-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete approval attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'approval-attachments' AND
  auth.uid() IS NOT NULL
);