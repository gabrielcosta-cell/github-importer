import { supabase } from '@/integrations/supabase/client';

interface CancelledClient {
  company_name: string;
  squad: 'Apollo' | 'Artemis' | 'Athena' | 'Ares';
  plano: 'Starter' | 'Business' | 'Pro' | 'Conceito' | 'Social';
  monthly_revenue: number;
  data_contrato: string;
  tempo_contrato: string;
  valor_contrato: number;
  niche: string;
  existe_comissao: boolean;
  observacao_comissao?: string;
  fase_projeto: string;
  etapa_formal: string;
  servico_contratado: string;
}

const ETAPA_TO_STAGE: Record<string, string> = {
  'Onboarding': '1º Mês',
  'Implementação': '2º Mês',
  'Refinamento': '3º Mês',
  'Escala': '4º Mês',
  'Expansão': '5º Mês',
  'Renovação': '6º Mês',
  'Retenção': 'Retenção',
};

const CANCELLED_CLIENTS_FEB: CancelledClient[] = [
  {
    company_name: 'Inshape',
    squad: 'Apollo',
    plano: 'Pro',
    monthly_revenue: 4900,
    data_contrato: '2025-06-01',
    tempo_contrato: '6',
    valor_contrato: 29400,
    niche: 'Produto',
    existe_comissao: true,
    observacao_comissao: 'mensalidade de venda',
    fase_projeto: 'Renovação',
    etapa_formal: 'Renovação',
    servico_contratado: 'Gestão de Tráfego',
  },
  {
    company_name: '8 milímetros',
    squad: 'Apollo',
    plano: 'Starter',
    monthly_revenue: 2800,
    data_contrato: '2025-01-01',
    tempo_contrato: '6',
    valor_contrato: 16800,
    niche: 'Serviço',
    existe_comissao: true,
    observacao_comissao: '5% (R$10.000 a R$5(',
    fase_projeto: 'Renovação',
    etapa_formal: 'Renovação',
    servico_contratado: 'Gestão de Tráfego',
  },
  {
    company_name: 'Face Doctor',
    squad: 'Apollo',
    plano: 'Conceito',
    monthly_revenue: 4900,
    data_contrato: '2025-03-01',
    tempo_contrato: '6',
    valor_contrato: 29400,
    niche: 'Franquia',
    existe_comissao: true,
    observacao_comissao: '1,8% (acima',
    fase_projeto: 'Renovação',
    etapa_formal: 'Renovação',
    servico_contratado: 'Gestão de Tráfego',
  },
  {
    company_name: 'Cotafácil',
    squad: 'Apollo',
    plano: 'Pro',
    monthly_revenue: 5800,
    data_contrato: '2025-09-01',
    tempo_contrato: '6',
    valor_contrato: 34800,
    niche: 'Franquia',
    existe_comissao: false,
    fase_projeto: 'Escala',
    etapa_formal: 'Escala',
    servico_contratado: 'Gestão de Tráfego',
  },
  {
    company_name: 'Grupo Bemba',
    squad: 'Apollo',
    plano: 'Pro',
    monthly_revenue: 3600,
    data_contrato: '2025-10-01',
    tempo_contrato: '6',
    valor_contrato: 21600,
    niche: 'Serviço',
    existe_comissao: true,
    observacao_comissao: 'primeiro pagamento',
    fase_projeto: 'Refinamento',
    etapa_formal: 'Refinamento',
    servico_contratado: 'Gestão de Tráfego',
  },
  {
    company_name: 'Style Brazil',
    squad: 'Apollo',
    plano: 'Pro',
    monthly_revenue: 4900,
    data_contrato: '2026-01-01',
    tempo_contrato: '6',
    valor_contrato: 29400,
    niche: 'Produto',
    existe_comissao: true,
    observacao_comissao: 'rea as vendas dos lea',
    fase_projeto: 'Onboarding',
    etapa_formal: 'Onboarding',
    servico_contratado: 'Gestão de Tráfego',
  },
  {
    company_name: 'Rede Conecta',
    squad: 'Artemis',
    plano: 'Pro',
    monthly_revenue: 4900,
    data_contrato: '2026-01-01',
    tempo_contrato: '6',
    valor_contrato: 29400,
    niche: 'Telecom',
    existe_comissao: false,
    fase_projeto: 'Onboarding',
    etapa_formal: 'Onboarding',
    servico_contratado: 'Gestão de Tráfego',
  },
  {
    company_name: 'Connect Tecnologia (Gestão de Tráfego)',
    squad: 'Athena',
    plano: 'Business',
    monthly_revenue: 1750,
    data_contrato: '2024-11-01',
    tempo_contrato: '6',
    valor_contrato: 10500,
    niche: 'Serviço',
    existe_comissao: false,
    fase_projeto: 'Renovação',
    etapa_formal: 'Renovação',
    servico_contratado: 'Gestão de Tráfego',
  },
  {
    company_name: 'Connect Tecnologia (Social Media)',
    squad: 'Athena',
    plano: 'Business',
    monthly_revenue: 1750,
    data_contrato: '2024-11-01',
    tempo_contrato: '6',
    valor_contrato: 10500,
    niche: 'Serviço',
    existe_comissao: false,
    fase_projeto: 'Renovação',
    etapa_formal: 'Renovação',
    servico_contratado: 'Social Media',
  },
];

