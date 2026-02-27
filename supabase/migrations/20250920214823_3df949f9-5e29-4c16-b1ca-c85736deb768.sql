-- Criar bucket para documentos de briefing
INSERT INTO storage.buckets (id, name, public)
VALUES ('briefing-documents', 'briefing-documents', false);

-- Criar políticas de acesso para o bucket
CREATE POLICY "Admins can upload briefing documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'briefing-documents' AND auth.uid() IN (
  SELECT user_id FROM public.profiles WHERE role = 'admin'
));

CREATE POLICY "Admins can view briefing documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'briefing-documents' AND auth.uid() IN (
  SELECT user_id FROM public.profiles WHERE role = 'admin'
));

CREATE POLICY "Admins can update briefing documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'briefing-documents' AND auth.uid() IN (
  SELECT user_id FROM public.profiles WHERE role = 'admin'
));

CREATE POLICY "Admins can delete briefing documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'briefing-documents' AND auth.uid() IN (
  SELECT user_id FROM public.profiles WHERE role = 'admin'
));

-- Adicionar campos para documentos na tabela copy_forms
ALTER TABLE copy_forms 
ADD COLUMN document_files text[],
ADD COLUMN original_briefing_id uuid REFERENCES copy_forms(id);