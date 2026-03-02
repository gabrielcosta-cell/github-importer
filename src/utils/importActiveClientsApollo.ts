import { supabase } from '@/integrations/supabase/client';

interface ActiveClient {
  company_name: string;
  plano: string;
  monthly_revenue: number;
  etapa_formal: string;
  fase_projeto: string;
  servico_contratado: string;
  data_contrato: string;
  tempo_contrato: string;
  valor_contrato: number;
  niche: string;
}

const ETAPA_TO_STAGE: Record<string, string> = {
  'Onboarding': '1º Mês',
  'Implementação': '2º Mês',
  'Escala': '4º Mês',
  'Renovação': '6º Mês',
};

const ACTIVE_CLIENTS: ActiveClient[] = [
  {
    company_name: 'PluggTo',
    plano: 'Pro',
    monthly_revenue: 2450,
    etapa_formal: 'Renovação',
    fase_projeto: 'Escala',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-08-01',
    tempo_contrato: '6',
    valor_contrato: 14700,
    niche: 'SaaS',
  },
  {
    company_name: 'Lebes',
    plano: 'Conceito',
    monthly_revenue: 19900,
    etapa_formal: 'Implementação',
    fase_projeto: 'Mês Teste',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2026-01-01',
    tempo_contrato: '6',
    valor_contrato: 119400,
    niche: 'Varejo',
  },
  {
    company_name: 'Versátil Banheiras (Social Media)',
    plano: 'Business',
    monthly_revenue: 2450,
    etapa_formal: 'Renovação',
    fase_projeto: 'Escala',
    servico_contratado: 'Social Media',
    data_contrato: '2025-03-01',
    tempo_contrato: '6',
    valor_contrato: 14700,
    niche: 'Produto',
  },
  {
    company_name: 'Versátil Banheiras (Gestão de Tráfego)',
    plano: 'Business',
    monthly_revenue: 2450,
    etapa_formal: 'Renovação',
    fase_projeto: 'Escala',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-03-01',
    tempo_contrato: '6',
    valor_contrato: 14700,
    niche: 'Produto',
  },
  {
    company_name: 'Oslo Group',
    plano: 'Pro',
    monthly_revenue: 4300,
    etapa_formal: 'Escala',
    fase_projeto: 'Escala',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-09-01',
    tempo_contrato: '6',
    valor_contrato: 25800,
    niche: 'Mercado Financeiro',
  },
  {
    company_name: 'Sul Solar',
    plano: 'Business',
    monthly_revenue: 3500,
    etapa_formal: 'Escala',
    fase_projeto: 'Refinamento',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-09-01',
    tempo_contrato: '6',
    valor_contrato: 21000,
    niche: 'Produto',
  },
  {
    company_name: 'Linx',
    plano: 'Pro',
    monthly_revenue: 2450,
    etapa_formal: 'Renovação',
    fase_projeto: 'Escala',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-08-01',
    tempo_contrato: '6',
    valor_contrato: 14700,
    niche: 'SaaS',
  },
];

const PIPELINE_ID = '749ccdc2-5127-41a1-997b-3dcb47979555';

export async function importActiveClientsApollo(): Promise<{ success: number; skipped: number; errors: string[] }> {
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

  for (const client of ACTIVE_CLIENTS) {
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
          squad: 'Apollo',
          plano: client.plano,
          monthly_revenue: client.monthly_revenue,
          servico_contratado: client.servico_contratado,
          fase_projeto: client.fase_projeto,
          niche: client.niche,
          categoria: 'MRR recorrente',
        } as any)
        .eq('id', existing[0].id);

      if (error) {
        result.errors.push(`Erro ao atualizar ${client.company_name}: ${error.message}`);
      } else {
        result.skipped++;
      }
      continue;
    }

    const { error } = await supabase
      .from('csm_cards')
      .insert({
        title: client.company_name,
        company_name: client.company_name,
        stage_id: clientStageId,
        pipeline_id: PIPELINE_ID,
        squad: 'Apollo',
        plano: client.plano,
        monthly_revenue: client.monthly_revenue,
        value: client.monthly_revenue,
        servico_contratado: client.servico_contratado,
        data_contrato: client.data_contrato,
        data_inicio: client.data_contrato,
        tempo_contrato: client.tempo_contrato,
        valor_contrato: client.valor_contrato,
        niche: client.niche,
        fase_projeto: client.fase_projeto,
        categoria: 'MRR recorrente',
        client_status: 'ativo',
        position: 0,
        created_by: user.id,
        created_at: '2026-02-01T12:00:00.000Z',
      } as any);

    if (error) {
      result.errors.push(`Erro ao inserir ${client.company_name}: ${error.message}`);
    } else {
      result.success++;
    }
  }

  // Bulk update: set categoria for ALL cards in the pipeline
  const { error: bulkError } = await supabase
    .from('csm_cards')
    .update({ categoria: 'MRR recorrente' } as any)
    .eq('pipeline_id', PIPELINE_ID)
    .is('categoria', null);

  if (bulkError) {
    result.errors.push(`Erro ao atualizar categoria em lote: ${bulkError.message}`);
  }

  return result;
}