const PIPELINE_ID = '749ccdc2-5127-41a1-997b-3dcb47979555';

export async function importCancelledClientsFeb(): Promise<{ success: number; skipped: number; errors: string[] }> {
  const result = { success: 0, skipped: 0, errors: [] as string[] };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    result.errors.push('Usuário não autenticado');
    return result;
  }

  const { data: stages, error: stagesError } = await supabase
    .from('csm_stages')
    .select('id, name')
    .eq('pipeline_id', PIPELINE_ID)
    .eq('is_active', true)
    .order('position', { ascending: true });

  if (stagesError || !stages?.length) {
    result.errors.push('Não foi possível encontrar stages do pipeline');
    return result;
  }

  const stageMap: Record<string, string> = {};
  for (const s of stages) {
    if (!stageMap[s.name]) stageMap[s.name] = s.id;
  }
  const fallbackStageId = stages[0].id;

  for (const client of CANCELLED_CLIENTS_FEB) {
    const targetStageName = ETAPA_TO_STAGE[client.etapa_formal] || '1º Mês';
    const clientStageId = stageMap[targetStageName] || fallbackStageId;

    const { data: existing } = await supabase
      .from('csm_cards')
      .select('id')
      .eq('company_name', client.company_name)
      .eq('pipeline_id', PIPELINE_ID)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('csm_cards')
        .update({
          stage_id: clientStageId,
          client_status: 'cancelado',
          churn: true,
          data_perda: '2026-02-28',
          fase_projeto: client.fase_projeto,
          squad: client.squad,
          plano: client.plano,
          monthly_revenue: client.monthly_revenue,
          niche: client.niche,
          servico_contratado: client.servico_contratado,
          data_contrato: client.data_contrato,
          data_inicio: client.data_contrato,
          tempo_contrato: client.tempo_contrato,
          valor_contrato: client.valor_contrato,
          existe_comissao: client.existe_comissao,
          observacao_comissao: client.observacao_comissao || null,
        } as any)
        .eq('id', existing[0].id);

      if (error) {
        result.errors.push(`Erro ao atualizar ${client.company_name}: ${error.message}`);
      } else {
        result.success++;
      }
    } else {
      const { error } = await supabase
        .from('csm_cards')
        .insert({
          title: client.company_name,
          company_name: client.company_name,
          stage_id: clientStageId,
          pipeline_id: PIPELINE_ID,
          squad: client.squad,
          plano: client.plano,
          monthly_revenue: client.monthly_revenue,
          value: client.monthly_revenue,
          niche: client.niche,
          servico_contratado: client.servico_contratado,
          data_contrato: client.data_contrato,
          data_inicio: client.data_contrato,
          tempo_contrato: client.tempo_contrato,
          valor_contrato: client.valor_contrato,
          existe_comissao: client.existe_comissao,
          observacao_comissao: client.observacao_comissao || null,
          client_status: 'cancelado',
          churn: true,
          data_perda: '2026-02-28',
          fase_projeto: client.fase_projeto,
          position: 0,
          created_by: user.id,
        } as any);

      if (error) {
        result.errors.push(`Erro ao inserir ${client.company_name}: ${error.message}`);
      } else {
        result.success++;
      }
    }
  }

  return result;
}
