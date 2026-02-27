import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ApprovalColumn } from "./ApprovalColumn";
import { DndContext, DragEndEvent, closestCorners, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { JobDialog } from "./JobDialog";

interface ApprovalKanbanProps {
  showArchived: boolean;
  filters: {
    responsible: string;
    client: string;
    startDate: string;
    endDate: string;
  };
}

export interface ApprovalJob {
  id: string;
  title: string;
  client_name: string | null;
  responsible_user_id: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  position: number;
  share_token: string;
}

const DEFAULT_COLUMNS = [
  { id: "rascunho", title: "Rascunho" },
  { id: "para_aprovacao", title: "Para aprovação" },
  { id: "em_ajustes", title: "Em ajustes" },
  { id: "aprovado", title: "Aprovado" },
];

const ARCHIVED_COLUMN = { id: "arquivado", title: "Arquivado" };

export function ApprovalKanban({ showArchived, filters }: ApprovalKanbanProps) {
  const [jobs, setJobs] = useState<ApprovalJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ApprovalJob | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchJobs();
  }, [showArchived, filters]);

  async function fetchJobs() {
    try {
      setLoading(true);
      let query = supabase
        .from("approval_jobs")
        .select("*")
        .order("position", { ascending: true });

      if (showArchived) {
        query = query.eq("status", "arquivado");
      } else {
        query = query.neq("status", "arquivado");
      }

      if (filters.responsible && filters.responsible !== "all") {
        query = query.eq("responsible_user_id", filters.responsible);
      }

      if (filters.client && filters.client !== "all") {
        query = query.eq("client_name", filters.client);
      }

      if (filters.startDate) {
        query = query.gte("start_date", filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte("end_date", filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Erro ao carregar jobs",
        description: "Não foi possível carregar os jobs de aprovação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const jobId = active.id as string;
    const newStatus = over.id as string;

    const currentJob = jobs.find((j) => j.id === jobId);
    if (!currentJob) return;

    // Se o status não mudou, não fazer nada (evita toasts no clique)
    if (currentJob.status === newStatus) return;

    // Atualizar localmente
    setJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job))
    );

    // Atualizar no banco
    try {
      const { error } = await supabase
        .from("approval_jobs")
        .update({ status: newStatus })
        .eq("id", jobId);

      if (error) throw error;

      toast({
        title: "Job atualizado",
        description: "Status do job foi alterado com sucesso.",
      });
    } catch (error) {
      console.error("Error updating job:", error);
      toast({
        title: "Erro ao atualizar job",
        description: "Não foi possível atualizar o status do job.",
        variant: "destructive",
      });
      // Reverter mudança local
      fetchJobs();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  function handleCardClick(job: ApprovalJob) {
    setSelectedJob(job);
    setIsDialogOpen(true);
  }

  function handleDialogClose() {
    setIsDialogOpen(false);
    setSelectedJob(null);
  }

  const displayColumns = showArchived ? [ARCHIVED_COLUMN] : DEFAULT_COLUMNS;

  return (
    <>
      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd} sensors={sensors}>
        <div className={`grid grid-cols-1 gap-4 ${showArchived ? 'md:grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
          {displayColumns.map((column) => {
            const columnJobs = jobs.filter((job) => job.status === column.id);
            return (
              <ApprovalColumn
                key={column.id}
                id={column.id}
                title={column.title}
                jobs={columnJobs}
                onJobUpdate={fetchJobs}
                onCardClick={handleCardClick}
              />
            );
          })}
        </div>
      </DndContext>

      {selectedJob && (
        <JobDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          job={selectedJob}
          onSave={() => {
            fetchJobs();
            handleDialogClose();
          }}
          onClose={handleDialogClose}
        />
      )}
    </>
  );
}
