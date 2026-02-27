import { useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { ApprovalJobCard } from "./ApprovalJobCard";
import { ApprovalJob } from "./ApprovalKanban";

interface ApprovalColumnProps {
  id: string;
  title: string;
  jobs: ApprovalJob[];
  onJobUpdate: () => void;
  onCardClick: (job: ApprovalJob) => void;
}

export function ApprovalColumn({ id, title, jobs, onJobUpdate, onCardClick }: ApprovalColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex flex-col gap-3">
      <Card className="p-4 bg-card border-2 border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
          <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
            {jobs.length}
          </span>
        </div>
        <div className="space-y-2 min-h-[200px]">
          {jobs.map((job) => (
            <ApprovalJobCard 
              key={job.id} 
              job={job} 
              onUpdate={onJobUpdate}
              onClick={() => onCardClick(job)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
