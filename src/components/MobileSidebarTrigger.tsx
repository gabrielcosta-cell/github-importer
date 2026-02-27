import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface MobileSidebarTriggerProps {
  className?: string;
  ariaLabel?: string;
}

export function MobileSidebarTrigger({
  className,
  ariaLabel = "Abrir menu",
}: MobileSidebarTriggerProps) {
  return (
    <div
      className={cn("md:hidden fixed left-3 z-50", className)}
      style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
    >
      <SidebarTrigger
        aria-label={ariaLabel}
        className="bg-background/80 backdrop-blur border border-border shadow-sm hover:bg-background"
      />
    </div>
  );
}
