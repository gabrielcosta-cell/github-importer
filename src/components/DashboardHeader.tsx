import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useModulePermissions } from "@/hooks/useModulePermissions";

interface DashboardHeaderProps {
  onNewBusiness: () => void;
  onExport: () => void;
  onImport: () => void;
}

export const DashboardHeader = ({ onNewBusiness, onExport, onImport }: DashboardHeaderProps) => {
  const { checkModulePermission } = useModulePermissions();
  
  return (
    <div className="flex items-center justify-end w-full">
      <div className="flex items-center gap-2 md:gap-3">
        <ThemeToggle />
        <Button 
          variant="outline" 
          onClick={onImport} 
          size="sm" 
          className="hidden md:flex touch-target"
        >
          <Upload className="h-4 w-4" />
          <span className="hidden lg:inline ml-2">Importar</span>
        </Button>
        <Button 
          variant="outline" 
          onClick={onExport} 
          size="sm" 
          className="hidden md:flex touch-target"
        >
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline ml-2">Exportar</span>
        </Button>
      </div>
    </div>
  );
};