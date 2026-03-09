import { useState } from "react";
import { Users, DollarSign, Shield } from "lucide-react";
import { GestaoProjetosOperacao } from "./GestaoProjetosOperacao";
import { FinancialMetrics } from "./FinancialMetrics";
import { SquadsDashboard } from "./SquadsDashboard";
import { useProjetosData, wasRelevantInMonth, isChurnedInMonth, isActiveInMonth } from "@/hooks/useProjetosData";

interface ProjetosViewProps {
  initialTab?: 'clientes' | 'squads' | 'metricas';
}

export const ProjetosView = ({ initialTab = 'clientes' }: ProjetosViewProps) => {
  const [activeTab, setActiveTab] = useState<'clientes' | 'squads' | 'metricas'>(initialTab);
  const now = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState<{ month: number; year: number }>({ month: now.getMonth(), year: now.getFullYear() });

  const { liveData, loading, fetchSnapshots, refetchData, stagesList } = useProjetosData(selectedPeriod);

  const tabs = [
    { key: 'clientes' as const, label: 'Clientes', icon: Users },
    { key: 'squads' as const, label: 'Squads', icon: Shield },
    { key: 'metricas' as const, label: 'Métricas Financeiras', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center px-2">
        <div className="inline-flex rounded-xl bg-card border border-border p-1 shadow-sm">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === key
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'clientes' && (
        <GestaoProjetosOperacao
          liveData={liveData}
          loading={loading}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          fetchSnapshots={fetchSnapshots}
        />
      )}
      {activeTab === 'squads' && (
        <SquadsDashboard
          liveData={liveData}
          loading={loading}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      )}
      {activeTab === 'metricas' && <FinancialMetrics />}
    </div>
  );
};
