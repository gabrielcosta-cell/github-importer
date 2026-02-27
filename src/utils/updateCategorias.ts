import { supabase } from "@/integrations/supabase/external-client";

export const updateClientCategories = async () => {
  const mrrVendidoClients = [
    'Neo',
    'CENTROMINAS',
    'Baterias PontoCom',
    'Paragon',
    'JBLOG',
    'Rodomavi',
    'HULI Corretora'
  ];

  try {
    console.log('Iniciando atualização de categorias...');

    // Primeiro, buscar todos os IDs dos clientes MRR Vendido
    const { data: vendidoCards, error: fetchError } = await supabase
      .from('crm_cards')
      .select('id, company_name, title')
      .or(
        mrrVendidoClients
          .map(name => `company_name.ilike.%${name}%,title.ilike.%${name}%`)
          .join(',')
      );

    if (fetchError) {
      console.error('Erro ao buscar clientes MRR Vendido:', fetchError);
      throw fetchError;
    }

    console.log(`Encontrados ${vendidoCards?.length || 0} clientes para MRR Vendido:`, vendidoCards);

    // Atualizar clientes específicos para MRR Vendido
    if (vendidoCards && vendidoCards.length > 0) {
      const vendidoIds = vendidoCards.map(card => card.id);
      
      const { error: vendidoError } = await supabase
        .from('crm_cards')
        .update({ categoria: 'MRR Vendido' })
        .in('id', vendidoIds);

      if (vendidoError) {
        console.error('Erro ao atualizar MRR Vendido:', vendidoError);
        throw vendidoError;
      }
      
      console.log(`✓ ${vendidoCards.length} clientes atualizados para MRR Vendido`);
    }

    // Buscar TODOS os outros clientes (independente da categoria atual)
    const { data: allCards, error: allFetchError } = await supabase
      .from('crm_cards')
      .select('id');

    if (allFetchError) {
      console.error('Erro ao buscar todos os clientes:', allFetchError);
      throw allFetchError;
    }

    // Filtrar apenas os IDs que NÃO são MRR Vendido
    const vendidoIds = vendidoCards?.map(card => card.id) || [];
    const recorrenteCards = allCards?.filter(card => !vendidoIds.includes(card.id));

    console.log(`Encontrados ${recorrenteCards?.length || 0} clientes para MRR Recorrente`);

    // Atualizar todos os outros para MRR Recorrente
    if (recorrenteCards && recorrenteCards.length > 0) {
      const recorrenteIds = recorrenteCards.map(card => card.id);
      
      const { error: recorrenteError } = await supabase
        .from('crm_cards')
        .update({ categoria: 'MRR Recorrente' })
        .in('id', recorrenteIds);

      if (recorrenteError) {
        console.error('Erro ao atualizar MRR Recorrente:', recorrenteError);
        throw recorrenteError;
      }

      console.log(`✓ ${recorrenteCards.length} clientes atualizados para MRR Recorrente`);
    }

    console.log('✓ Categorias atualizadas com sucesso!');
    return { success: true };
  } catch (error) {
    console.error('✗ Erro ao atualizar categorias:', error);
    return { success: false, error };
  }
};

// Corrigir categoria do CCR Contabilidade
export const fixCCRContabilidadeCategory = async () => {
  try {
    const { error } = await supabase
      .from('crm_cards')
      .update({ categoria: 'MRR recorrente' })
      .eq('id', '17220054-a5e1-4d53-b57e-2c5bf1e6c204');

    if (error) {
      console.error('Erro ao corrigir categoria:', error);
      return { success: false, error };
    }

    console.log('✓ Categoria de CCR Contabilidade corrigida para MRR recorrente');
    return { success: true };
  } catch (error) {
    console.error('Erro:', error);
    return { success: false, error };
  }
};

// Auto-executar quando importado
if (typeof window !== 'undefined') {
  (window as any).updateClientCategories = updateClientCategories;
  (window as any).fixCCRContabilidadeCategory = fixCCRContabilidadeCategory;
  console.log('Funções disponíveis no console:');
  console.log('- updateClientCategories()');
  console.log('- fixCCRContabilidadeCategory()');
}
