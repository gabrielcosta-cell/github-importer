-- Criar tabela para solicitações de cancelamento
CREATE TABLE public.cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsavel TEXT NOT NULL,
  email TEXT NOT NULL,
  empresa TEXT NOT NULL,
  motivo TEXT NOT NULL,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  card_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT
);

-- Habilitar RLS
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Política para visualização (apenas usuários autenticados)
CREATE POLICY "Users can view cancellation requests"
ON public.cancellation_requests
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Política para criação (qualquer pessoa pode criar)
CREATE POLICY "Anyone can create cancellation requests"
ON public.cancellation_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política para atualização (apenas usuários autenticados)
CREATE POLICY "Users can update cancellation requests"
ON public.cancellation_requests
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Política para exclusão (apenas admins)
CREATE POLICY "Admins can delete cancellation requests"
ON public.cancellation_requests
FOR DELETE
TO authenticated
USING (get_current_user_role() = 'admin');

-- Índices para melhor performance
CREATE INDEX idx_cancellation_requests_email ON public.cancellation_requests(email);
CREATE INDEX idx_cancellation_requests_card_id ON public.cancellation_requests(card_id);
CREATE INDEX idx_cancellation_requests_status ON public.cancellation_requests(status);
CREATE INDEX idx_cancellation_requests_created_at ON public.cancellation_requests(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cancellation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cancellation_requests_updated_at
BEFORE UPDATE ON public.cancellation_requests
FOR EACH ROW
EXECUTE FUNCTION update_cancellation_requests_updated_at();