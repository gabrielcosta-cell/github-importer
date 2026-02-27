import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/theme-provider";

interface DotLogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export const DotLogo = ({ className, size = 24, animate = false }: DotLogoProps) => {
  const { theme } = useTheme();
  
  // Usa o logo do sidebar que se adapta ao tema
  // Se for 'system', vamos detectar baseado nas preferências do navegador
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const logoSrc = isDark 
    ? "/lovable-uploads/7c396b9b-c7c8-460d-9683-1d9c1a265bd8.png" 
    : "/lovable-uploads/dot-logo-light.png";
  
  return (
    <div className={cn("flex items-center", animate && "animate-pulse-soft", className)}>
      <img 
        src={logoSrc}
        alt="DOT Logo"
        style={{ height: size, width: 'auto' }}
      />
    </div>
  );
};