import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Kanban, ChevronDown, TrendingDown, Star, Heart } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MobileSidebarTrigger } from "@/components/MobileSidebarTrigger";
import { Separator } from "@/components/ui/separator";
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

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="hidden md:block">
          <SidebarTrigger />
        </div>
        <MobileSidebarTrigger />

        <div className="flex items-center bg-background border rounded-lg overflow-hidden w-[220px]">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="border-0 rounded-none hover:bg-accent/50 focus:ring-0 w-full justify-start text-xs h-9">
                <Kanban className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                <span className="flex-1 text-left">{activePipeline.name}</span>
                <ChevronDown className="h-3.5 w-3.5 ml-2 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2" align="start">
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
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === "churn" && <GestaoCancelamentos />}
        {activeTab === "csat" && <GestaoCSAT />}
        {activeTab === "nps" && <GestaoNPS />}
      </div>
    </div>
  );
}
