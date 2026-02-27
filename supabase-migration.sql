-- ============================================================
-- MIGRAÇÃO COMPLETA: Criar estrutura na nova base Supabase
-- Executar no SQL Editor do Supabase (vkfvqhilrhmuaoopiucb)
-- ============================================================

-- =====================
-- 1. EXTENSÕES
-- =====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- 2. TABELAS
-- =====================

-- 2.1 custom_roles
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  display_name text,
  base_role text NOT NULL DEFAULT 'custom',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.2 profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  department text,
  role text NOT NULL DEFAULT 'sdr',
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  custom_role_id uuid REFERENCES public.custom_roles(id),
  selected_celebration_id uuid,
  project_scope text DEFAULT 'crm',
  preferred_module text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2.3 modules
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.4 role_module_permissions
CREATE TABLE IF NOT EXISTS public.role_module_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role_id, module_id)
);

-- 2.5 user_module_permissions
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- 2.6 squads
CREATE TABLE IF NOT EXISTS public.squads (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.7 crm_pipelines
CREATE TABLE IF NOT EXISTS public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.8 crm_stages
CREATE TABLE IF NOT EXISTS public.crm_stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.9 crm_cards (tabela principal do CRM)
CREATE TABLE IF NOT EXISTS public.crm_cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.crm_stages(id),
  title text NOT NULL,
  description text,
  value numeric NOT NULL DEFAULT 0,
  faturamento_display text,
  company_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  instagram text,
  monthly_revenue numeric,
  niche text,
  implementation_value numeric,
  squad text,
  plano text,
  categoria text,
  position integer NOT NULL DEFAULT 0,
  assigned_to uuid REFERENCES auth.users(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  -- UTM
  utm_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  -- Métricas de cliente
  receita_gerada_cliente numeric,
  investimento_midia numeric,
  teve_vendas text,
  teve_roas_maior_1 text,
  teve_roi_maior_1 text,
  nota_nps numeric,
  -- Perda
  motivo_perda text,
  comentarios_perda text,
  data_perda timestamptz,
  -- Status do cliente
  inadimplente boolean DEFAULT false,
  churn boolean DEFAULT false,
  upsell boolean DEFAULT false,
  em_pausa boolean DEFAULT false,
  situacao text,
  -- Endereço
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cnpj text,
  -- Datas
  data_inicio timestamptz,
  data_contrato timestamptz,
  -- Qualificação
  qualification_score numeric,
  qualification_data jsonb,
  qual_nicho_certo numeric,
  qual_porte_empresa numeric,
  qual_tomador_decisao numeric,
  qual_investe_marketing numeric,
  qual_urgencia_real numeric,
  qual_clareza_objetivos numeric,
  -- Briefing
  briefing_answers jsonb,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.10 crm_tags
CREATE TABLE IF NOT EXISTS public.crm_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.11 crm_card_tags
CREATE TABLE IF NOT EXISTS public.crm_card_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(card_id, tag_id)
);

-- 2.12 crm_card_emails
CREATE TABLE IF NOT EXISTS public.crm_card_emails (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.13 crm_activities
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  activity_type text NOT NULL DEFAULT 'note',
  title text,
  description text,
  created_by uuid REFERENCES auth.users(id),
  status text DEFAULT 'open',
  is_pinned boolean NOT NULL DEFAULT false,
  parent_activity_id uuid REFERENCES public.crm_activities(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.14 crm_activity_attachments
CREATE TABLE IF NOT EXISTS public.crm_activity_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id uuid NOT NULL REFERENCES public.crm_activities(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.15 crm_card_stage_history
CREATE TABLE IF NOT EXISTS public.crm_card_stage_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.crm_stages(id),
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  moved_by uuid REFERENCES auth.users(id),
  event_type text DEFAULT 'stage_change',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.16 crm_stage_tasks
CREATE TABLE IF NOT EXISTS public.crm_stage_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_id uuid NOT NULL REFERENCES public.crm_stages(id) ON DELETE CASCADE,
  pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  deadline_days integer,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.17 crm_card_tasks
CREATE TABLE IF NOT EXISTS public.crm_card_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  stage_task_id uuid REFERENCES public.crm_stage_tasks(id),
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.18 crm_loss_reasons
CREATE TABLE IF NOT EXISTS public.crm_loss_reasons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.19 crm_card_upsell_history
CREATE TABLE IF NOT EXISTS public.crm_card_upsell_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  upsell_type text,
  upsell_value numeric,
  upsell_month integer,
  upsell_year integer,
  payment_type text,
  installments integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.20 crm_card_variable_history
CREATE TABLE IF NOT EXISTS public.crm_card_variable_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  variable_type text,
  variable_value numeric,
  variable_month integer,
  variable_year integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.21 crm_card_performance_history
CREATE TABLE IF NOT EXISTS public.crm_card_performance_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  performance_type text,
  performance_value numeric,
  performance_month integer,
  performance_year integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.22 crm_special_lists (ganhos/perdidos)
CREATE TABLE IF NOT EXISTS public.crm_special_lists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_card_id uuid,
  card_title text,
  company_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  value numeric,
  monthly_revenue numeric,
  implementation_value numeric,
  niche text,
  description text,
  list_type text NOT NULL, -- 'ganho' ou 'perdido'
  pipeline_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.23 pipeline_automations
CREATE TABLE IF NOT EXISTS public.pipeline_automations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  trigger_event text NOT NULL, -- 'won' or 'lost'
  target_pipeline_id uuid NOT NULL REFERENCES public.crm_pipelines(id),
  is_active boolean NOT NULL DEFAULT true,
  archive_to text, -- pipeline ID or 'none'
  require_owner_transfer boolean NOT NULL DEFAULT false,
  target_owner_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.24 cancellation_requests
CREATE TABLE IF NOT EXISTS public.cancellation_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  responsavel text,
  email text,
  empresa text,
  motivo text,
  observacoes text,
  card_id uuid,
  status text NOT NULL DEFAULT 'pendente',
  stage text NOT NULL DEFAULT 'nova',
  squad text,
  final_result text,
  result_registered_at timestamptz,
  result_registered_by uuid REFERENCES auth.users(id),
  resolution_notes text,
  stage_notes jsonb,
  client_name text,
  client_email text,
  client_phone text,
  contract_name text,
  contract_value numeric,
  reason text,
  google_meet_link text,
  meetrox_link text,
  meeting_notes text,
  financial_analysis text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.25 cancellation_attachments
CREATE TABLE IF NOT EXISTS public.cancellation_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid NOT NULL REFERENCES public.cancellation_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  attachment_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.26 nps_responses
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa text NOT NULL,
  responsavel text NOT NULL,
  email text NOT NULL,
  cnpj text,
  recomendacao integer NOT NULL,
  sentimento_sem_dot text,
  observacoes text,
  card_id uuid,
  squad text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.27 csat_responses
CREATE TABLE IF NOT EXISTS public.csat_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa text NOT NULL,
  responsavel text NOT NULL,
  telefone text NOT NULL,
  email text,
  tipo_reuniao text,
  nota_atendimento integer NOT NULL,
  nota_conteudo integer NOT NULL,
  nota_performance integer NOT NULL,
  recomendacao integer NOT NULL,
  observacoes text,
  card_id uuid,
  squad text,
  nota_po integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.28 approval_jobs
CREATE TABLE IF NOT EXISTS public.approval_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  client_name text,
  responsible_user_id uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'rascunho',
  start_date date,
  end_date date,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  position integer NOT NULL DEFAULT 0,
  share_token text NOT NULL DEFAULT uuid_generate_v4()::text,
  workflow text DEFAULT 'aprovacao_publicacao',
  approval_deadline date,
  description text,
  attached_files jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.29 approval_client_feedback
CREATE TABLE IF NOT EXISTS public.approval_client_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id uuid NOT NULL REFERENCES public.approval_jobs(id) ON DELETE CASCADE,
  feedback_text text,
  feedback_status text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.30 contracts
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  squad text,
  acompanhamento text,
  plano text,
  etapa text,
  entrada date,
  servico text,
  assinatura date,
  duracao integer DEFAULT 0,
  tempo_casa integer DEFAULT 0,
  renovacao date,
  mensalidade numeric DEFAULT 0,
  valor_contrato numeric DEFAULT 0,
  anexo text,
  documento text,
  primeiro_pagamento date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.31 projetos_reservados
CREATE TABLE IF NOT EXISTS public.projetos_reservados (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa text NOT NULL,
  plano text,
  categoria text,
  mrr text,
  implementacao text,
  squad text,
  vaga_reservada_ate date,
  inadimplente boolean DEFAULT false,
  possivel_churn boolean DEFAULT false,
  churn_comercial boolean DEFAULT false,
  churn boolean DEFAULT false,
  aviso_previo boolean DEFAULT false,
  pausa_contratual boolean DEFAULT false,
  selected boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.32 celebration_templates
CREATE TABLE IF NOT EXISTS public.celebration_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  audio_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.33 system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.34 audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name text,
  action_type text,
  record_id text,
  user_id uuid REFERENCES auth.users(id),
  accessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.35 success_cases
CREATE TABLE IF NOT EXISTS public.success_cases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name text NOT NULL,
  squad text,
  owner text,
  nichos text[] DEFAULT '{}',
  titulo_destaque text,
  descricao_curta text,
  metricas_badges text[] DEFAULT '{}',
  resumo_case text,
  is_published boolean NOT NULL DEFAULT false,
  client_logo text,
  cover_image text,
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  dot_logo_variant text,
  -- Conteúdo do blog post
  contexto_inicial text,
  como_chegou text,
  principais_dores text,
  tentativas_anteriores text,
  objetivos_alinhados text,
  metas_entrada text,
  prazo_analise text,
  estrategia_dot text,
  periodo_analisado text,
  resultados_atingidos text,
  aprendizados text,
  insights_replicaveis text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.36 blog_config
CREATE TABLE IF NOT EXISTS public.blog_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key text NOT NULL UNIQUE,
  config_value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.37 copy_forms
CREATE TABLE IF NOT EXISTS public.copy_forms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'draft',
  copy_type text DEFAULT 'onboarding',
  -- Transcrições
  reuniao_boas_vindas text,
  reuniao_kick_off text,
  reuniao_brainstorm text,
  -- Estrutura LP
  tamanho_lp text,
  -- Empresa & Oferta
  nome_empresa text,
  nicho_empresa text,
  site text,
  servicos_produtos text,
  diferencial_competitivo text,
  -- Público
  publico_alvo text,
  principal_inimigo text,
  avatar_principal text,
  momento_jornada text,
  maior_objecao text,
  cases_impressionantes text,
  nomes_empresas text,
  investimento_medio text,
  pergunta_qualificatoria text,
  informacao_extra text,
  numeros_certificados text,
  -- AI
  document_files text[],
  ai_response text,
  ai_provider text,
  response_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.38 briefing_form_labels
CREATE TABLE IF NOT EXISTS public.briefing_form_labels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_key text NOT NULL UNIQUE,
  label text,
  placeholder text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.39 default_briefing_documents
CREATE TABLE IF NOT EXISTS public.default_briefing_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name text,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.40 default_prompts
CREATE TABLE IF NOT EXISTS public.default_prompts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================
-- 3. ÍNDICES
-- =====================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_project_scope ON public.profiles(project_scope);
CREATE INDEX IF NOT EXISTS idx_crm_cards_pipeline_id ON public.crm_cards(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_cards_stage_id ON public.crm_cards(stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_cards_created_by ON public.crm_cards(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_cards_company_name ON public.crm_cards(company_name);
CREATE INDEX IF NOT EXISTS idx_crm_stages_pipeline_id ON public.crm_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_crm_card_tags_card_id ON public.crm_card_tags(card_id);
CREATE INDEX IF NOT EXISTS idx_crm_card_tags_tag_id ON public.crm_card_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_card_id ON public.crm_activities(card_id);
CREATE INDEX IF NOT EXISTS idx_crm_card_stage_history_card_id ON public.crm_card_stage_history(card_id);
CREATE INDEX IF NOT EXISTS idx_crm_card_tasks_card_id ON public.crm_card_tasks(card_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_card_id ON public.cancellation_requests(card_id);
CREATE INDEX IF NOT EXISTS idx_nps_responses_card_id ON public.nps_responses(card_id);
CREATE INDEX IF NOT EXISTS idx_csat_responses_card_id ON public.csat_responses(card_id);
CREATE INDEX IF NOT EXISTS idx_approval_jobs_status ON public.approval_jobs(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_accessed_at ON public.audit_logs(accessed_at);

-- =====================
-- 4. STORAGE BUCKETS
-- =====================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('briefing-documents', 'briefing-documents', true),
  ('contract-attachments', 'contract-attachments', true),
  ('contract-documents', 'contract-documents', true),
  ('cancellation-attachments', 'cancellation-attachments', true),
  ('crm-card-attachments', 'crm-card-attachments', true),
  ('approval-attachments', 'approval-attachments', true),
  ('celebration-audio', 'celebration-audio', true),
  ('avatars', 'avatars', true),
  ('success-cases', 'success-cases', true)
ON CONFLICT (id) DO NOTHING;

-- =====================
-- 5. RLS (Row Level Security)
-- =====================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activity_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stage_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_loss_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_upsell_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_variable_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_card_performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_special_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_client_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projetos_reservados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.celebration_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_form_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_briefing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.default_prompts ENABLE ROW LEVEL SECURITY;

-- =====================
-- 5.1 Policies genéricas: usuários autenticados podem ler e manipular dados
-- (Em produção, refinar por role/ownership conforme necessário)
-- =====================

-- Macro para criar policies CRUD para authenticated em cada tabela
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles','custom_roles','modules','role_module_permissions','user_module_permissions',
      'squads','crm_pipelines','crm_stages','crm_cards','crm_tags','crm_card_tags',
      'crm_card_emails','crm_activities','crm_activity_attachments','crm_card_stage_history',
      'crm_stage_tasks','crm_card_tasks','crm_loss_reasons','crm_card_upsell_history',
      'crm_card_variable_history','crm_card_performance_history','crm_special_lists',
      'pipeline_automations','cancellation_requests','cancellation_attachments',
      'nps_responses','csat_responses','approval_jobs','approval_client_feedback',
      'contracts','projetos_reservados','celebration_templates','system_settings',
      'audit_logs','success_cases','blog_config','copy_forms','briefing_form_labels',
      'default_briefing_documents','default_prompts'
    ])
  LOOP
    EXECUTE format('CREATE POLICY "auth_select_%s" ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON public.%I FOR DELETE TO authenticated USING (true)', tbl, tbl);
  END LOOP;
END
$$;

-- Policies públicas para tabelas que precisam de acesso anônimo
-- (formulários públicos: NPS, CSAT, cancelamento, aprovação cliente, blog)
CREATE POLICY "anon_insert_nps" ON public.nps_responses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_csat" ON public.csat_responses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_cancellation" ON public.cancellation_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_approval_jobs" ON public.approval_jobs FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_approval_feedback" ON public.approval_client_feedback FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_approval_feedback" ON public.approval_client_feedback FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_success_cases" ON public.success_cases FOR SELECT TO anon USING (is_published = true);
CREATE POLICY "anon_select_blog_config" ON public.blog_config FOR SELECT TO anon USING (true);

-- =====================
-- 5.2 Storage policies
-- =====================
DO $$
DECLARE
  bucket text;
BEGIN
  FOR bucket IN
    SELECT unnest(ARRAY[
      'briefing-documents','contract-attachments','contract-documents',
      'cancellation-attachments','crm-card-attachments','approval-attachments',
      'celebration-audio','avatars','success-cases'
    ])
  LOOP
    EXECUTE format(
      'CREATE POLICY "auth_select_%s" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = %L)',
      replace(bucket, '-', '_'), bucket
    );
    EXECUTE format(
      'CREATE POLICY "auth_insert_%s" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = %L)',
      replace(bucket, '-', '_'), bucket
    );
    EXECUTE format(
      'CREATE POLICY "auth_update_%s" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = %L)',
      replace(bucket, '-', '_'), bucket
    );
    EXECUTE format(
      'CREATE POLICY "auth_delete_%s" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = %L)',
      replace(bucket, '-', '_'), bucket
    );
  END LOOP;
END
$$;

-- Storage policies para acesso anônimo (success-cases público, approval-attachments público)
CREATE POLICY "anon_select_success_cases_storage" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'success-cases');
CREATE POLICY "anon_select_approval_attachments" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'approval-attachments');

-- =====================
-- FIM DA MIGRAÇÃO
-- =====================
