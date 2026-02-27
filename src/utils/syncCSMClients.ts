import { supabase } from '@/integrations/supabase/client';

// Lista de clientes atualizada conforme fornecida
const clientesAtualizados = [
  { nome: 'Cotafácil', plano: 'Pro', categoria: 'MRR recorrente', mrr: 5800 },
  { nome: 'Gemba Group', plano: 'Pro', categoria: 'MRR recorrente', mrr: 3600 },
  { nome: 'In Shape', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4900 },
  { nome: 'Secureway', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4900 },
  { nome: 'Versátil Banheiras', plano: 'Business', categoria: 'MRR recorrente', mrr: 4900 },
  { nome: 'Oslo Group', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4300 },
  { nome: 'Interlink', plano: 'Business', categoria: 'MRR recorrente', mrr: 4000 },
  { nome: 'Rede Focoh', plano: 'Business', categoria: 'MRR recorrente', mrr: 3500 },
  { nome: 'Sul Solar', plano: 'Business', categoria: 'MRR recorrente', mrr: 3500 },
  { nome: 'CCR Contabilidade', plano: 'Pro', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: '8 Milimetros', plano: 'Business', categoria: 'MRR recorrente', mrr: 2800 },
  { nome: 'Face Doctor', plano: 'Conceito', categoria: 'MRR recorrente', mrr: 4900 },
  { nome: 'Plugg.to', plano: 'Business', categoria: 'MRR recorrente', mrr: 2450 },
  { nome: 'Linx', plano: 'Business', categoria: 'MRR recorrente', mrr: 2450 },
  { nome: 'Café da Fazenda', plano: 'Business', categoria: 'MRR recorrente', mrr: 4900 },
  { nome: 'Explorer', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4000 },
  { nome: 'Neo', plano: 'Pro', categoria: 'MRR Vendido', mrr: 4000 },
  { nome: 'Vital', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4000 },
  { nome: 'Agrosystem', plano: 'Business', categoria: 'MRR recorrente', mrr: 3500 },
  { nome: 'LB3', plano: 'Business', categoria: 'MRR recorrente', mrr: 3500 },
  { nome: 'Amanticia', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'Norte Gás', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'BELAFER', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'Saúde Work', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'FMP', plano: 'Conceito', categoria: 'MRR recorrente', mrr: 13556.07 },
  { nome: 'Unigama', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4200 },
  { nome: 'Baterias PontoCom', plano: 'Pro', categoria: 'MRR Vendido', mrr: 4500 },
  { nome: 'Q! Donuts', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'Nika Imoveis', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'Thiber', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'ONTIME', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4900 },
  { nome: 'Ackno', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'Lucab', plano: 'Business', categoria: 'MRR recorrente', mrr: 3490 },
  { nome: 'ETCR', plano: 'Conceito', categoria: 'MRR recorrente', mrr: 4900 },
  { nome: 'Itiban', plano: 'Conceito', categoria: 'MRR recorrente', mrr: 10880 },
  { nome: 'Clinica NeuroHope', plano: 'Pro', categoria: 'MRR recorrente', mrr: 3600 },
  { nome: 'Apolo Algodão ', plano: 'Pro', categoria: 'MRR recorrente', mrr: 5400 },
  { nome: 'Pita Machado', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4900 },
  { nome: 'Esher Bank', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4000 },
  { nome: 'Connect', plano: 'Pro', categoria: 'MRR recorrente', mrr: 3500 },
  { nome: 'Preditiva', plano: 'Business', categoria: 'MRR recorrente', mrr: 3500 },
  { nome: 'Clor Up', plano: 'Business', categoria: 'MRR recorrente', mrr: 1400 },
  { nome: 'Brasil Fiber Lazer', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'Cantral de Espelhos', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'Mazola', plano: 'Business', categoria: 'MRR recorrente', mrr: 2916 },
  { nome: 'Iget Easy Market', plano: 'Business', categoria: 'MRR recorrente', mrr: 2500 },
  { nome: 'Aquiraz Investimentos', plano: 'Social', categoria: 'MRR recorrente', mrr: 2000 },
  { nome: 'MK Fisioterapia', plano: 'Starter', categoria: 'MRR recorrente', mrr: 0 },
  { nome: 'Aluga aí', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'Italia no box', plano: 'Business', categoria: 'MRR recorrente', mrr: 3000 },
  { nome: 'Grupo Uniftec', plano: 'Conceito', categoria: 'MRR recorrente', mrr: 19810 },
  { nome: 'Ak Auto Center', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4000 },
  { nome: 'Prime Doctor', plano: 'Business', categoria: 'MRR recorrente', mrr: 2500 },
  { nome: 'BOX Car', plano: 'Pro', categoria: 'MRR recorrente', mrr: 4000 },
  { nome: 'CA Inglês', plano: 'Pro', categoria: 'MRR recorrente', mrr: 3666 },
  { nome: 'Rodomavi', plano: 'Business', categoria: 'MRR Vendido', mrr: 3500 },
  { nome: 'HULI Corretora', plano: 'Business', categoria: 'MRR Vendido', mrr: 3000 },
];

