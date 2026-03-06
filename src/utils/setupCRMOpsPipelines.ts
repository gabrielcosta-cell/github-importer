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

// Stage names from the old Closer pipeline that should be removed
const LEGACY_STAGE_NAMES = ['R1', 'R1 Delay', 'R2', 'R2 Delay', 'R3', 'Follow Up'];

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

// Lock to prevent concurrent migration
let migrationRunning = false;

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

  const keepId = allPipelines[0].id;
  const deleteIds = allPipelines.slice(1).map(p => p.id);

  for (const id of deleteIds) {
    // Move cards from duplicate pipelines to the kept one before deleting
    await supabase.from('csm_cards').update({ pipeline_id: keepId } as any).eq('pipeline_id', id);
    await supabase.from('csm_stages').delete().eq('pipeline_id', id);
  }

  await supabase
    .from('csm_pipelines')
    .delete()
    .in('id', deleteIds);

  console.log(`Deduplicação: manteve ${keepId}, removeu ${deleteIds.length} duplicatas de "${pipelineName}"`);
  return keepId;
}

// Clean up duplicate stages within a pipeline (keep oldest of each name)
async function deduplicateStages(pipelineId: string): Promise<void> {
  const { data: allStages } = await supabase
    .from('csm_stages')
    .select('id, name, created_at')
    .eq('pipeline_id', pipelineId)
    .order('created_at', { ascending: true });

  if (!allStages || allStages.length === 0) return;

  const keepMap = new Map<string, string>(); // name → oldest id
  const deleteIds: string[] = [];

  for (const stage of allStages) {
    if (!keepMap.has(stage.name)) {
      keepMap.set(stage.name, stage.id);
    } else {
      // Move cards from duplicate stage to the kept one
      const keepId = keepMap.get(stage.name)!;
      await supabase.from('csm_cards').update({ stage_id: keepId } as any).eq('stage_id', stage.id);
      deleteIds.push(stage.id);
    }
  }

  if (deleteIds.length > 0) {
    await supabase.from('csm_stages').delete().in('id', deleteIds);
    console.log(`Dedup etapas: removeu ${deleteIds.length} duplicatas no pipeline ${pipelineId}`);
  }
}

// Migrate legacy "Closer | Principal" pipeline to "Upsell | CrossSell" with new stages
async function migrateLegacyCloserPipeline(): Promise<string | null> {
  // Check for pipeline with either legacy or new name
  const { data: legacyPipelines } = await supabase
    .from('csm_pipelines')
    .select('id, name')
    .in('name', [CLOSER_PIPELINE_LEGACY_NAME, CLOSER_PIPELINE_NAME])
    .order('created_at', { ascending: true });

  if (!legacyPipelines || legacyPipelines.length === 0) return null;

  // If we have duplicates across both names, merge them
  const pipelineId = legacyPipelines[0].id;

  // Move cards and delete duplicate pipelines
  for (let i = 1; i < legacyPipelines.length; i++) {
    const dupeId = legacyPipelines[i].id;
    await supabase.from('csm_cards').update({ pipeline_id: pipelineId } as any).eq('pipeline_id', dupeId);
    await supabase.from('csm_stages').delete().eq('pipeline_id', dupeId);
    await supabase.from('csm_pipelines').delete().eq('id', dupeId);
  }

  // Ensure pipeline has the new name
  if (legacyPipelines[0].name !== CLOSER_PIPELINE_NAME) {
    await supabase
      .from('csm_pipelines')
      .update({ name: CLOSER_PIPELINE_NAME })
      .eq('id', pipelineId);
    console.log(`Pipeline renomeado: "${CLOSER_PIPELINE_LEGACY_NAME}" → "${CLOSER_PIPELINE_NAME}"`);
  }

  // Get current stages
  const { data: currentStages } = await supabase
    .from('csm_stages')
    .select('id, name')
    .eq('pipeline_id', pipelineId);

  if (!currentStages) return pipelineId;

  // Check if any legacy stages still exist
  const legacyStages = currentStages.filter(s => LEGACY_STAGE_NAMES.includes(s.name));
  const newStageNames = CLOSER_STAGES.map(s => s.name);
  const existingNewStages = currentStages.filter(s => newStageNames.includes(s.name));

  // If legacy stages exist, we need to migrate cards and clean up
  if (legacyStages.length > 0) {
    // Ensure new stages exist
    if (existingNewStages.length === 0) {
      // Create new stages
      const { data: createdStages } = await supabase
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

      if (createdStages) {
        existingNewStages.push(...createdStages);
      }
    }

    // Build lookup: new stage name → id
    const newStageMap = new Map(existingNewStages.map(s => [s.name, s.id]));

    // Move cards from legacy stages to new stages
    for (const oldStage of legacyStages) {
      const targetName = LEGACY_STAGE_MAPPING[oldStage.name];
      const targetId = targetName ? newStageMap.get(targetName) : null;
      if (targetId) {
        await supabase
          .from('csm_cards')
          .update({ stage_id: targetId } as any)
          .eq('stage_id', oldStage.id);
        console.log(`Migrados cards: "${oldStage.name}" → "${targetName}"`);
      }
    }

    // Delete legacy stages
    const legacyIds = legacyStages.map(s => s.id);
    await supabase.from('csm_stages').delete().in('id', legacyIds);
    console.log('Etapas antigas removidas após migração');
  }

  // Clean up any duplicate stages with the same name
  await deduplicateStages(pipelineId);

  return pipelineId;
}

async function ensurePipelineWithStages(
  pipelineName: string,
  stages: typeof SDR_STAGES,
  userId: string,
  position: number
): Promise<string | null> {
  try {
    const existingId = await deduplicatePipelines(pipelineName);

    if (existingId) {
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
  // Prevent concurrent execution (React StrictMode double-render)
  if (migrationRunning) return { sdrId: null, closerId: null };
  migrationRunning = true;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { sdrId: null, closerId: null };

    // First, migrate legacy Closer pipeline if it exists
    const migratedId = await migrateLegacyCloserPipeline();

    const sdrId = await ensurePipelineWithStages(SDR_PIPELINE_NAME, SDR_STAGES, user.id, 10);
    const closerId = migratedId || await ensurePipelineWithStages(CLOSER_PIPELINE_NAME, CLOSER_STAGES, user.id, 11);

    return { sdrId, closerId };
  } finally {
    migrationRunning = false;
  }
}

export const CRM_OPS_PIPELINE_NAMES = [SDR_PIPELINE_NAME, CLOSER_PIPELINE_NAME, CLOSER_PIPELINE_LEGACY_NAME];
