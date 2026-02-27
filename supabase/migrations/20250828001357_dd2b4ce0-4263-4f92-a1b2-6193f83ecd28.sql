-- Create storage bucket for contract attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('contract-attachments', 'contract-attachments', false);

-- Create policies for contract attachments storage
CREATE POLICY "Users can upload contract attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'contract-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view contract attachments" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'contract-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update contract attachments" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'contract-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete contract attachments" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'contract-attachments' AND auth.uid() IS NOT NULL);