-- Criar bucket para documentos de contratos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contract-documents', 'contract-documents', false);

-- Criar políticas para o bucket de documentos
CREATE POLICY "Users can view contract documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload contract documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update contract documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete contract documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'contract-documents' AND auth.uid() IS NOT NULL);