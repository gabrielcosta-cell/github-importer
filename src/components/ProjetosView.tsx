import { useState } from "react";
import { Users, DollarSign } from "lucide-react";
import { GestaoProjetosOperacao } from "./GestaoProjetosOperacao";
import { FinancialMetrics } from "./FinancialMetrics";

interface ProjetosViewProps {
  initialTab?: 'clientes' | 'metricas';
}

export const ProjetosView = ({ initialTab = 'clientes' }: ProjetosViewProps) => {
  const [activeTab, setActiveTab] = useState<'clientes' | 'metricas'>(initialTab);

  return (
    <div className="space-y-6">
      {/* Toggle selector */}
      <div className="flex items-center px-2">
        <div className="inline-flex rounded-xl bg-card border border-border p-1 shadow-sm">
          <button
            onClick={() => setActiveTab('clientes')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'clientes'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Users className="h-4 w-4" />
            Clientes
          </button>
          <button
            onClick={() => setActiveTab('metricas')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === 'metricas'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Métricas Financeiras
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'clientes' ? <GestaoProjetosOperacao /> : <FinancialMetrics />}
    </div>
  );
};
