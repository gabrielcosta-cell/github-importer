-- Criar bucket para anexos de cards CRM
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-card-attachments', 'crm-card-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket
-- Usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crm-card-attachments' AND auth.uid() IS NOT NULL);

-- Usuários autenticados podem ver seus anexos
CREATE POLICY "Users can view their attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'crm-card-attachments' AND auth.uid() IS NOT NULL);

-- Usuários podem atualizar seus anexos
CREATE POLICY "Users can update their attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'crm-card-attachments' AND auth.uid() IS NOT NULL);

-- Usuários podem deletar seus anexos ou admins podem deletar qualquer um
CREATE POLICY "Users can delete their attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'crm-card-attachments' AND 
  (auth.uid() IS NOT NULL OR get_current_user_role() = 'admin')
);

-- Criar tabela para metadados dos anexos
CREATE TABLE IF NOT EXISTS public.crm_card_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.crm_card_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela de metadados
CREATE POLICY "Users can view attachments metadata"
ON public.crm_card_attachments FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create attachments metadata"
ON public.crm_card_attachments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

CREATE POLICY "Users can delete attachments metadata"
ON public.crm_card_attachments FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid() OR get_current_user_role() = 'admin');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_crm_card_attachments_updated_at
BEFORE UPDATE ON public.crm_card_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_crm_card_attachments_card_id ON public.crm_card_attachments(card_id);
CREATE INDEX IF NOT EXISTS idx_crm_card_attachments_uploaded_by ON public.crm_card_attachments(uploaded_by);