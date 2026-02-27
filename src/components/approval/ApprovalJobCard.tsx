import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { MoreVertical, Share2 } from "lucide-react";
import { ApprovalJob } from "./ApprovalKanban";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InstagramPostPreview } from "./InstagramPostPreview";

interface ApprovalJobCardProps {
  job: ApprovalJob;
  onUpdate: () => void;
  onClick: () => void;
}

export function ApprovalJobCard({ job, onUpdate, onClick }: ApprovalJobCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
  });
  const { toast } = useToast();

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  async function handleArchive() {
    try {
      const { error } = await supabase
        .from("approval_jobs")
        .update({ status: "arquivado" })
        .eq("id", job.id);

      if (error) throw error;

      toast({
        title: "Job arquivado",
        description: "O job foi arquivado com sucesso.",
      });
      onUpdate();
    } catch (error) {
      console.error("Error archiving job:", error);
      toast({
        title: "Erro ao arquivar",
        description: "Não foi possível arquivar o job.",
        variant: "destructive",
      });
    }
  }

  async function handleDelete() {
    try {
      const { error } = await supabase
        .from("approval_jobs")
        .delete()
        .eq("id", job.id);

      if (error) throw error;

      toast({
        title: "Job deletado",
        description: "O job foi deletado com sucesso.",
      });
      onUpdate();
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar o job.",
        variant: "destructive",
      });
    }
  }

  function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/aprovacao-cliente/${job.share_token}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copiado!",
        description: "O link de aprovação foi copiado para a área de transferência.",
      });
    }).catch(() => {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    });
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Se não está sendo arrastado e não clicou no menu, abre o dialog
    if (!isDragging && !(e.target as HTMLElement).closest('[role="menu"]') && 
        !(e.target as HTMLElement).closest('button')) {
      onClick();
    }
  };

  const imageFiles = (job as any).attached_files
    ?.filter((f: any) => f?.type?.startsWith('image/'))
    .map((f: any) => ({ url: f.url, name: f.name })) || [];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-0 bg-background hover:bg-accent/50 transition-colors border border-border cursor-move overflow-hidden"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-3 pb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground truncate">
            {job.title || "Sem título"}
          </h4>
          {job.client_name && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {job.client_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6"
            onClick={handleShare}
            title="Compartilhar link de aprovação"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleArchive}>
                Arquivar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Instagram Preview */}
      {imageFiles.length > 0 && (
        <div className="px-3 pb-3">
          <InstagramPostPreview 
            images={imageFiles}
            description={(job as any).description}
            clientName={job.client_name || "Cliente"}
            compact
          />
        </div>
      )}
    </Card>
  );
}
