import { Card } from "@/components/ui/card";
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Clock, 
  Wallet, 
  FolderOpen, 
  Activity, 
  Sparkles,
  TrendingDown,
  DollarSign,
  Heart,
  CheckCircle,
  Copy as CopyIcon,
  BarChart2,
  Kanban,
  UserCheck
} from "lucide-react";

interface SidebarPreviewProps {
  mainMenuOrder: string[];
  csSubmenuOrder: string[];
  criacaoSubmenuOrder: string[];
}

const mainMenuLabels: Record<string, { label: string; icon: any }> = {
  'dashboard': { label: 'Quadro de vendas', icon: BarChart3 },
  'crm': { label: 'CRM', icon: Kanban },
  'csm': { label: 'CSM', icon: UserCheck },
  'wallet': { label: 'Wallet', icon: Wallet },
  'lista-espera': { label: 'Lista de espera', icon: Clock },
  'projetos-operacao': { label: 'Projetos', icon: FolderOpen },
  'performance': { label: 'Performance', icon: Activity }
};

const submenuLabels: Record<string, string> = {
  'cs-churn': 'Churn',
  'cs-metricas': 'Dashboards',
  'cs-nps': 'NPS',
  'aprovacao': 'Aprovação',
  'copy': 'Copy',
  'analise-bench': 'Análise'
};

export const SidebarPreview = ({ mainMenuOrder, csSubmenuOrder, criacaoSubmenuOrder }: SidebarPreviewProps) => {
  return (
    <Card className="p-4 bg-muted/30 sticky top-4">
      <div className="text-xs font-semibold mb-3 text-muted-foreground">Preview da Sidebar</div>
      <div className="space-y-1 text-sm">
        {/* Skala Section */}
        <div className="py-1 px-2 text-xs font-semibold text-muted-foreground">SKALA</div>
        
        {/* Render CRM and CSM based on their position in mainMenuOrder */}
        {mainMenuOrder.includes('crm') && (
          <div className="py-1.5 px-2 hover:bg-muted/50 rounded flex items-center gap-2">
            <Kanban className="h-3 w-3" />
            <span>CRM</span>
          </div>
        )}
        {mainMenuOrder.includes('csm') && (
          <div className="py-1.5 px-2 hover:bg-muted/50 rounded flex items-center gap-2">
            <UserCheck className="h-3 w-3" />
            <span>CSM</span>
          </div>
        )}

        {/* Comercial Section */}
        <div className="py-1 px-2 text-xs font-semibold text-muted-foreground mt-3">COMERCIAL</div>
        {mainMenuOrder
          .filter(id => ['dashboard', 'wallet', 'lista-espera'].includes(id))
          .map((itemId) => {
            const item = mainMenuLabels[itemId];
            if (!item) return null;
            const Icon = item.icon;
            return (
              <div key={itemId} className="py-1.5 px-2 hover:bg-muted/50 rounded flex items-center gap-2">
                <Icon className="h-3 w-3" />
                <span>{item.label}</span>
              </div>
            );
          })}

        {/* Operação Section */}
        <div className="py-1 px-2 text-xs font-semibold text-muted-foreground mt-3">OPERAÇÃO</div>
        
        {/* CS with Submenu */}
        <div className="py-1.5 px-2 hover:bg-muted/50 rounded flex items-center gap-2">
          <Users className="h-3 w-3" />
          <span>CS</span>
        </div>
        {csSubmenuOrder.map((itemId) => (
          <div key={itemId} className="py-1.5 px-2 pl-6 hover:bg-muted/50 rounded text-xs">
            {submenuLabels[itemId]}
          </div>
        ))}

        {/* Projetos and Performance from mainMenuOrder */}
        {mainMenuOrder
          .filter(id => ['projetos-operacao', 'performance'].includes(id))
          .map((itemId) => {
            const item = mainMenuLabels[itemId];
            if (!item) return null;
            const Icon = item.icon;
            return (
              <div key={itemId} className="py-1.5 px-2 hover:bg-muted/50 rounded flex items-center gap-2">
                <Icon className="h-3 w-3" />
                <span>{item.label}</span>
              </div>
            );
          })}

        {/* Criação with Submenu */}
        <div className="py-1.5 px-2 hover:bg-muted/50 rounded flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          <span>Criação</span>
        </div>
        {criacaoSubmenuOrder.map((itemId) => (
          <div key={itemId} className="py-1.5 px-2 pl-6 hover:bg-muted/50 rounded text-xs">
            {submenuLabels[itemId]}
          </div>
        ))}
      </div>
    </Card>
  );
};
