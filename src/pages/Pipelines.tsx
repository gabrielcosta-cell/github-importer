import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingDown, Star, Heart } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { MobileSidebarTrigger } from "@/components/MobileSidebarTrigger";
import GestaoCancelamentos from "./GestaoCancelamentos";
import GestaoCSAT from "./GestaoCSAT";
import GestaoNPS from "./GestaoNPS";

type PipelineTab = "churn" | "csat" | "nps";

export default function Pipelines() {
  const [activeTab, setActiveTab] = useState<PipelineTab>("churn");

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Top bar with pipeline selector */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="hidden md:block">
          <SidebarTrigger />
        </div>
        <MobileSidebarTrigger />
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PipelineTab)} className="w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="churn" className="text-xs gap-1.5 data-[state=active]:bg-[#ec4a55] data-[state=active]:text-white">
              <TrendingDown className="h-3.5 w-3.5" />
              Churn
            </TabsTrigger>
            <TabsTrigger value="csat" className="text-xs gap-1.5 data-[state=active]:bg-[#ec4a55] data-[state=active]:text-white">
              <Star className="h-3.5 w-3.5" />
              CSAT
            </TabsTrigger>
            <TabsTrigger value="nps" className="text-xs gap-1.5 data-[state=active]:bg-[#ec4a55] data-[state=active]:text-white">
              <Heart className="h-3.5 w-3.5" />
              NPS
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content - render the selected pipeline page */}
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === "churn" && <GestaoCancelamentos />}
        {activeTab === "csat" && <GestaoCSAT />}
        {activeTab === "nps" && <GestaoNPS />}
      </div>
    </div>
  );
}
