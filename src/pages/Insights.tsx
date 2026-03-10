import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Heart, LayoutDashboard, Columns3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CSATMetricsDashboard } from "@/components/CSATMetricsDashboard";
import { CustomerSuccessDashboard } from "@/components/CustomerSuccessDashboard";
import GestaoCSAT from "@/pages/GestaoCSAT";
import GestaoNPS from "@/pages/GestaoNPS";

const Insights = () => {
  const [mainTab, setMainTab] = useState<"csat" | "nps">("csat");
  const [subTab, setSubTab] = useState<"dashboard" | "pipeline">("pipeline");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // CSAT form state
  const [csatForm, setCsatForm] = useState({
    empresa: "",
    responsavel: "",
    telefone: "",
    tipo_reuniao: "Check-in",
    nota_atendimento: "",
    nota_conteudo: "",
    nota_performance: "",
    recomendacao: "",
    observacoes: "",
  });

  // NPS form state
  const [npsForm, setNpsForm] = useState({
    empresa: "",
    responsavel: "",
    email: "",
    cnpj: "",
    recomendacao: "",
    sentimento_sem_dot: "",
    observacoes: "",
  });

  const [saving, setSaving] = useState(false);

  const resetForms = () => {
    setCsatForm({
      empresa: "",
      responsavel: "",
      telefone: "",
      tipo_reuniao: "Check-in",
      nota_atendimento: "",
      nota_conteudo: "",
      nota_performance: "",
      recomendacao: "",
      observacoes: "",
    });
    setNpsForm({
      empresa: "",
      responsavel: "",
      email: "",
      cnpj: "",
      recomendacao: "",
      sentimento_sem_dot: "",
      observacoes: "",
    });
  };

  const handleSaveCSAT = async () => {
    if (!csatForm.empresa || !csatForm.responsavel || !csatForm.nota_atendimento) {
      toast.error("Preencha os campos obrigatórios: Empresa, Responsável e Nota de Atendimento");
      return;
    }

    setSaving(true);
    try {
      const nota_atendimento = parseInt(csatForm.nota_atendimento);
      const nota_conteudo = csatForm.nota_conteudo ? parseInt(csatForm.nota_conteudo) : nota_atendimento;
      const nota_performance = csatForm.nota_performance ? parseInt(csatForm.nota_performance) : nota_atendimento;
      const recomendacao = csatForm.recomendacao ? parseInt(csatForm.recomendacao) : nota_atendimento;

      const { error } = await supabase.from("csat_responses").insert({
        empresa: csatForm.empresa,
        responsavel: csatForm.responsavel,
        telefone: csatForm.telefone || "",
        tipo_reuniao: csatForm.tipo_reuniao,
        nota_atendimento,
        nota_conteudo,
        nota_performance,
        recomendacao,
        observacoes: csatForm.observacoes || null,
      });

      if (error) throw error;

      toast.success("Resposta CSAT adicionada com sucesso!");
      setAddDialogOpen(false);
      resetForms();
      // Force reload by triggering a re-render
      window.dispatchEvent(new CustomEvent("insights-refresh"));
    } catch (error: any) {
      console.error("Erro ao salvar CSAT:", error);
      toast.error("Erro ao salvar resposta CSAT");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNPS = async () => {
    if (!npsForm.empresa || !npsForm.responsavel || !npsForm.recomendacao) {
      toast.error("Preencha os campos obrigatórios: Empresa, Responsável e Nota de Recomendação");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("nps_responses").insert({
        empresa: npsForm.empresa,
        responsavel: npsForm.responsavel,
        email: npsForm.email || "",
        cnpj: npsForm.cnpj || null,
        recomendacao: parseInt(npsForm.recomendacao),
        sentimento_sem_dot: npsForm.sentimento_sem_dot || "",
        observacoes: npsForm.observacoes || null,
      });

      if (error) throw error;

      toast.success("Resposta NPS adicionada com sucesso!");
      setAddDialogOpen(false);
      resetForms();
      window.dispatchEvent(new CustomEvent("insights-refresh"));
    } catch (error: any) {
      console.error("Erro ao salvar NPS:", error);
      toast.error("Erro ao salvar resposta NPS");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Top navigation bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 md:px-6 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Main tabs: CSAT | NPS */}
          <Tabs value={mainTab} onValueChange={(v) => { setMainTab(v as "csat" | "nps"); }} className="w-auto">
            <TabsList className="h-9">
              <TabsTrigger value="csat" className="gap-1.5 text-xs px-4 data-[state=active]:bg-[#ec4a55] data-[state=active]:text-white">
                <Star className="h-3.5 w-3.5" />
                CSAT
              </TabsTrigger>
              <TabsTrigger value="nps" className="gap-1.5 text-xs px-4 data-[state=active]:bg-[#ec4a55] data-[state=active]:text-white">
                <Heart className="h-3.5 w-3.5" />
                NPS
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sub tabs: Dashboard | Pipeline */}
          <div className="flex items-center gap-3">
            <Tabs value={subTab} onValueChange={(v) => setSubTab(v as "dashboard" | "pipeline")} className="w-auto">
              <TabsList className="h-9">
                <TabsTrigger value="dashboard" className="gap-1.5 text-xs px-3 data-[state=active]:bg-[#ec4a55] data-[state=active]:text-white">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="gap-1.5 text-xs px-3 data-[state=active]:bg-[#ec4a55] data-[state=active]:text-white">
                  <Columns3 className="h-3.5 w-3.5" />
                  Pipeline
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Add button - only on Pipeline */}
            {subTab === "pipeline" && (
              <Button
                size="sm"
                className="h-9 gap-1.5"
                style={{ backgroundColor: "#ec4a55" }}
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden md:inline">Adicionar</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-auto">
        {mainTab === "csat" && subTab === "dashboard" && (
          <div className="container py-6 space-y-6">
            <CSATMetricsDashboard />
          </div>
        )}
        {mainTab === "csat" && subTab === "pipeline" && (
          <GestaoCSAT />
        )}
        {mainTab === "nps" && subTab === "dashboard" && (
          <div className="container py-6 space-y-6">
            <CustomerSuccessDashboard />
          </div>
        )}
        {mainTab === "nps" && subTab === "pipeline" && (
          <GestaoNPS />
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {mainTab === "csat" ? (
                <>
                  <Star className="h-5 w-5" style={{ color: "#ec4a55" }} />
                  Nova Resposta CSAT
                </>
              ) : (
                <>
                  <Heart className="h-5 w-5" style={{ color: "#ec4a55" }} />
                  Nova Resposta NPS
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {mainTab === "csat" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Empresa <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome da empresa"
                  value={csatForm.empresa}
                  onChange={(e) => setCsatForm((f) => ({ ...f, empresa: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Responsável <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome do responsável"
                  value={csatForm.responsavel}
                  onChange={(e) => setCsatForm((f) => ({ ...f, responsavel: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={csatForm.telefone}
                  onChange={(e) => setCsatForm((f) => ({ ...f, telefone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Reunião</Label>
                <Select
                  value={csatForm.tipo_reuniao}
                  onValueChange={(v) => setCsatForm((f) => ({ ...f, tipo_reuniao: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Check-in">Check-in</SelectItem>
                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                    <SelectItem value="QBR">QBR</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Atendimento <span className="text-destructive">*</span></Label>
                  <Select
                    value={csatForm.nota_atendimento}
                    onValueChange={(v) => setCsatForm((f) => ({ ...f, nota_atendimento: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="1-5" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conteúdo</Label>
                  <Select
                    value={csatForm.nota_conteudo}
                    onValueChange={(v) => setCsatForm((f) => ({ ...f, nota_conteudo: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="1-5" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Performance</Label>
                  <Select
                    value={csatForm.nota_performance}
                    onValueChange={(v) => setCsatForm((f) => ({ ...f, nota_performance: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="1-5" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recomendação</Label>
                  <Select
                    value={csatForm.recomendacao}
                    onValueChange={(v) => setCsatForm((f) => ({ ...f, recomendacao: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="1-5" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações sobre a resposta..."
                  value={csatForm.observacoes}
                  onChange={(e) => setCsatForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveCSAT}
                  disabled={saving}
                  style={{ backgroundColor: "#ec4a55" }}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Empresa <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome da empresa"
                  value={npsForm.empresa}
                  onChange={(e) => setNpsForm((f) => ({ ...f, empresa: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Responsável <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Nome do responsável"
                  value={npsForm.responsavel}
                  onChange={(e) => setNpsForm((f) => ({ ...f, responsavel: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  placeholder="email@empresa.com"
                  type="email"
                  value={npsForm.email}
                  onChange={(e) => setNpsForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={npsForm.cnpj}
                  onChange={(e) => setNpsForm((f) => ({ ...f, cnpj: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Nota de Recomendação <span className="text-destructive">*</span></Label>
                <Select
                  value={npsForm.recomendacao}
                  onValueChange={(v) => setNpsForm((f) => ({ ...f, recomendacao: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="1-10" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sentimento sem a DOT</Label>
                <Input
                  placeholder="Como se sentiria sem a DOT?"
                  value={npsForm.sentimento_sem_dot}
                  onChange={(e) => setNpsForm((f) => ({ ...f, sentimento_sem_dot: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações sobre a resposta..."
                  value={npsForm.observacoes}
                  onChange={(e) => setNpsForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveNPS}
                  disabled={saving}
                  style={{ backgroundColor: "#ec4a55" }}
                >
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Insights;