// ID do pipeline de clientes ativos
const PIPELINE_CLIENTES_ATIVOS = '1242a985-2f74-4b4a-bc0e-c045a3951d65';
const STAGE_ONBOARDING = '94f3f6c9-4a58-433a-a3cc-42a38515263e';

export async function syncCSMClients() {
  try {
    console.log('🔄 Iniciando sincronização de clientes CSM...');
    
    // 1. Buscar todos os clientes atuais do pipeline
    const { data: clientesExistentes, error: fetchError } = await supabase
      .from('crm_cards')
      .select('id, company_name, title, plano, categoria, monthly_revenue')
      .eq('pipeline_id', PIPELINE_CLIENTES_ATIVOS);

    if (fetchError) {
      console.error('❌ Erro ao buscar clientes:', fetchError);
      return { success: false, error: fetchError };
    }

    console.log(`📊 Encontrados ${clientesExistentes?.length || 0} clientes no sistema`);

    const results = {
      atualizados: 0,
      adicionados: 0,
      removidos: 0,
      erros: [] as string[],
    };

    // 2. Criar um mapa de clientes existentes
    const mapExistentes = new Map(
      clientesExistentes?.map(c => [
        (c.company_name || c.title || '').trim().toLowerCase(), 
        c
      ]) || []
    );

    // 3. Processar cada cliente da lista atualizada
    for (const clienteAtualizado of clientesAtualizados) {
      const nomeNormalizado = clienteAtualizado.nome.trim().toLowerCase();
      const clienteExistente = mapExistentes.get(nomeNormalizado);

      if (clienteExistente) {
        // Cliente existe - verificar se precisa atualizar
        const precisaAtualizar = 
          clienteExistente.plano !== clienteAtualizado.plano ||
          clienteExistente.categoria !== clienteAtualizado.categoria ||
          Number(clienteExistente.monthly_revenue) !== clienteAtualizado.mrr;

        if (precisaAtualizar) {
          const { error: updateError } = await supabase
            .from('crm_cards')
            .update({
              plano: clienteAtualizado.plano,
              categoria: clienteAtualizado.categoria,
              monthly_revenue: clienteAtualizado.mrr,
              updated_at: new Date().toISOString(),
            })
            .eq('id', clienteExistente.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar ${clienteAtualizado.nome}:`, updateError);
            results.erros.push(`Atualizar ${clienteAtualizado.nome}: ${updateError.message}`);
          } else {
            console.log(`✅ Atualizado: ${clienteAtualizado.nome}`);
            results.atualizados++;
          }
        }

        // Marcar como processado
        mapExistentes.delete(nomeNormalizado);
      } else {
        // Cliente não existe - adicionar
        const { data: userData } = await supabase.auth.getUser();
        
        if (!userData?.user) {
          results.erros.push(`Adicionar ${clienteAtualizado.nome}: Usuário não autenticado`);
          continue;
        }

        const { error: insertError } = await supabase
          .from('crm_cards')
          .insert({
            title: clienteAtualizado.nome,
            company_name: clienteAtualizado.nome,
            plano: clienteAtualizado.plano,
            categoria: clienteAtualizado.categoria,
            monthly_revenue: clienteAtualizado.mrr,
            pipeline_id: PIPELINE_CLIENTES_ATIVOS,
            stage_id: STAGE_ONBOARDING,
            created_by: userData.user.id,
            position: 0,
          });

        if (insertError) {
          console.error(`❌ Erro ao adicionar ${clienteAtualizado.nome}:`, insertError);
          results.erros.push(`Adicionar ${clienteAtualizado.nome}: ${insertError.message}`);
        } else {
          console.log(`➕ Adicionado: ${clienteAtualizado.nome}`);
          results.adicionados++;
        }
      }
    }

    // 4. Remover clientes que não estão mais na lista
    // Filtrar apenas clientes de teste ou inválidos
    const clientesParaRemover = Array.from(mapExistentes.values()).filter(c => {
      const nome = (c.company_name || c.title || '').toLowerCase();
      return nome.includes('teste') || 
             nome === 'dot' || 
             nome === 'consultoria empresarial' ||
             nome === 'marketing digital pro' ||
             nome === 'tech solutions' ||
             nome === 'seprovisa' ||
             nome === 'ton' ||
             nome === 'id3 brindes' ||
             nome === 'amantícia' || // duplicado
             nome === 'vdsvdsv' ||
             !nome; // sem nome
    });

    for (const cliente of clientesParaRemover) {
      const { error: deleteError } = await supabase
        .from('crm_cards')
        .delete()
        .eq('id', cliente.id);

      if (deleteError) {
        console.error(`❌ Erro ao remover ${cliente.company_name || cliente.title}:`, deleteError);
        results.erros.push(`Remover ${cliente.company_name || cliente.title}: ${deleteError.message}`);
      } else {
        console.log(`🗑️ Removido: ${cliente.company_name || cliente.title}`);
        results.removidos++;
      }
    }

    console.log('✨ Sincronização concluída!');
    console.log(`📈 Resumo: ${results.adicionados} adicionados, ${results.atualizados} atualizados, ${results.removidos} removidos`);
    
    if (results.erros.length > 0) {
      console.warn(`⚠️ ${results.erros.length} erros encontrados:`, results.erros);
    }

    return { success: true, results };
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return { success: false, error };
  }
}
