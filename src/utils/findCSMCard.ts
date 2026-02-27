import { supabase } from '@/integrations/supabase/client';

interface CSMCardMatch {
  cardId: string;
  stageId: string;
  companyName: string | null;
  contactName: string | null;
}

/**
 * Busca um card do CSM que corresponda ao email, nome da empresa, nome do responsável ou CNPJ
 * Prioriza correspondência por CNPJ, depois email, depois nome da empresa
 */
export async function findCSMCard(
  email: string,
  companyName: string,
  responsibleName: string,
  cnpj?: string | null
): Promise<CSMCardMatch | null> {
  const emailToSearch = email.trim().toLowerCase();
  const companyToSearch = companyName.trim().toLowerCase();
  const nameToSearch = responsibleName.trim().toLowerCase();
  const cnpjToSearch = cnpj?.replace(/\D/g, '') || null;

  try {
    // 0. Primeiro buscar pelo CNPJ (prioridade máxima)
    if (cnpjToSearch && cnpjToSearch.length >= 11) {
      const { data: cardsByCnpj } = await supabase
        .from('csm_cards')
        .select('id, stage_id, company_name, contact_name, pipeline_id, cnpj')
        .not('cnpj', 'is', null)
        .limit(100);

      if (cardsByCnpj && cardsByCnpj.length > 0) {
        const matchingCard = cardsByCnpj.find(card => {
          const cardCnpj = card.cnpj?.replace(/\D/g, '') || '';
          return cardCnpj === cnpjToSearch;
        });

        if (matchingCard) {
          const { data: pipeline } = await supabase
            .from('csm_pipelines')
            .select('name')
            .eq('id', matchingCard.pipeline_id)
            .maybeSingle();

          if (pipeline?.name === 'Clientes ativos' || pipeline?.name?.includes('CSM')) {
            return {
              cardId: matchingCard.id,
              stageId: matchingCard.stage_id,
              companyName: matchingCard.company_name,
              contactName: matchingCard.contact_name,
            };
          }
        }
      }
    }

    // 1. Buscar pelo email de contato principal
    const { data: cardsByContactEmail } = await supabase
      .from('csm_cards')
      .select('id, stage_id, company_name, contact_name, pipeline_id')
      .eq('contact_email', emailToSearch)
      .limit(1);

    if (cardsByContactEmail && cardsByContactEmail.length > 0) {
      const card = cardsByContactEmail[0];
      const { data: pipeline } = await supabase
        .from('csm_pipelines')
        .select('name')
        .eq('id', card.pipeline_id)
        .maybeSingle();

      if (pipeline?.name === 'Clientes ativos' || pipeline?.name?.includes('CSM')) {
        return { cardId: card.id, stageId: card.stage_id, companyName: card.company_name, contactName: card.contact_name };
      }
    }

    // 2. Buscar na tabela de emails múltiplos
    const { data: cardsByEmail } = await supabase
      .from('csm_card_emails')
      .select('card_id, csm_cards!inner(id, stage_id, company_name, contact_name, pipeline_id)')
      .eq('email', emailToSearch)
      .limit(1);

    if (cardsByEmail && cardsByEmail.length > 0) {
      const cardData = cardsByEmail[0].csm_cards as any;
      const { data: pipeline } = await supabase
        .from('csm_pipelines')
        .select('name')
        .eq('id', cardData.pipeline_id)
        .maybeSingle();

      if (pipeline?.name === 'Clientes ativos' || pipeline?.name?.includes('CSM')) {
        return { cardId: cardData.id, stageId: cardData.stage_id, companyName: cardData.company_name, contactName: cardData.contact_name };
      }
    }

    // 3. Buscar pelo nome da empresa (case insensitive)
    const { data: cardsByCompany } = await supabase
      .from('csm_cards')
      .select('id, stage_id, company_name, contact_name, pipeline_id')
      .or(`company_name.ilike.%${companyToSearch}%,title.ilike.%${companyToSearch}%`)
      .limit(5);

    if (cardsByCompany && cardsByCompany.length > 0) {
      for (const card of cardsByCompany) {
        const { data: pipeline } = await supabase
          .from('csm_pipelines')
          .select('name')
          .eq('id', card.pipeline_id)
          .maybeSingle();

        if (pipeline?.name === 'Clientes ativos' || pipeline?.name?.includes('CSM')) {
          return { cardId: card.id, stageId: card.stage_id, companyName: card.company_name, contactName: card.contact_name };
        }
      }
    }

    // 4. Buscar pelo nome do contato
    const { data: cardsByContact } = await supabase
      .from('csm_cards')
      .select('id, stage_id, company_name, contact_name, pipeline_id')
      .ilike('contact_name', `%${nameToSearch}%`)
      .limit(5);

    if (cardsByContact && cardsByContact.length > 0) {
      for (const card of cardsByContact) {
        const { data: pipeline } = await supabase
          .from('csm_pipelines')
          .select('name')
          .eq('id', card.pipeline_id)
          .maybeSingle();

        if (pipeline?.name === 'Clientes ativos' || pipeline?.name?.includes('CSM')) {
          return { cardId: card.id, stageId: card.stage_id, companyName: card.company_name, contactName: card.contact_name };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao buscar card do CSM:', error);
    return null;
  }
}

/**
 * Registra no histórico do card que um formulário foi preenchido
 */
export async function recordFormSubmissionInHistory(
  cardId: string,
  stageId: string,
  formType: 'CSAT' | 'NPS' | 'Cancelamento',
  responsibleName: string,
  email: string
): Promise<void> {
  try {
    await supabase
      .from('csm_card_stage_history')
      .insert({
        card_id: cardId,
        stage_id: stageId,
        event_type: 'note',
        notes: `📋 Formulário de ${formType} preenchido por ${responsibleName} (${email})`,
      });
  } catch (error) {
    console.error('Erro ao registrar formulário no histórico:', error);
  }
}
