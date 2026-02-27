import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface CSATGaugeChartProps {
  score: number; // Now expects 0-100 percentage
  size?: number;
  tooltipContent?: React.ReactNode;
}

export const CSATGaugeChart = ({ score, size = 200, tooltipContent }: CSATGaugeChartProps) => {
  // CSAT ranges from 0 to 100%
  // Map to 0-180 degrees for semicircle gauge (0° = 0%, 180° = 100%)
  const normalizedAngle = useMemo(() => {
    const clampedScore = Math.max(0, Math.min(100, score));
    return (clampedScore / 100) * 180;
  }, [score]);

  // Color zones based on CSAT percentage
  // > 80%: Excelente - Verde forte
  // 70-80%: Bom - Verde claro
  // 50-69%: Mediano - Amarelo
  // 25-49%: Abaixo do esperado - Laranja
  // < 25%: Zona crítica - Vermelho
  const getScoreColor = (score: number) => {
    if (score > 80) return "#059669"; // Verde forte (emerald-600)
    if (score >= 70) return "#22c55e"; // Verde claro (green-500)
    if (score >= 50) return "#f59e0b"; // Amarelo (amber-500)
    if (score >= 25) return "#f97316"; // Laranja (orange-500)
    return "#ef4444"; // Vermelho (red-500)
  };

  const getZoneName = (score: number) => {
    if (score > 80) return "Excelente";
    if (score >= 70) return "Bom";
    if (score >= 50) return "Mediano";
    if (score >= 25) return "Abaixo do Esperado";
    return "Zona Crítica";
  };

  const centerX = size / 2;
  const centerY = size * 0.6;
  const radius = size * 0.4;
  const strokeWidth = size * 0.12;

  // Create arc path
  const createArc = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(Math.PI + startRad);
    const y1 = centerY - radius * Math.sin(Math.PI + startRad);
    const x2 = centerX + radius * Math.cos(Math.PI + endRad);
    const y2 = centerY - radius * Math.sin(Math.PI + endRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
  };

  // Needle coordinates
  const needleAngle = (normalizedAngle * Math.PI) / 180;
  const needleLength = radius * 0.75;
  const needleX = centerX - needleLength * Math.cos(needleAngle);
  const needleY = centerY - needleLength * Math.sin(needleAngle);

  const displayScore = `${Math.round(score)}%`;

  const scoreDisplay = (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1 text-4xl font-bold" style={{ color: getScoreColor(score) }}>
        {displayScore}
        {tooltipContent && (
          <Info className="w-5 h-5 opacity-70" />
        )}
      </div>
    </div>
  );

  // Generate gradient ID unique per component
  const gradientId = `csatGradient-${size}`;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
        <defs>
          {/* Gradient with 5 zones: red -> orange -> yellow -> light green -> dark green */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />      {/* 0-25%: Vermelho */}
            <stop offset="25%" stopColor="#f97316" />     {/* 25-50%: Laranja */}
            <stop offset="50%" stopColor="#f59e0b" />     {/* 50-70%: Amarelo */}
            <stop offset="70%" stopColor="#22c55e" />     {/* 70-80%: Verde claro */}
            <stop offset="100%" stopColor="#059669" />    {/* 80-100%: Verde forte */}
          </linearGradient>
        </defs>

        {/* Background arc with gradient */}
        <path
          d={createArc(0, 180)}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Tick marks for 0%, 25%, 50%, 75%, 100% */}
        {[0, 25, 50, 75, 100].map((value) => {
          const tickAngle = (value / 100) * 180;
          const tickRad = (tickAngle * Math.PI) / 180;
          const innerR = radius - strokeWidth / 2 - 5;
          const outerR = radius + strokeWidth / 2 + 5;
          const x1 = centerX + innerR * Math.cos(Math.PI + tickRad);
          const y1 = centerY - innerR * Math.sin(Math.PI + tickRad);
          const x2 = centerX + outerR * Math.cos(Math.PI + tickRad);
          const y2 = centerY - outerR * Math.sin(Math.PI + tickRad);
          
          return (
            <line
              key={value}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              opacity={0.3}
            />
          );
        })}

        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke="hsl(var(--foreground))"
          strokeWidth={3}
          strokeLinecap="round"
        />
        
        {/* Needle center */}
        <circle
          cx={centerX}
          cy={centerY}
          r={8}
          fill="hsl(var(--foreground))"
        />
        <circle
          cx={centerX}
          cy={centerY}
          r={5}
          fill="hsl(var(--background))"
        />

        {/* Labels: 0%, 50%, 100% */}
        <text x={size * 0.05} y={centerY + 30} fontSize="12" fontWeight="600" fill="hsl(var(--foreground))" textAnchor="start">0%</text>
        <text x={centerX} y={size * 0.08} fontSize="12" fontWeight="600" fill="hsl(var(--foreground))" textAnchor="middle">50%</text>
        <text x={size * 0.95} y={centerY + 30} fontSize="12" fontWeight="600" fill="hsl(var(--foreground))" textAnchor="end">100%</text>
      </svg>
      
      {/* Score and Zone */}
      <div className="text-center -mt-2">
        {tooltipContent ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">{scoreDisplay}</div>
            </TooltipTrigger>
            <TooltipContent>
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        ) : (
          scoreDisplay
        )}
        <div 
          className="text-lg font-semibold mt-1 px-3 py-1 rounded-full"
          style={{ 
            backgroundColor: `${getScoreColor(score)}20`,
            color: getScoreColor(score)
          }}
        >
          {getZoneName(score)}
        </div>
      </div>
    </div>
  );
};
