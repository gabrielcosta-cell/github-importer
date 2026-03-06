import { supabase } from '@/integrations/supabase/client';

const SDR_PIPELINE_NAME = 'SDR | Principal';
const CLOSER_PIPELINE_NAME = 'Upsell | CrossSell';
const CLOSER_PIPELINE_LEGACY_NAME = 'Closer | Principal';

const SDR_STAGES = [
  { name: 'Dia 1 (urgente lead novo)', color: '#EF4444', position: 0 },
  { name: 'Dia 2', color: '#F59E0B', position: 1 },
  { name: 'Dia 3', color: '#F59E0B', position: 2 },
  { name: 'Dia 4', color: '#F59E0B', position: 3 },
  { name: 'Dia 5 (descanso)', color: '#10B981', position: 4 },
  { name: 'Dia 6', color: '#10B981', position: 5 },
  { name: 'Dia 7 (descanso)', color: '#10B981', position: 6 },
  { name: 'Dia 8 (descanso)', color: '#10B981', position: 7 },
  { name: 'Dia 9', color: '#EF4444', position: 8 },
  { name: 'Contato Futuro', color: '#EF4444', position: 9 },
];

const CLOSER_STAGES = [
  { name: 'Oportunidades', color: '#3B82F6', position: 0 },
  { name: 'Orçamento', color: '#F59E0B', position: 1 },
  { name: 'Apresentação', color: '#6366F1', position: 2 },
  { name: 'Negociação', color: '#8B5CF6', position: 3 },
  { name: 'Em assinatura', color: '#10B981', position: 4 },
];

// Mapping from old stage names to new stage names
const LEGACY_STAGE_MAPPING: Record<string, string> = {
  'R1': 'Oportunidades',
  'R1 Delay': 'Oportunidades',
  'R2': 'Orçamento',
  'R2 Delay': 'Orçamento',
  'R3': 'Apresentação',
  'Follow Up': 'Negociação',
  'Em assinatura': 'Em assinatura',
};

// Remove duplicate pipelines, keeping only the oldest one
async function deduplicatePipelines(pipelineName: string): Promise<string | null> {
  const { data: allPipelines } = await supabase
    .from('csm_pipelines')
    .select('id, created_at')
    .eq('name', pipelineName)
    .order('created_at', { ascending: true });

  if (!allPipelines || allPipelines.length <= 1) {
    return allPipelines?.[0]?.id || null;
  }

  // Keep the first (oldest), delete the rest
  const keepId = allPipelines[0].id;
  const deleteIds = allPipelines.slice(1).map(p => p.id);

  // Delete stages of duplicate pipelines first
  for (const id of deleteIds) {
    await supabase.from('csm_stages').delete().eq('pipeline_id', id);
    await supabase.from('csm_cards').delete().eq('pipeline_id', id);
  }

  // Delete duplicate pipelines
  await supabase
    .from('csm_pipelines')
    .delete()
    .in('id', deleteIds);

  console.log(`Deduplicação: manteve ${keepId}, removeu ${deleteIds.length} duplicatas de "${pipelineName}"`);
  return keepId;
}

