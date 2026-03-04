-- Migration: Criar tabela csm_project_snapshots para snapshot mensal dos projetos
-- Executar no Supabase SQL Editor

CREATE TABLE csm_project_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid REFERENCES csm_cards(id) ON DELETE CASCADE NOT NULL,
  snapshot_month integer NOT NULL CHECK (snapshot_month BETWEEN 1 AND 12),
  snapshot_year integer NOT NULL,
  status text DEFAULT 'ativo',
  company_name text,
  display_id integer,
  squad text,
  plano text,
  fase_projeto text,
  monthly_revenue numeric DEFAULT 0,
  servico_contratado text,
  data_contrato text,
  data_inicio text,
  tempo_contrato text,
  valor_contrato numeric DEFAULT 0,
  niche text,
  existe_comissao boolean DEFAULT false,
  observacao_comissao text,
  criativos_estaticos integer,
  criativos_video integer,
  lps integer,
  limite_investimento numeric,
  data_perda text,
  motivo_perda text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(card_id, snapshot_month, snapshot_year)
);

ALTER TABLE csm_project_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS: permitir leitura para usuários autenticados
CREATE POLICY "Authenticated users can read snapshots"
ON csm_project_snapshots FOR SELECT
TO authenticated
USING (true);

-- RLS: permitir inserção para usuários autenticados
CREATE POLICY "Authenticated users can insert snapshots"
ON csm_project_snapshots FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS: permitir atualização para usuários autenticados
CREATE POLICY "Authenticated users can update snapshots"
ON csm_project_snapshots FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
