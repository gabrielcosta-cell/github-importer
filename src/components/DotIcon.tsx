import { cn } from "@/lib/utils";

interface DotIconProps {
  className?: string;
  size?: number;
}

export const DotIcon = ({ className, size = 16 }: DotIconProps) => {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Círculo externo */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        {/* Bolinha interna vermelha */}
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="#ef4444"
        />
      </svg>
    </div>
  );
};