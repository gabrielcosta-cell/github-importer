import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Zap, Pencil, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Pipeline {
  id: string;
  name: string;
  displayName?: string;
}

interface Automation {
  id: string;
  source_pipeline_id: string;
  trigger_event: 'won' | 'lost';
  target_pipeline_id: string;
  is_active: boolean;
  archive_to?: string | null; // Changed to pipeline ID or 'none'
  require_owner_transfer: boolean;
  target_owner_role: string | null;
}

export function PipelineAutomations() {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAutomation, setNewAutomation] = useState({
    source_pipeline_id: "",
    trigger_event: "" as 'won' | 'lost' | "",
    target_pipeline_id: "",
    archive_to: "none" as string,
    require_owner_transfer: false,
    target_owner_role: null as string | null,
  });
  const [editAutomation, setEditAutomation] = useState({
    source_pipeline_id: "",
    trigger_event: "" as 'won' | 'lost' | "",
    target_pipeline_id: "",
    archive_to: "none" as string,
    require_owner_transfer: false,
    target_owner_role: null as string | null,
  });

  useEffect(() => {
    fetchData();
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    try {
      const { data: customRoles, error: customRolesError } = await supabase
        .from('custom_roles')
        .select('id, display_name, name')
        .eq('is_active', true)
        .order('display_name');

      if (customRolesError) throw customRolesError;

      const baseRoles = [
        { id: 'admin', name: 'Administradores' },
        { id: 'sdr', name: 'SDRs' },
        { id: 'closer', name: 'Closers' },
      ];

      const allRoles = [
        ...baseRoles,
        ...(customRoles || []).map(role => ({
          id: role.id, // Usar o ID do custom_role para a função RPC
          name: role.display_name
        }))
      ];

      setUserRoles(allRoles);
    } catch (error) {
      console.error('Erro ao carregar grupos de usuários:', error);
      toast.error('Erro ao carregar grupos de usuários');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch pipelines
      const { data: pipelinesData, error: pipelinesError } = await supabase
        .from("crm_pipelines")
        .select("id, name")
        .eq("is_active", true)
        .order("position");

      if (pipelinesError) throw pipelinesError;
      
      // Add pipeline type suffix based on name
      const pipelinesWithType = (pipelinesData || []).map(pipeline => ({
        ...pipeline,
        displayName: pipeline.name === "Clientes ativos" || pipeline.name === "Clientes Perdidos" 
          ? `${pipeline.name} | CSM`
          : `${pipeline.name} | CRM`
      }));
      
      setPipelines(pipelinesWithType);

      // Fetch automations
      const { data: automationsData, error: automationsError } = await supabase
        .from("pipeline_automations")
        .select("*")
        .order("created_at", { ascending: false });

      if (automationsError) throw automationsError;
      setAutomations((automationsData as Automation[]) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar automações");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAutomation = async () => {
    if (!newAutomation.source_pipeline_id || !newAutomation.trigger_event || !newAutomation.target_pipeline_id) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (newAutomation.source_pipeline_id === newAutomation.target_pipeline_id) {
      toast.error("O funil de origem e destino não podem ser o mesmo");
      return;
    }

    if (newAutomation.require_owner_transfer && !newAutomation.target_owner_role) {
      toast.error("Selecione o grupo de usuários para transferência");
      return;
    }

    if (newAutomation.archive_to === "none") {
      toast.info("O card será apenas movido, sem criar cópia para Ganhos ou Perdidos");
    }

    try {
      const { error } = await supabase
        .from("pipeline_automations")
        .insert({
          source_pipeline_id: newAutomation.source_pipeline_id,
          trigger_event: newAutomation.trigger_event,
          target_pipeline_id: newAutomation.target_pipeline_id,
          archive_to: newAutomation.archive_to,
          require_owner_transfer: newAutomation.require_owner_transfer,
          target_owner_role: newAutomation.target_owner_role,
          created_by: user?.id,
        });

      if (error) throw error;

      toast.success("Automação criada com sucesso");
      setNewAutomation({
        source_pipeline_id: "",
        trigger_event: "",
        target_pipeline_id: "",
        archive_to: "none",
        require_owner_transfer: false,
        target_owner_role: null,
      });
      fetchData();
    } catch (error) {
      console.error("Error creating automation:", error);
      toast.error("Erro ao criar automação");
    }
  };

  const handleToggleAutomation = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("pipeline_automations")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      toast.success(isActive ? "Automação ativada" : "Automação desativada");
      fetchData();
    } catch (error) {
      console.error("Error toggling automation:", error);
      toast.error("Erro ao atualizar automação");
    }
  };

  const handleDeleteAutomation = async (id: string) => {
    try {
      const { error } = await supabase
        .from("pipeline_automations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Automação excluída");
      fetchData();
    } catch (error) {
      console.error("Error deleting automation:", error);
      toast.error("Erro ao excluir automação");
    }
  };

  const handleStartEdit = (automation: Automation) => {
    setEditingId(automation.id);
    setEditAutomation({
      source_pipeline_id: automation.source_pipeline_id,
      trigger_event: automation.trigger_event,
      target_pipeline_id: automation.target_pipeline_id,
      archive_to: automation.archive_to || "none",
      require_owner_transfer: automation.require_owner_transfer,
      target_owner_role: automation.target_owner_role,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAutomation({
      source_pipeline_id: "",
      trigger_event: "",
      target_pipeline_id: "",
      archive_to: "none",
      require_owner_transfer: false,
      target_owner_role: null,
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editAutomation.source_pipeline_id || !editAutomation.trigger_event || !editAutomation.target_pipeline_id) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (editAutomation.source_pipeline_id === editAutomation.target_pipeline_id) {
      toast.error("O funil de origem e destino não podem ser o mesmo");
      return;
    }

    if (editAutomation.require_owner_transfer && !editAutomation.target_owner_role) {
      toast.error("Selecione o grupo de usuários para transferência");
      return;
    }

    try {
      const { error } = await supabase
        .from("pipeline_automations")
        .update({
          source_pipeline_id: editAutomation.source_pipeline_id,
          trigger_event: editAutomation.trigger_event,
          target_pipeline_id: editAutomation.target_pipeline_id,
          archive_to: editAutomation.archive_to,
          require_owner_transfer: editAutomation.require_owner_transfer,
          target_owner_role: editAutomation.target_owner_role,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Automação atualizada com sucesso");
      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error("Error updating automation:", error);
      toast.error("Erro ao atualizar automação");
    }
  };

  const getPipelineName = (id: string) => {
    const pipeline = pipelines.find((p) => p.id === id);
    return pipeline?.displayName || pipeline?.name || "Funil desconhecido";
  };

  const getTriggerLabel = (trigger: string) => {
    return trigger === "won" ? "Ganho" : "Perdido";
  };

  const getArchiveLabel = (archiveTo?: string | null) => {
    if (!archiveTo || archiveTo === "none") return "Sem cópia";
    // archiveTo is now a pipeline ID, find the pipeline name
    const pipeline = pipelines.find(p => p.id === archiveTo);
    return pipeline?.displayName || pipeline?.name || archiveTo;
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Nova Automação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <Label className="block text-sm">Card marcado como:</Label>
              <Select
                value={newAutomation.trigger_event}
                onValueChange={(value) =>
                  setNewAutomation({ ...newAutomation, trigger_event: value as 'won' | 'lost' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="won">Ganho</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-sm">No funil:</Label>
              <Select
                value={newAutomation.source_pipeline_id}
                onValueChange={(value) =>
                  setNewAutomation({ ...newAutomation, source_pipeline_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funil de origem" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.displayName || pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-sm">Mover para o funil:</Label>
              <Select
                value={newAutomation.target_pipeline_id}
                onValueChange={(value) =>
                  setNewAutomation({ ...newAutomation, target_pipeline_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funil de destino" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.displayName || pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block text-sm">Criar cópia em:</Label>
              <Select
                value={newAutomation.archive_to}
                onValueChange={(value) =>
                  setNewAutomation({ ...newAutomation, archive_to: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione onde copiar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (apenas mover)</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.displayName || pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="require-owner-transfer"
                checked={newAutomation.require_owner_transfer}
                onCheckedChange={(checked) =>
                  setNewAutomation({ 
                    ...newAutomation, 
                    require_owner_transfer: checked as boolean,
                    target_owner_role: checked ? newAutomation.target_owner_role : null
                  })
                }
              />
              <Label htmlFor="require-owner-transfer" className="text-sm font-medium cursor-pointer">
                Transferir propriedade do lead (Opcional)
              </Label>
            </div>
            
            {newAutomation.require_owner_transfer && (
              <div className="space-y-2 mt-2">
                <Label className="text-xs text-muted-foreground">Selecionar novo proprietário do grupo:</Label>
                <Select
                  value={newAutomation.target_owner_role || ''}
                  onValueChange={(value) => 
                    setNewAutomation({ ...newAutomation, target_owner_role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o grupo de usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ao marcar como ganho, será obrigatório selecionar um usuário deste grupo como novo proprietário
                </p>
              </div>
            )}
          </div>

          <Button onClick={handleAddAutomation} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Automação
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automações Configuradas</CardTitle>
        </CardHeader>
        <CardContent>
          {automations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma automação configurada ainda
            </p>
          ) : (
            <div className="space-y-3">
              {automations.map((automation) => (
                <div
                  key={automation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  {editingId === automation.id ? (
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="block text-sm">Card marcado como:</Label>
                          <Select
                            value={editAutomation.trigger_event}
                            onValueChange={(value) =>
                              setEditAutomation({ ...editAutomation, trigger_event: value as 'won' | 'lost' })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="won">Ganho</SelectItem>
                              <SelectItem value="lost">Perdido</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="block text-sm">No funil:</Label>
                          <Select
                            value={editAutomation.source_pipeline_id}
                            onValueChange={(value) =>
                              setEditAutomation({ ...editAutomation, source_pipeline_id: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {pipelines.map((pipeline) => (
                                <SelectItem key={pipeline.id} value={pipeline.id}>
                                  {pipeline.displayName || pipeline.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="block text-sm">Mover para o funil:</Label>
                          <Select
                            value={editAutomation.target_pipeline_id}
                            onValueChange={(value) =>
                              setEditAutomation({ ...editAutomation, target_pipeline_id: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {pipelines.map((pipeline) => (
                                <SelectItem key={pipeline.id} value={pipeline.id}>
                                  {pipeline.displayName || pipeline.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="block text-sm">Criar cópia em:</Label>
                          <Select
                            value={editAutomation.archive_to}
                            onValueChange={(value) =>
                              setEditAutomation({ ...editAutomation, archive_to: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum (apenas mover)</SelectItem>
                              {pipelines.map((pipeline) => (
                                <SelectItem key={pipeline.id} value={pipeline.id}>
                                  {pipeline.displayName || pipeline.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30 mt-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-require-owner-transfer"
                            checked={editAutomation.require_owner_transfer}
                            onCheckedChange={(checked) =>
                              setEditAutomation({ 
                                ...editAutomation, 
                                require_owner_transfer: checked as boolean,
                                target_owner_role: checked ? editAutomation.target_owner_role : null
                              })
                            }
                          />
                          <Label htmlFor="edit-require-owner-transfer" className="text-sm font-medium cursor-pointer">
                            Transferir propriedade do lead (Opcional)
                          </Label>
                        </div>
                        
                        {editAutomation.require_owner_transfer && (
                          <div className="space-y-2 mt-2">
                            <Label className="text-xs text-muted-foreground">Selecionar novo proprietário do grupo:</Label>
                            <Select
                              value={editAutomation.target_owner_role || ''}
                              onValueChange={(value) => 
                                setEditAutomation({ ...editAutomation, target_owner_role: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o grupo de usuários" />
                              </SelectTrigger>
                              <SelectContent>
                                {userRoles.map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              Ao marcar como ganho, será obrigatório selecionar um usuário deste grupo como novo proprietário
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <p className="font-medium">
                        Quando marcado como <span className="text-primary">{getTriggerLabel(automation.trigger_event)}</span> em{" "}
                        <span className="text-primary">{getPipelineName(automation.source_pipeline_id)}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        → Mover para <span className="font-medium">{getPipelineName(automation.target_pipeline_id)}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        → Copiar para: <span className="font-medium">{getArchiveLabel(automation.archive_to)}</span>
                      </p>
                      {automation.require_owner_transfer && automation.target_owner_role && (
                        <p className="text-sm text-muted-foreground">
                          → Transferir para: <span className="font-medium">{userRoles.find(r => r.id === automation.target_owner_role)?.name || 'Grupo não encontrado'}</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {editingId === automation.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSaveEdit(automation.id)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={automation.is_active}
                            onCheckedChange={(checked) =>
                              handleToggleAutomation(automation.id, checked)
                            }
                          />
                          <Label className="text-sm">
                            {automation.is_active ? "Ativa" : "Inativa"}
                          </Label>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(automation)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAutomation(automation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
