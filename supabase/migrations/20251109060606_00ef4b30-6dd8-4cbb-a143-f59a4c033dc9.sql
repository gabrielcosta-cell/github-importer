-- Criar tabela para histórico mensal de churn
CREATE TABLE IF NOT EXISTS public.churn_monthly_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  squad TEXT NOT NULL,
  
  -- Contadores de churn
  n_churn_total INTEGER NOT NULL DEFAULT 0,
  n_churn_operacional INTEGER NOT NULL DEFAULT 0,
  n_churn_comercial INTEGER NOT NULL DEFAULT 0,
  
  -- MRR perdido
  mrr_perdido_total NUMERIC NOT NULL DEFAULT 0,
  mrr_perdido_operacional NUMERIC NOT NULL DEFAULT 0,
  mrr_perdido_comercial NUMERIC NOT NULL DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint para evitar duplicatas de squad+mês+ano
  UNIQUE(month, year, squad)
);

-- Índices para melhor performance
CREATE INDEX idx_churn_history_month_year ON public.churn_monthly_history(year, month);
CREATE INDEX idx_churn_history_squad ON public.churn_monthly_history(squad);

-- Enable RLS
ALTER TABLE public.churn_monthly_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem visualizar histórico de churn"
  ON public.churn_monthly_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem inserir histórico de churn"
  ON public.churn_monthly_history
  FOR INSERT
  WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Apenas admins podem atualizar histórico de churn"
  ON public.churn_monthly_history
  FOR UPDATE
  USING (get_current_user_role() = 'admin');

CREATE POLICY "Apenas admins podem deletar histórico de churn"
  ON public.churn_monthly_history
  FOR DELETE
  USING (get_current_user_role() = 'admin');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_churn_monthly_history_updated_at
  BEFORE UPDATE ON public.churn_monthly_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para calcular e salvar churn mensal
CREATE OR REPLACE FUNCTION public.calculate_monthly_churn(target_month INTEGER, target_year INTEGER)
RETURNS TABLE(
  squad TEXT,
  n_churn_total BIGINT,
  n_churn_operacional BIGINT,
  n_churn_comercial BIGINT,
  mrr_perdido_total NUMERIC,
  mrr_perdido_operacional NUMERIC,
  mrr_perdido_comercial NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(c.squad, 'Athena') as squad,
    COUNT(*) as n_churn_total,
    COUNT(*) FILTER (WHERE c.motivo_perda IS NOT NULL AND c.motivo_perda != 'Churn Comercial') as n_churn_operacional,
    COUNT(*) FILTER (WHERE c.motivo_perda = 'Churn Comercial') as n_churn_comercial,
    COALESCE(SUM(c.monthly_revenue), 0) as mrr_perdido_total,
    COALESCE(SUM(c.monthly_revenue) FILTER (WHERE c.motivo_perda IS NOT NULL AND c.motivo_perda != 'Churn Comercial'), 0) as mrr_perdido_operacional,
    COALESCE(SUM(c.monthly_revenue) FILTER (WHERE c.motivo_perda = 'Churn Comercial'), 0) as mrr_perdido_comercial
  FROM public.crm_cards c
  WHERE c.churn = true
    AND EXTRACT(MONTH FROM c.data_perda) = target_month
    AND EXTRACT(YEAR FROM c.data_perda) = target_year
  GROUP BY COALESCE(c.squad, 'Athena');
END;
$$;

-- Função para atualizar/inserir histórico mensal de um mês específico
CREATE OR REPLACE FUNCTION public.update_monthly_churn_history(target_month INTEGER, target_year INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  churn_record RECORD;
BEGIN
  -- Deletar registros existentes do mês
  DELETE FROM public.churn_monthly_history
  WHERE month = target_month AND year = target_year;
  
  -- Inserir novos registros calculados
  FOR churn_record IN 
    SELECT * FROM public.calculate_monthly_churn(target_month, target_year)
  LOOP
    INSERT INTO public.churn_monthly_history (
      month, year, squad,
      n_churn_total, n_churn_operacional, n_churn_comercial,
      mrr_perdido_total, mrr_perdido_operacional, mrr_perdido_comercial
    ) VALUES (
      target_month, target_year, churn_record.squad,
      churn_record.n_churn_total, churn_record.n_churn_operacional, churn_record.n_churn_comercial,
      churn_record.mrr_perdido_total, churn_record.mrr_perdido_operacional, churn_record.mrr_perdido_comercial
    );
  END LOOP;
END;
$$;