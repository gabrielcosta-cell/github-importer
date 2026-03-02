import { supabase } from '@/integrations/supabase/client';

const SDR_PIPELINE_NAME = 'SDR | Principal';
const CLOSER_PIPELINE_NAME = 'Closer | Principal';

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
  { name: 'R1', color: '#3B82F6', position: 0 },
  { name: 'R1 Delay', color: '#F59E0B', position: 1 },
  { name: 'R2', color: '#6366F1', position: 2 },
  { name: 'R2 Delay', color: '#F59E0B', position: 3 },
  { name: 'R3', color: '#8B5CF6', position: 4 },
  { name: 'Follow Up', color: '#EF4444', position: 5 },
  { name: 'Em assinatura', color: '#10B981', position: 6 },
];

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
      // Ensure all stages exist (sync missing ones)
      const { data: existingStages } = await supabase
        .from('csm_stages')
        .select('name')
        .eq('pipeline_id', existingId);

      const existingNames = new Set((existingStages || []).map(s => s.name));
      const missingStages = stages.filter(s => !existingNames.has(s.name));

      if (missingStages.length > 0) {
        await supabase.from('csm_stages').insert(
          missingStages.map(s => ({
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

  const sdrId = await ensurePipelineWithStages(SDR_PIPELINE_NAME, SDR_STAGES, user.id, 10);
  const closerId = await ensurePipelineWithStages(CLOSER_PIPELINE_NAME, CLOSER_STAGES, user.id, 11);

  return { sdrId, closerId };
}

export const CRM_OPS_PIPELINE_NAMES = [SDR_PIPELINE_NAME, CLOSER_PIPELINE_NAME];
