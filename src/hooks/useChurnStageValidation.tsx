import { StageRequirement } from "@/components/cancellation/StageRequirementsDialog";

export type ChurnStage = 
  | 'nova' 
  | 'triagem' 
  | 'aguardando_briefings' 
  | 'analise_briefings' 
  | 'call_agendada' 
  | 'call_realizada';

type CancellationRequest = {
  id: string;
  card_id?: string | null;
  squad?: string | null;
  contract_name?: string | null;
  financial_analysis?: string | null;
  google_meet_link?: string | null;
  meetrox_link?: string | null;
  meeting_notes?: string | null;
  observations?: string | null;
  stage?: string | null;
  final_result?: string | null;
};

type Attachment = {
  attachment_type: string;
  file_name: string;
};

export function useChurnStageValidation() {
  
  const getRequirementsForStage = (
    targetStage: ChurnStage,
    request: CancellationRequest,
    attachments: Attachment[]
  ): { valid: boolean; requirements: StageRequirement[]; missingFields: string[] } => {
    
    const missingFields: string[] = [];
    const requirements: StageRequirement[] = [];

    switch (targetStage) {
      case 'triagem': {
        // Precisa estar vinculado ao card do CSM e squad
        if (!request.card_id) {
          missingFields.push('Vínculo com Card CSM');
        }
        if (!request.squad) {
          missingFields.push('Squad');
        }
        // These are handled by LinkCardDialog, so we don't add form requirements here
        break;
      }

      case 'aguardando_briefings': {
        // Precisa ter contrato anexado + análise financeira
        const hasContract = attachments.some(a => a.attachment_type === 'contrato');
        if (!hasContract) {
          requirements.push({
            field: 'contrato_file',
            label: 'Contrato do Cliente',
            type: 'file',
            required: true,
            fileType: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
          });
          missingFields.push('Contrato do Cliente');
        }
        
        if (!request.financial_analysis?.trim()) {
          requirements.push({
            field: 'financial_analysis',
            label: 'Análise Financeira (em caso de distrato)',
            type: 'textarea',
            required: true,
            placeholder: 'Descreva a análise financeira do cliente...',
          });
          missingFields.push('Análise Financeira');
        }
        break;
      }

      case 'analise_briefings': {
        // Precisa ter print da solicitação de briefing
        const hasBriefingRequest = attachments.some(a => 
          a.attachment_type === 'briefing_request' || 
          a.attachment_type === 'solicitacao_briefing'
        );
        if (!hasBriefingRequest) {
          requirements.push({
            field: 'briefing_request_file',
            label: 'Print da Solicitação de Briefing',
            type: 'file',
            required: true,
            fileType: '.jpg,.jpeg,.png,.pdf',
          });
          missingFields.push('Print da Solicitação de Briefing');
        }
        break;
      }

      case 'call_agendada': {
        // Precisa ter documento de briefing de churn + link do Google Meet
        const hasChurnBriefing = attachments.some(a => 
          a.attachment_type === 'churn_briefing' || 
          a.attachment_type === 'briefing_churn'
        );
        if (!hasChurnBriefing) {
          requirements.push({
            field: 'churn_briefing_file',
            label: 'Documento de Briefing de Churn',
            type: 'file',
            required: true,
            fileType: '.pdf,.doc,.docx,.jpg,.jpeg,.png',
          });
          missingFields.push('Documento de Briefing de Churn');
        }
        
        if (!request.google_meet_link?.trim()) {
          requirements.push({
            field: 'google_meet_link',
            label: 'Link do Google Meet',
            type: 'url',
            required: true,
            placeholder: 'https://meet.google.com/...',
          });
          missingFields.push('Link do Google Meet');
        }
        break;
      }

      case 'call_realizada': {
        // Precisa do link do Meetrox + observações da reunião
        if (!request.meetrox_link?.trim()) {
          requirements.push({
            field: 'meetrox_link',
            label: 'Link da Gravação (Meetrox)',
            type: 'url',
            required: true,
            placeholder: 'https://meetrox.com/...',
          });
          missingFields.push('Link da Gravação Meetrox');
        }
        
        if (!request.meeting_notes?.trim()) {
          requirements.push({
            field: 'meeting_notes',
            label: 'Observações da Reunião',
            type: 'textarea',
            required: true,
            placeholder: 'Descreva os principais pontos discutidos na reunião...',
          });
          missingFields.push('Observações da Reunião');
        }
        break;
      }

      default:
        break;
    }

    return {
      valid: missingFields.length === 0,
      requirements,
      missingFields,
    };
  };

  const canMoveToStage = (
    fromStage: ChurnStage,
    toStage: ChurnStage,
    request: CancellationRequest,
    attachments: Attachment[]
  ): { allowed: boolean; reason?: string } => {
    
    const stageOrder: ChurnStage[] = [
      'nova',
      'triagem', 
      'aguardando_briefings',
      'analise_briefings',
      'call_agendada',
      'call_realizada',
    ];

    const fromIndex = stageOrder.indexOf(fromStage);
    const toIndex = stageOrder.indexOf(toStage);

    // Can always move backwards
    if (toIndex < fromIndex) {
      return { allowed: true };
    }

    // Can only move one stage forward at a time
    if (toIndex > fromIndex + 1) {
      return { 
        allowed: false, 
        reason: 'Você só pode avançar uma etapa por vez.',
      };
    }

    // Check stage-specific requirements
    const { valid, missingFields } = getRequirementsForStage(toStage, request, attachments);
    
    if (!valid) {
      return {
        allowed: false,
        reason: `Campos faltando: ${missingFields.join(', ')}`,
      };
    }

    return { allowed: true };
  };

  return {
    getRequirementsForStage,
    canMoveToStage,
  };
}
