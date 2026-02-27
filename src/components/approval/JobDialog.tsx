import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/external-client";
import { Upload, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { ApprovalJob } from "./ApprovalKanban";
import { InstagramPostPreview } from "./InstagramPostPreview";

interface JobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: ApprovalJob;
  onSave?: () => void;
  onClose?: () => void;
}

export function JobDialog({ open, onOpenChange, job, onSave, onClose }: JobDialogProps) {
  const [clientName, setClientName] = useState("");
  const [jobName, setJobName] = useState("");
  const [workflow, setWorkflow] = useState("aprovacao_publicacao");
  const [approvalDeadline, setApprovalDeadline] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeClients, setActiveClients] = useState<string[]>([]);
  const [clientFeedback, setClientFeedback] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setCurrentUser(profile);
      }
    }
    
    async function loadClientFeedback() {
      if (job?.id) {
        const { data } = await supabase
          .from("approval_client_feedback")
          .select("*")
          .eq("job_id", job.id)
          .order("submitted_at", { ascending: false });
        
        if (data) {
          setClientFeedback(data);
        }
      }
    }
    
    async function loadActiveClients() {
      try {
        // Buscar o pipeline "Clientes ativos"
        const { data: pipeline } = await supabase
          .from('crm_pipelines')
          .select('id')
          .eq('name', 'Clientes ativos')
          .eq('is_active', true)
          .single();

        if (!pipeline) return;

        // Buscar todos os cards do pipeline
        const { data: cards } = await supabase
          .from('crm_cards')
          .select('company_name')
          .eq('pipeline_id', pipeline.id);

        if (!cards) return;

        // Buscar clientes na lista especial "perdido"
        const { data: lostClients } = await supabase
          .from('crm_special_lists')
          .select('company_name')
          .eq('list_type', 'perdido');

        const lostClientNames = new Set(lostClients?.map(c => c.company_name) || []);

        // Filtrar clientes ativos que não estão na lista de perdidos
        const activeClientNames = cards
          .map(c => c.company_name)
          .filter((name): name is string => !!name && !lostClientNames.has(name));

        // Remover duplicatas e ordenar
        const uniqueClients = Array.from(new Set(activeClientNames)).sort();
        setActiveClients(uniqueClients);
      } catch (error) {
        console.error('Erro ao carregar clientes ativos:', error);
      }
    }
    
    if (open) {
      loadUser();
      loadActiveClients();
      loadClientFeedback();
    }
  }, [open, job?.id]);

  // Preencher campos quando um job for passado (modo visualização/edição)
  useEffect(() => {
    if (job && open) {
      setClientName(job.client_name || "");
      setJobName(job.title || "");
      setTitle(job.title || "");
      setWorkflow((job as any).workflow || "aprovacao_publicacao");
      setApprovalDeadline((job as any).approval_deadline ? new Date((job as any).approval_deadline).toISOString().split('T')[0] : "");
      setDescription((job as any).description || "");
      setExistingFiles((job as any).attached_files || []);
      setFiles([]);
    } else if (!job && open) {
      // Limpar campos quando criar novo job
      setClientName("");
      setJobName("");
      setWorkflow("aprovacao_publicacao");
      setApprovalDeadline("");
      setTitle("");
      setDescription("");
      setFiles([]);
      setExistingFiles([]);
    }
  }, [job, open]);

  // Resolve preview URLs for existing image files without URL when opening a job
  useEffect(() => {
    async function resolveExistingFileUrls() {
      if (!open || existingFiles.length === 0) return;
      const needResolve = existingFiles.some((f: any) => f && !f.url && f.type?.startsWith('image/'));
      if (!needResolve) return;
      
      try {
        // List all files in the bucket to find matches
        const { data: allFiles, error: listError } = await supabase.storage
          .from('approval-attachments')
          .list('');
        
        if (listError) {
          console.error('Error listing files:', listError);
          return;
        }

        const resolved = existingFiles.map((f: any) => {
          if (!f || f.url || !f.type?.startsWith('image/') || !f.name) return f;
          
          // Try to find file by exact name match
          const foundFile = allFiles?.find(file => file.name.includes(f.name.split('.')[0]));
          
          if (foundFile) {
            const { data: pub } = supabase.storage
              .from('approval-attachments')
              .getPublicUrl(foundFile.name);
            return { ...f, url: pub.publicUrl, path: foundFile.name };
          }
          
          return f;
        });
        
        setExistingFiles(resolved);
      } catch (err) {
        console.warn('Could not resolve existing file URLs', err);
      }
    }
    resolveExistingFileUrls();
  }, [open, job?.id, existingFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validFiles = Array.from(e.target.files).filter(file => {
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        return validTypes.includes(file.type);
      });
      if (validFiles.length !== e.target.files.length) {
        toast({
          title: "Alguns arquivos foram ignorados",
          description: "Apenas PNG, JPEG e Word são aceitos.",
          variant: "destructive",
        });
      }
      setFiles([...files, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!clientName.trim() || !jobName.trim()) {
      toast({
        title: "Erro",
        description: "Cliente e Nome do Job são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Retry logic for getUser to handle temporary network issues
      let user = null;
      let retries = 2;
      while (retries > 0 && !user) {
        try {
          const { data: { user: fetchedUser } } = await supabase.auth.getUser();
          user = fetchedUser;
        } catch (err) {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      if (!user) throw new Error("Não foi possível autenticar. Tente novamente.");

      // Upload files if any
      let uploadedFiles: any[] = [...existingFiles];
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('approval-attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('approval-attachments')
            .getPublicUrl(filePath);

          uploadedFiles.push({
            name: file.name,
            size: file.size,
            type: file.type,
            url: publicUrl,
            path: filePath
          });
        }
      }

      if (job) {
        // Modo edição - atualizar job existente
        const { error: jobError } = await supabase
          .from("approval_jobs")
          .update({
            title: jobName.trim(),
            client_name: clientName.trim(),
            workflow: workflow,
            approval_deadline: approvalDeadline || null,
            description: description.trim() || null,
            attached_files: uploadedFiles,
          })
          .eq("id", job.id);

        if (jobError) throw jobError;

        // Create history entry
        await supabase.from("approval_job_history").insert({
          job_id: job.id,
          action_type: "updated",
          action_description: "Job foi atualizado",
          created_by: user.id,
        });

        toast({
          title: "Job atualizado",
          description: "O job foi atualizado com sucesso.",
        });
      } else {
        // Modo criação - criar novo job
        const { data: jobData, error: jobError } = await supabase
          .from("approval_jobs")
          .insert({
            title: jobName.trim(),
            client_name: clientName.trim(),
            workflow: workflow,
            approval_deadline: approvalDeadline || null,
            description: description.trim() || null,
            attached_files: uploadedFiles,
            status: "rascunho",
            created_by: user.id,
            responsible_user_id: user.id,
          })
          .select()
          .single();

        if (jobError) throw jobError;

        // Create history entry
        await supabase.from("approval_job_history").insert({
          job_id: jobData.id,
          action_type: "created",
          action_description: "Foi cadastrado",
          created_by: user.id,
        });

        toast({
          title: "Job criado",
          description: "O job foi criado com sucesso.",
        });
      }

      // Reset form
      setClientName("");
      setJobName("");
      setWorkflow("aprovacao_publicacao");
      setApprovalDeadline("");
      setTitle("");
      setDescription("");
      setFiles([]);
      
      if (onSave) {
        onSave();
      }
      
      onOpenChange(false);
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error saving job:", error);
      toast({
        title: "Erro ao criar job",
        description: "Não foi possível criar o job.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] overflow-hidden p-0 flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Novo Job</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="grid grid-cols-[280px,1fr] gap-4 p-4">
              {/* Left Sidebar */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Select 
                    value={clientName} 
                    onValueChange={setClientName}
                    disabled={!!job}
                  >
                    <SelectTrigger id="client">
                      <SelectValue placeholder="Selecione um cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeClients.map((client) => (
                        <SelectItem key={client} value={client}>
                          {client}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {job && (
                    <p className="text-xs text-muted-foreground">
                      O cliente não pode ser alterado após a criação do job
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobName">Nome do Job *</Label>
                  <Input
                    id="jobName"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="Digite o nome do job"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workflow">Fluxo</Label>
                  <Select value={workflow} onValueChange={setWorkflow}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aprovacao_publicacao">Aprovação & Publicação</SelectItem>
                      <SelectItem value="apenas_aprovacao">Apenas Aprovação</SelectItem>
                      <SelectItem value="publicacao_direta">Publicação Direta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">Calendário</h3>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline de Aprovação</Label>
                    <div className="relative">
                      <Input
                        id="deadline"
                        type="date"
                        value={approvalDeadline}
                        onChange={(e) => setApprovalDeadline(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold">Histórico</h3>
                  <div className="text-sm space-y-3">
                    {job ? (
                      <>
                        {/* Feedback do Cliente */}
                        {clientFeedback.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="font-medium text-xs text-muted-foreground uppercase">Feedback do Cliente</h4>
                            {clientFeedback.map((feedback) => (
                              <div key={feedback.id} className="border-l-2 border-primary pl-3 space-y-1">
                                <div className="text-xs text-muted-foreground">
                                  {new Date(feedback.submitted_at).toLocaleDateString('pt-BR')} {new Date(feedback.submitted_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="font-medium">
                                  {feedback.client_name}
                                </div>
                                {feedback.approval_status && (
                                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                    feedback.approval_status === 'aprovado' 
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  }`}>
                                    {feedback.approval_status === 'aprovado' ? '✓ Aprovado' : '⚠ Revisão'}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span key={star} className={star <= feedback.rating ? 'text-yellow-400' : 'text-muted-foreground/30'}>
                                      ★
                                    </span>
                                  ))}
                                </div>
                                {feedback.comment && (
                                  <div className="text-sm text-muted-foreground italic">
                                    "{feedback.comment}"
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Histórico de ações */}
                        <div className="pt-2">
                          <div className="text-primary font-medium text-xs">
                            {new Date(job.created_at).toLocaleDateString('pt-BR')} {new Date(job.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-muted-foreground">Cadastrado</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-primary font-medium">
                          {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-muted-foreground">Será cadastrado</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Digite o título"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Digite a descrição"
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Arraste seus arquivos:</Label>
                  
                  {/* Preview estilo Instagram */}
                  {(() => {
                    const imageFiles = [
                      ...existingFiles
                        .filter((f: any) => f?.type?.startsWith('image/'))
                        .map((f: any) => ({ url: f.url, name: f.name })),
                      ...files
                        .filter(f => f.type.startsWith('image/'))
                        .map(f => ({ url: URL.createObjectURL(f), name: f.name }))
                    ];
                    
                    return imageFiles.length > 0 ? (
                      <div className="flex justify-center mb-4">
                        <InstagramPostPreview 
                          images={imageFiles}
                          description={description}
                          clientName={clientName || "Cliente"}
                        />
                      </div>
                    ) : null;
                  })()}
                  
                  {/* Botão de adicionar arquivos */}
                  <div className="border-2 border-dashed rounded-lg text-center hover:border-primary/50 transition-colors p-4">
                    <input
                      type="file"
                      multiple
                      accept=".png,.jpg,.jpeg,.doc,.docx,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-10 h-10 border-2 rounded-lg flex items-center justify-center border-primary/50 hover:bg-primary/5 transition-colors">
                          <Upload className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Adicionar arquivos (PNG, JPEG, Word)
                        </p>
                      </div>
                    </label>
                  </div>
                  
                  {/* Arquivos não-imagem */}
                  {(() => {
                    const docFiles = [
                      ...existingFiles.filter((f: any) => !f?.type?.startsWith('image/')),
                      ...files.filter(f => !f.type.startsWith('image/'))
                    ];
                    
                    return docFiles.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        <Label className="text-xs">Documentos anexados:</Label>
                        {docFiles.map((file: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-lg bg-muted/50">
                            <span className="text-xs truncate flex-1">{file.name}</span>
                            {files.includes(file) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => removeFile(files.indexOf(file))}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="font-semibold">Histórico</span>
                    <ChevronDown className="w-4 h-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="p-4 border-x border-b rounded-b-lg">
                    <p className="text-sm text-muted-foreground">
                      O histórico será preenchido após a criação do job.
                    </p>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <span className="text-xs font-medium">
                  {currentUser?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{currentUser?.name || 'Carregando...'}</span>
              <Badge variant="secondary">RASCUNHO</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