// Migrate legacy "Closer | Principal" pipeline to "Upsell | CrossSell" with new stages
async function migrateLegacyCloserPipeline(): Promise<string | null> {
  // Check if legacy pipeline exists
  const { data: legacyPipelines } = await supabase
    .from('csm_pipelines')
    .select('id')
    .eq('name', CLOSER_PIPELINE_LEGACY_NAME)
    .order('created_at', { ascending: true });

  if (!legacyPipelines || legacyPipelines.length === 0) return null;

  const pipelineId = legacyPipelines[0].id;

  // Rename the pipeline
  await supabase
    .from('csm_pipelines')
    .update({ name: CLOSER_PIPELINE_NAME })
    .eq('id', pipelineId);

  console.log(`Pipeline renomeado: "${CLOSER_PIPELINE_LEGACY_NAME}" → "${CLOSER_PIPELINE_NAME}"`);

  // Get existing stages
  const { data: oldStages } = await supabase
    .from('csm_stages')
    .select('id, name')
    .eq('pipeline_id', pipelineId);

  if (!oldStages || oldStages.length === 0) return pipelineId;

  // Check if migration already happened (new stage names already exist)
  const hasNewStages = oldStages.some(s => s.name === 'Oportunidades' || s.name === 'Orçamento');
  if (hasNewStages) {
    console.log('Migração de etapas já realizada, pulando...');
    return pipelineId;
  }

  // Create new stages
  const { data: newStages } = await supabase
    .from('csm_stages')
    .insert(
      CLOSER_STAGES.map(s => ({
        pipeline_id: pipelineId,
        name: s.name,
        color: s.color,
        position: s.position,
        is_active: true,
      }))
    )
    .select('id, name');

  if (!newStages) {
    console.error('Erro ao criar novas etapas');
    return pipelineId;
  }

  // Build lookup: new stage name → new stage id
  const newStageMap = new Map(newStages.map(s => [s.name, s.id]));

  // Move cards from old stages to new stages
  for (const oldStage of oldStages) {
    const targetStageName = LEGACY_STAGE_MAPPING[oldStage.name];
    if (!targetStageName) continue;

    const targetStageId = newStageMap.get(targetStageName);
    if (!targetStageId) continue;

    await supabase
      .from('csm_cards')
      .update({ stage_id: targetStageId } as any)
      .eq('stage_id', oldStage.id);

    console.log(`Migrados cards: "${oldStage.name}" → "${targetStageName}"`);
  }

  // Delete old stages (now empty)
  const oldStageIds = oldStages.map(s => s.id);
  await supabase
    .from('csm_stages')
    .delete()
    .in('id', oldStageIds);

  console.log('Etapas antigas removidas após migração');

  // Delete duplicate legacy pipelines if any
  if (legacyPipelines.length > 1) {
    const dupeIds = legacyPipelines.slice(1).map(p => p.id);
    for (const id of dupeIds) {
      await supabase.from('csm_stages').delete().eq('pipeline_id', id);
      await supabase.from('csm_cards').delete().eq('pipeline_id', id);
    }
    await supabase.from('csm_pipelines').delete().in('id', dupeIds);
  }

  return pipelineId;
}

async function ensurePipelineWithStages(
  pipelineName: string,
  stages: typeof SDR_STAGES,
  userId: string,
  position: number
): Promise<string | null> {
  try {
    // First deduplicate any existing duplicates
    const existingId = await deduplicatePipelines(pipelineName);

    if (existingId) {
      // Only create stages if the pipeline has none at all
      const { count } = await supabase
        .from('csm_stages')
        .select('id', { count: 'exact', head: true })
        .eq('pipeline_id', existingId);

      if (!count || count === 0) {
        await supabase.from('csm_stages').insert(
          stages.map(s => ({
            pipeline_id: existingId,
            name: s.name,
            color: s.color,
            position: s.position,
            is_active: true,
          }))
        );
      }
      return existingId;
    }

    // Create pipeline
    const { data: pipeline, error } = await supabase
      .from('csm_pipelines')
      .insert({
        name: pipelineName,
        is_active: true,
        position,
        created_by: userId,
      })
      .select('id')
      .single();

    if (error || !pipeline) {
      console.error(`Erro ao criar pipeline ${pipelineName}:`, error);
      return null;
    }

    // Create stages
    await supabase.from('csm_stages').insert(
      stages.map(s => ({
        pipeline_id: pipeline.id,
        name: s.name,
        color: s.color,
        position: s.position,
        is_active: true,
      }))
    );

    return pipeline.id;
  } catch (err) {
    console.error(`Erro ao configurar pipeline ${pipelineName}:`, err);
    return null;
  }
}

export async function setupCRMOpsPipelines(): Promise<{ sdrId: string | null; closerId: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sdrId: null, closerId: null };

  // First, migrate legacy Closer pipeline if it exists
  const migratedId = await migrateLegacyCloserPipeline();

  const sdrId = await ensurePipelineWithStages(SDR_PIPELINE_NAME, SDR_STAGES, user.id, 10);
  
  // If migration already handled the closer pipeline, just return its id
  const closerId = migratedId || await ensurePipelineWithStages(CLOSER_PIPELINE_NAME, CLOSER_STAGES, user.id, 11);

  return { sdrId, closerId };
}

export const CRM_OPS_PIPELINE_NAMES = [SDR_PIPELINE_NAME, CLOSER_PIPELINE_NAME, CLOSER_PIPELINE_LEGACY_NAME];
