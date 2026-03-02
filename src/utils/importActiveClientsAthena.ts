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
  'Mês Teste': '2º Mês',
  'Refinamento': '3º Mês',
  'Escala': '4º Mês',
  'Expansão': '5º Mês',
  'Renovação': '6º Mês',
  'Retenção': 'Retenção',
};

const ATHENA_CLIENTS: ActiveClient[] = [
  {
    company_name: 'Central de Espelhos',
    plano: 'Business',
    monthly_revenue: 3000,
    etapa_formal: 'Renovação',
    fase_projeto: 'Escala',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-08-01',
    tempo_contrato: '4',
    valor_contrato: 12000,
    niche: 'Produto',
  },
  {
    company_name: 'IGet Easy Market',
    plano: 'Starter',
    monthly_revenue: 2500,
    etapa_formal: 'Renovação',
    fase_projeto: 'Refinamento',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-06-01',
    tempo_contrato: '6',
    valor_contrato: 15000,
    niche: 'Franquia',
  },
  {
    company_name: 'ClorUp',
    plano: 'Starter',
    monthly_revenue: 1400,
    etapa_formal: 'Renovação',
    fase_projeto: 'Ongoing',
    servico_contratado: 'Social Media',
    data_contrato: '2025-05-01',
    tempo_contrato: '6',
    valor_contrato: 8400,
    niche: 'Produto',
  },
  {
    company_name: 'Aquiraz Investimentos',
    plano: 'Starter',
    monthly_revenue: 2000,
    etapa_formal: 'Renovação',
    fase_projeto: 'Ongoing',
    servico_contratado: 'Social Media',
    data_contrato: '2025-04-01',
    tempo_contrato: '6',
    valor_contrato: 12000,
    niche: 'Mercado Financeiro',
  },
  {
    company_name: 'CA Inglês',
    plano: 'Pro',
    monthly_revenue: 3666,
    etapa_formal: 'Escala',
    fase_projeto: 'Refinamento',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-09-01',
    tempo_contrato: '6',
    valor_contrato: 21996,
    niche: 'Serviço',
  },
  {
    company_name: 'BOX Car Brasil',
    plano: 'Pro',
    monthly_revenue: 4000,
    etapa_formal: 'Refinamento',
    fase_projeto: 'Refinamento',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-10-01',
    tempo_contrato: '4',
    valor_contrato: 16000,
    niche: 'Produto',
  },
  {
    company_name: 'Preditiva',
    plano: 'Business',
    monthly_revenue: 3500,
    etapa_formal: 'Refinamento',
    fase_projeto: 'Refinamento',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-10-01',
    tempo_contrato: '6',
    valor_contrato: 21000,
    niche: 'Serviço',
  },
  {
    company_name: 'Rodomavi',
    plano: 'Pro',
    monthly_revenue: 3500,
    etapa_formal: 'Refinamento',
    fase_projeto: 'Refinamento',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-10-01',
    tempo_contrato: '6',
    valor_contrato: 21000,
    niche: 'Implementos Agrícolas',
  },
  {
    company_name: 'Huli',
    plano: 'Business',
    monthly_revenue: 3000,
    etapa_formal: 'Refinamento',
    fase_projeto: 'Refinamento',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2025-10-01',
    tempo_contrato: '3',
    valor_contrato: 9000,
    niche: 'Imobiliária',
  },
  {
    company_name: 'Construlima',
    plano: 'Pro',
    monthly_revenue: 4900,
    etapa_formal: 'Onboarding',
    fase_projeto: 'Refinamento',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2026-01-01',
    tempo_contrato: '6',
    valor_contrato: 29400,
    niche: 'Serviço',
  },
  {
    company_name: 'Mantas Brasil',
    plano: 'Pro',
    monthly_revenue: 4900,
    etapa_formal: 'Onboarding',
    fase_projeto: 'Mês Teste',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2026-01-01',
    tempo_contrato: '6',
    valor_contrato: 29400,
    niche: 'Produto',
  },
  {
    company_name: 'INFOCUS CX',
    plano: 'Business',
    monthly_revenue: 4900,
    etapa_formal: 'Onboarding',
    fase_projeto: 'Onboarding',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2026-02-01',
    tempo_contrato: '6',
    valor_contrato: 29400,
    niche: 'Serviço',
  },
  {
    company_name: 'AGROISA',
    plano: 'Business',
    monthly_revenue: 3500,
    etapa_formal: 'Onboarding',
    fase_projeto: 'Onboarding',
    servico_contratado: 'Gestão de Tráfego',
    data_contrato: '2026-02-01',
    tempo_contrato: '6',
    valor_contrato: 21000,
    niche: 'Varejo',
  },
];

const PIPELINE_ID = '749ccdc2-5127-41a1-997b-3dcb47979555';

export async function importActiveClientsAthena(): Promise<{ success: number; skipped: number; errors: string[] }> {
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

  for (const client of ATHENA_CLIENTS) {
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
          squad: 'Athena',
          plano: client.plano,
          monthly_revenue: client.monthly_revenue,
          servico_contratado: client.servico_contratado,
          fase_projeto: client.fase_projeto,
          niche: client.niche,
          categoria: 'MRR Recorrente',
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
        squad: 'Athena',
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
        categoria: 'MRR Recorrente',
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

  return result;
}
