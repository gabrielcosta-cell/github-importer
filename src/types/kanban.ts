// Shared Kanban types used by CSM and other modules

export interface CSMPipeline {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CSMStage {
  id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CSMCard {
  id: string;
  stage_id: string;
  pipeline_id: string;
  title: string;
  description?: string;
  value: number; // Mantido para compatibilidade, mas usar monthly_revenue
  faturamento_display?: string | null; // Texto original do faturamento
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  monthly_revenue?: number; // Campo unificado: MRR (Receita Mensal)
  niche?: string;
  implementation_value?: number;
  squad?: 'Apollo' | 'Artemis' | 'Athena' | 'Ares' | null;
  plano?: 'Starter' | 'Business' | 'Pro' | 'Conceito' | 'Social' | null;
  categoria?: string;
  position: number;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // UTM Fields
  utm_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  // Campos de métricas de cliente
  receita_gerada_cliente?: number | null;
  investimento_midia?: number | null;
  teve_vendas?: string | null;
  teve_roas_maior_1?: string | null;
  teve_roi_maior_1?: string | null;
  nota_nps?: number | null;
  // Campos de perda
  motivo_perda?: string | null;
  comentarios_perda?: string | null;
  data_perda?: string | null;
  // Campos de status do cliente
  inadimplente?: boolean;
  churn?: boolean;
  upsell?: boolean;
  em_pausa?: boolean;
  situacao?: string;
  // Campos de endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cnpj?: string;
  // Campos de data
  data_inicio?: string | null;
  data_contrato?: string | null;
  // Tags
  tags?: string[];
  // Campos de qualificação
  qualification_score?: number;
  qualification_data?: {
    budget_score: number;
    needs_score: number;
    urgency_score: number;
    authority_score: number;
    fit_score: number;
    notes: string;
  } | null;
  // Campos de qualificação individual
  qual_nicho_certo?: number | null;
  qual_porte_empresa?: number | null;
  qual_tomador_decisao?: number | null;
  qual_investe_marketing?: number | null;
  qual_urgencia_real?: number | null;
  qual_clareza_objetivos?: number | null;
  // Campo de briefing
  briefing_answers?: any;
  // Status do cliente (ativo/cancelado)
  client_status?: 'ativo' | 'cancelado';
  // ID sequencial único visível
  display_id?: number;
  // Campos adicionais do contrato
  valor_contrato?: number;
  observacao_comissao?: string;
  // Campos de tipo de receita (CRM Ops)
  tipo_receita?: 'venda_unica' | 'variavel_midia' | 'variavel_meta' | 'venda_recorrente' | null;
  migrado_csm?: boolean;
  data_ganho?: string | null;
}
