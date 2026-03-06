import { supabase } from '@/integrations/supabase/client';

interface WonClient {
  company_name: string;
  value: number;
}

const WON_CLIENTS: WonClient[] = [
  { company_name: 'Plugg.to', value: 20.00 },
  { company_name: 'Versátil Banheiras', value: 1803.00 },
  { company_name: 'Café da Fazenda', value: 245.00 },
  { company_name: 'Ackno', value: 2850.00 },
  { company_name: 'Paragon', value: 4000.00 },
  { company_name: 'CA Inglês', value: 180.00 },
  { company_name: 'Cantral de Espelhos', value: 632.33 },
  { company_name: 'Preditiva', value: 351.60 },
];

export async function importCloserWonFeb(): Promise<{ success: number; skipped: number; errors: string[] }> {
  const result = { success: 0, skipped: 0, errors: [] as string[] };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    result.errors.push('Usuário não autenticado');
    return result;
  }

  // Find "Upsell | CrossSell" pipeline (or legacy "Closer | Principal")
  let { data: pipeline, error: pipeErr } = await supabase
    .from('csm_pipelines')
    .select('id')
    .eq('name', 'Upsell | CrossSell')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (pipeErr || !pipeline) {
    // Fallback to legacy name
    const legacy = await supabase
      .from('csm_pipelines')
      .select('id')
      .eq('name', 'Closer | Principal')
      .eq('is_active', true)
      .limit(1)
      .single();
    pipeline = legacy.data;
  }

  if (!pipeline) {
    result.errors.push('Pipeline "Upsell | CrossSell" não encontrado');
    return result;
  }

  // Find "Em assinatura" stage
  const { data: stage, error: stageErr } = await supabase
    .from('csm_stages')
    .select('id')
    .eq('pipeline_id', pipeline.id)
    .eq('name', 'Em assinatura')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (stageErr || !stage) {
    result.errors.push('Etapa "Em assinatura" não encontrada');
    return result;
  }

  for (const client of WON_CLIENTS) {
    // Check duplicates
    const { data: existing } = await supabase
      .from('csm_cards')
      .select('id')
      .eq('company_name', client.company_name)
      .eq('pipeline_id', pipeline.id)
      .limit(1);

    if (existing && existing.length > 0) {
      result.skipped++;
      continue;
    }

    const { error } = await supabase
      .from('csm_cards')
      .insert({
        title: client.company_name,
        company_name: client.company_name,
        stage_id: stage.id,
        pipeline_id: pipeline.id,
        value: client.value,
        monthly_revenue: client.value,
        position: 0,
        created_by: user.id,
        created_at: '2026-02-28T12:00:00.000Z',
        situacao: 'ganho',
      } as any);

    if (error) {
      result.errors.push(`Erro ao inserir ${client.company_name}: ${error.message}`);
    } else {
      result.success++;
    }
  }

  return result;
}
