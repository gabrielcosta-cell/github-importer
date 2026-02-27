import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/external-client";
import { Paperclip, Trash2, Upload, ChevronDown, Save, Loader2, FileText, Link, Video, MessageSquare } from "lucide-react";

interface Attachment {
  id: string;
  request_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  attachment_type: string;
  created_at: string;
}

interface CardDetailsEditableSectionsProps {
  requestId: string;
  currentStage: string;
  financialAnalysis: string | null;
  googleMeetLink: string | null;
  meetroxLink: string | null;
  meetingNotes: string | null;
  onFieldSaved: (field: string, value: string) => void;
  userId?: string;
}

const ATTACHMENT_TYPES = [
  { value: 'contrato', label: 'Contrato do Cliente' },
  { value: 'solicitacao_briefing', label: 'Print Solicitação de Briefing' },
  { value: 'briefing_churn', label: 'Documento de Briefing de Churn' },
  { value: 'outro', label: 'Outro' },
];

// Mapeamento de etapas para o tipo de anexo exigido
const STAGE_ATTACHMENT_REQUIREMENTS: Record<string, { type: string; label: string } | null> = {
  'nova': null, // Sem anexo exigido
  'triagem': { type: 'contrato', label: 'Contrato do Cliente' }, // Para próxima etapa
  'aguardando_briefings': { type: 'solicitacao_briefing', label: 'Print Solicitação de Briefing' },
  'analise_briefings': { type: 'briefing_churn', label: 'Documento de Briefing de Churn' },
  'call_agendada': null, // Sem anexo adicional (já subiu briefing)
  'call_realizada': null, // Sem anexo exigido
};

