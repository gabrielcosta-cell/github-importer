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

async function ensurePipelineWithStages(
  pipelineName: string,
  stages: typeof SDR_STAGES,
  userId: string,
  position: number
): Promise<string | null> {
  try {
    // Check if pipeline exists
    const { data: existing } = await supabase
      .from('csm_pipelines')
      .select('id')
      .eq('name', pipelineName)
      .maybeSingle();

    if (existing) {
      // Ensure stages exist
      const { data: existingStages } = await supabase
        .from('csm_stages')
        .select('id')
        .eq('pipeline_id', existing.id);

      if (!existingStages || existingStages.length === 0) {
        await supabase.from('csm_stages').insert(
          stages.map(s => ({
            pipeline_id: existing.id,
            name: s.name,
            color: s.color,
            position: s.position,
            is_active: true,
          }))
        );
      }
      return existing.id;
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
