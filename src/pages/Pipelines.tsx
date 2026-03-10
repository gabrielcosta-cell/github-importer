import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Kanban, ChevronDown, TrendingDown, Star, Heart } from "lucide-react";
import GestaoCancelamentos from "./GestaoCancelamentos";
import GestaoCSAT from "./GestaoCSAT";
import GestaoNPS from "./GestaoNPS";

type PipelineTab = "churn" | "csat" | "nps";

const PIPELINES: { id: PipelineTab; name: string; icon: React.ReactNode }[] = [
  { id: "churn", name: "Churn", icon: <TrendingDown className="h-3.5 w-3.5" /> },
  { id: "csat", name: "CSAT", icon: <Star className="h-3.5 w-3.5" /> },
  { id: "nps", name: "NPS", icon: <Heart className="h-3.5 w-3.5" /> },
];

export default function Pipelines() {
  const [activeTab, setActiveTab] = useState<PipelineTab>("churn");
  const [open, setOpen] = useState(false);

  const activePipeline = PIPELINES.find(p => p.id === activeTab)!;

  const pipelineSelector = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 rounded-none h-9 px-3 border-r">
          <Kanban className="h-3.5 w-3.5" />
          <span>{activePipeline.name}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="end">
        <div className="space-y-1">
          {PIPELINES.map(pipeline => (
            <Button
              key={pipeline.id}
              variant={activeTab === pipeline.id ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                setActiveTab(pipeline.id);
                setOpen(false);
              }}
            >
              {pipeline.icon}
              {pipeline.name}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === "churn" && <GestaoCancelamentos pipelineSelector={pipelineSelector} />}
        {activeTab === "csat" && <GestaoCSAT pipelineSelector={pipelineSelector} />}
        {activeTab === "nps" && <GestaoNPS pipelineSelector={pipelineSelector} />}
      </div>
    </div>
  );
}