export function CardDetailsEditableSections({
  requestId,
  currentStage,
  financialAnalysis,
  googleMeetLink,
  meetroxLink,
  meetingNotes,
  onFieldSaved,
  userId,
}: CardDetailsEditableSectionsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determinar o tipo de anexo baseado na etapa atual
  const requiredAttachment = STAGE_ATTACHMENT_REQUIREMENTS[currentStage];

  // Local editing states
  const [editingFinancialAnalysis, setEditingFinancialAnalysis] = useState(financialAnalysis || "");
  const [editingGoogleMeetLink, setEditingGoogleMeetLink] = useState(googleMeetLink || "");
  const [editingMeetroxLink, setEditingMeetroxLink] = useState(meetroxLink || "");
  const [editingMeetingNotes, setEditingMeetingNotes] = useState(meetingNotes || "");

  // Saving states
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [savingGoogleMeet, setSavingGoogleMeet] = useState(false);
  const [savingMeetrox, setSavingMeetrox] = useState(false);
  const [savingMeetingNotes, setSavingMeetingNotes] = useState(false);

  // Attachments states
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(true);

  // Determinar quais seções devem estar abertas baseado na etapa
  // Triagem: precisa de contrato + análise financeira
  // Aguardando Briefings: precisa de print solicitação de briefing
  // Análise de Briefings: precisa de briefing churn + google meet
  // Call Agendada: precisa de meetrox + observações da reunião
  // Call Realizada: apenas resultado final
  const shouldAttachmentsBeOpen = ['triagem', 'aguardando_briefings', 'analise_briefings'].includes(currentStage);
  const shouldFinancialBeOpen = currentStage === 'triagem';
  const shouldLinksBeOpen = ['analise_briefings', 'call_agendada'].includes(currentStage);
  const shouldMeetingNotesBeOpen = ['call_agendada', 'call_realizada'].includes(currentStage);

  // Collapsible states - inicializam baseados na etapa
  const [attachmentsOpen, setAttachmentsOpen] = useState(shouldAttachmentsBeOpen);
  const [financialOpen, setFinancialOpen] = useState(shouldFinancialBeOpen);
  const [linksOpen, setLinksOpen] = useState(shouldLinksBeOpen);
  const [meetingNotesOpen, setMeetingNotesOpen] = useState(shouldMeetingNotesBeOpen);

  // Atualizar estados quando a etapa mudar
  useEffect(() => {
    setAttachmentsOpen(['triagem', 'aguardando_briefings', 'analise_briefings'].includes(currentStage));
    setFinancialOpen(currentStage === 'triagem');
    setLinksOpen(['analise_briefings', 'call_agendada'].includes(currentStage));
    setMeetingNotesOpen(['call_agendada', 'call_realizada'].includes(currentStage));
  }, [currentStage]);

  // Sync props to local state when they change
  useEffect(() => {
    setEditingFinancialAnalysis(financialAnalysis || "");
    setEditingGoogleMeetLink(googleMeetLink || "");
    setEditingMeetroxLink(meetroxLink || "");
    setEditingMeetingNotes(meetingNotes || "");
  }, [financialAnalysis, googleMeetLink, meetroxLink, meetingNotes]);

  // Fetch attachments
  useEffect(() => {
    const fetchAttachments = async () => {
      setLoadingAttachments(true);
      try {
        const { data, error } = await supabase
          .from('cancellation_attachments')
          .select('*')
          .eq('request_id', requestId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAttachments(data || []);
      } catch (error) {
        console.error('Erro ao buscar anexos:', error);
      } finally {
        setLoadingAttachments(false);
      }
    };

    fetchAttachments();
  }, [requestId]);

  const handleSaveField = async (field: string, value: string, setSaving: (v: boolean) => void) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('cancellation_requests')
        .update({
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      onFieldSaved(field, value);
      toast({ title: "Campo salvo com sucesso!" });
    } catch (error) {
      console.error('Erro ao salvar campo:', error);
      toast({ title: "Erro ao salvar campo", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAttachment = async (file: File, attachmentType: string) => {
    setIsUploadingAttachment(true);
    try {
      const filePath = `${requestId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('cancellation-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('cancellation_attachments')
        .insert({
          request_id: requestId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          attachment_type: attachmentType,
          uploaded_by: userId,
        });

      if (insertError) throw insertError;

      // Refresh attachments
      const { data } = await supabase
        .from('cancellation_attachments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      setAttachments(data || []);
      toast({ title: "Anexo enviado com sucesso!" });
    } catch (error) {
      console.error('Erro ao enviar anexo:', error);
      toast({ title: "Erro ao enviar anexo", variant: "destructive" });
    } finally {
      setIsUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    try {
      // Delete from storage
      await supabase.storage
        .from('cancellation-attachments')
        .remove([attachment.file_path]);

      // Delete from database
      const { error } = await supabase
        .from('cancellation_attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;

      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
      toast({ title: "Anexo removido com sucesso!" });
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      toast({ title: "Erro ao remover anexo", variant: "destructive" });
    }
  };

  const handleViewAttachment = async (attachment: Attachment) => {
    try {
      const { data } = await supabase.storage
        .from('cancellation-attachments')
        .getPublicUrl(attachment.file_path);

      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    } catch (error) {
      console.error('Erro ao abrir anexo:', error);
      toast({ title: "Erro ao abrir anexo", variant: "destructive" });
    }
  };

  const getAttachmentTypeLabel = (type: string) => {
    return ATTACHMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {/* Seção de Anexos */}
      <Collapsible open={attachmentsOpen} onOpenChange={setAttachmentsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            <span className="text-sm font-medium">Anexos</span>
            <Badge variant="secondary" className="text-xs">
              {attachments.length}
            </Badge>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${attachmentsOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          {/* Lista de anexos */}
          {loadingAttachments ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-2 bg-background border rounded-md"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <button
                        onClick={() => handleViewAttachment(attachment)}
                        className="text-sm font-medium truncate hover:underline text-left block max-w-full"
                      >
                        {attachment.file_name}
                      </button>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getAttachmentTypeLabel(attachment.attachment_type)}
                        </Badge>
                        <span>{formatFileSize(attachment.file_size)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteAttachment(attachment)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum anexo adicionado
            </p>
          )}

          {/* Upload de novo anexo - tipo fixo baseado na etapa */}
          {requiredAttachment ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md border">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{requiredAttachment.label}</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadAttachment(file, requiredAttachment.type);
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment}
                className="flex items-center gap-2"
              >
                {isUploadingAttachment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Adicionar Anexo
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum anexo é exigido nesta etapa
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Seção de Análise Financeira */}
      <Collapsible open={financialOpen} onOpenChange={setFinancialOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Análise Financeira</span>
            {financialAnalysis && (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                Preenchido
              </Badge>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${financialOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          <Textarea
            value={editingFinancialAnalysis}
            onChange={(e) => setEditingFinancialAnalysis(e.target.value)}
            placeholder="Descreva a análise financeira do cliente..."
            rows={4}
          />
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSaveField('financial_analysis', editingFinancialAnalysis, setSavingFinancial)}
              disabled={savingFinancial}
            >
              {savingFinancial ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Seção de Links */}
      <Collapsible open={linksOpen} onOpenChange={setLinksOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            <span className="text-sm font-medium">Links</span>
            {(googleMeetLink || meetroxLink) && (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                {[googleMeetLink, meetroxLink].filter(Boolean).length} link(s)
              </Badge>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${linksOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3">
          {/* Google Meet Link */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Video className="w-3 h-3" />
              Google Meet
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="url"
                value={editingGoogleMeetLink}
                onChange={(e) => setEditingGoogleMeetLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSaveField('google_meet_link', editingGoogleMeetLink, setSavingGoogleMeet)}
                disabled={savingGoogleMeet}
              >
                {savingGoogleMeet ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Meetrox Link */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Video className="w-3 h-3" />
              Meetrox (Gravação)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="url"
                value={editingMeetroxLink}
                onChange={(e) => setEditingMeetroxLink(e.target.value)}
                placeholder="https://meetrox.com/..."
                className="flex-1"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSaveField('meetrox_link', editingMeetroxLink, setSavingMeetrox)}
                disabled={savingMeetrox}
              >
                {savingMeetrox ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Seção de Observações da Reunião */}
      <Collapsible open={meetingNotesOpen} onOpenChange={setMeetingNotesOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">Observações da Reunião</span>
            {meetingNotes && (
              <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                Preenchido
              </Badge>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${meetingNotesOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          <Textarea
            value={editingMeetingNotes}
            onChange={(e) => setEditingMeetingNotes(e.target.value)}
            placeholder="Adicione observações sobre a reunião realizada..."
            rows={4}
          />
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSaveField('meeting_notes', editingMeetingNotes, setSavingMeetingNotes)}
              disabled={savingMeetingNotes}
            >
              {savingMeetingNotes ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
