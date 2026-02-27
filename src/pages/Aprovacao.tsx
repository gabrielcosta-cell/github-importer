import { useState, useEffect } from "react";
import { Plus, LogOut, Filter, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ApprovalKanban } from "@/components/approval/ApprovalKanban";
import { JobDialog } from "@/components/approval/JobDialog";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MobileSidebarTrigger } from "@/components/MobileSidebarTrigger";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Aprovacao() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [selectedResponsible, setSelectedResponsible] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [usersWithPermission, setUsersWithPermission] = useState<Array<{ user_id: string; name: string }>>([]);
  const [clientsWithJobs, setClientsWithJobs] = useState<string[]>([]);

  useEffect(() => {
    async function loadUsersWithPermission() {
      try {
        const { data, error } = await supabase.rpc('get_users_with_module_permission', {
          module_name: 'aprovacao',
          permission_type: 'view'
        });
        if (error) {
          console.error('Error loading users with permission:', error);
          return;
        }
        setUsersWithPermission(data || []);
      } catch (err) {
        console.error('Error loading users with permission:', err);
      }
    }

    async function loadClientsWithJobs() {
      try {
        const { data, error } = await supabase
          .from('approval_jobs')
          .select('client_name')
          .not('client_name', 'is', null);

        if (error) {
          console.error('Error loading clients with jobs:', error);
          return;
        }

        // Extrair nomes únicos de clientes e ordenar
        const uniqueClients = Array.from(
          new Set(data.map(job => job.client_name).filter((name): name is string => !!name))
        ).sort();

        setClientsWithJobs(uniqueClients);
      } catch (err) {
        console.error('Error loading clients with jobs:', err);
      }
    }

    loadUsersWithPermission();
    loadClientsWithJobs();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar activeView="aprovacao" onViewChange={() => navigate("/dashboard")} />
        <MobileSidebarTrigger />
        
        <SidebarInset className="flex-1">
          <div className="min-h-screen bg-background">
            {/* Header com logo e logout */}
            <div className="border-b border-border bg-background">
              <div className="flex items-center justify-between p-4">
                <h1 className="text-xl font-semibold">Aprovação</h1>
                <Button variant="ghost" onClick={handleSignOut} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </div>
            </div>

            {/* Filtros */}
            <div className="p-6">
              <div className="bg-card rounded-lg border p-4 md:p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Filter className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Filtros</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="responsavel" className="text-sm font-medium">
                      Responsável
                    </Label>
                    <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
                      <SelectTrigger id="responsavel" className="bg-background">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {usersWithPermission.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cliente" className="text-sm font-medium">
                      Cliente
                    </Label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger id="cliente" className="bg-background">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {clientsWithJobs.map((client) => (
                          <SelectItem key={client} value={client}>
                            {client}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-sm font-medium">
                      Data Inicial
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-sm font-medium">
                      Data Final
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <Button
                    variant={showArchived ? "default" : "outline"}
                    onClick={() => setShowArchived(!showArchived)}
                    className="gap-2"
                    size="sm"
                  >
                    <FileText className="h-4 w-4" />
                    {showArchived ? "Mostrando Arquivados" : "Mostrar Arquivados"}
                  </Button>

                  <div className="flex-1" />

                  <Button onClick={() => setIsJobDialogOpen(true)} className="gap-2 text-white" size="sm">
                    <Plus className="h-4 w-4" />
                    Novo Job
                  </Button>
                </div>
              </div>
            </div>

      {/* Kanban Board */}
      <div className="max-w-container mx-auto p-6">
        <ApprovalKanban
          showArchived={showArchived}
          filters={{
            responsible: selectedResponsible,
            client: selectedClient,
            startDate,
            endDate,
          }}
        />
      </div>

            <JobDialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
