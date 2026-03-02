import { supabase } from '@/integrations/supabase/client';

const CLIENTES_ATIVOS_PIPELINE_ID = '749ccdc2-5127-41a1-997b-3dcb47979555';

const DEFAULT_STAGES = [
  { name: '1º Mês', color: '#3B82F6', position: 0 },
  { name: '2º Mês', color: '#6366F1', position: 1 },
  { name: '3º Mês', color: '#8B5CF6', position: 2 },
  { name: '4º Mês', color: '#A855F7', position: 3 },
  { name: '5º Mês', color: '#D946EF', position: 4 },
  { name: '6º Mês', color: '#EC4899', position: 5 },
  { name: 'Retenção', color: '#10B981', position: 6 },
];

export async function setupDefaultStages(): Promise<boolean> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Fetch existing stages
    const { data: existingStages } = await supabase
      .from('csm_stages')
      .select('id')
      .eq('pipeline_id', CLIENTES_ATIVOS_PIPELINE_ID);

    // Move cards from deleted stages to first new stage (will be handled after insert)
    const existingStageIds = (existingStages || []).map(s => s.id);

    // Delete existing stages
    if (existingStageIds.length > 0) {
      await supabase
        .from('csm_stages')
        .delete()
        .eq('pipeline_id', CLIENTES_ATIVOS_PIPELINE_ID);
    }

    // Insert new stages
    const { data: newStages, error } = await supabase
      .from('csm_stages')
      .insert(
        DEFAULT_STAGES.map(s => ({
          pipeline_id: CLIENTES_ATIVOS_PIPELINE_ID,
          name: s.name,
          color: s.color,
          position: s.position,
          is_active: true,
        }))
      )
      .select();

    if (error) throw error;

    // Move any orphaned cards to the first stage
    if (newStages && newStages.length > 0) {
      const firstStageId = newStages[0].id;
      await supabase
        .from('csm_cards')
        .update({ stage_id: firstStageId })
        .eq('pipeline_id', CLIENTES_ATIVOS_PIPELINE_ID)
        .not('stage_id', 'in', `(${newStages.map(s => s.id).join(',')})`);
    }

    return true;
  } catch (err) {
    console.error('Erro ao configurar etapas:', err);
    return false;
  }
}
