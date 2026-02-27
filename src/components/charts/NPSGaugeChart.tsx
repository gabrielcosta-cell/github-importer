import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface NPSGaugeChartProps {
  score: number;
  size?: number;
  tooltipContent?: React.ReactNode;
}

export const NPSGaugeChart = ({ score, size = 200, tooltipContent }: NPSGaugeChartProps) => {
  // NPS ranges from -100 to 100
  // Map to 0-180 degrees for semicircle gauge (0° = -100, 90° = 0, 180° = 100)
  const normalizedAngle = useMemo(() => {
    const clampedScore = Math.max(-100, Math.min(100, score));
    return ((clampedScore + 100) / 200) * 180;
  }, [score]);

  const getScoreColor = (score: number) => {
    if (score < -50) return "#dc2626"; // Strong red
    if (score < 0) return "#ef4444"; // Red
    if (score === 0) return "#f59e0b"; // Orange/Yellow for neutral
    if (score < 50) return "#eab308"; // Yellow-green
    if (score < 75) return "#22c55e"; // Light green
    return "#10b981"; // Strong green
  };

  const getZoneName = (score: number) => {
    if (score < 0) return "Zona Crítica";
    if (score < 50) return "Zona de Aperfeiçoamento";
    if (score < 75) return "Zona de Qualidade";
    return "Zona de Excelência";
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

  // Needle coordinates - points to actual score
  // Angle goes from 0° (left, -100) to 180° (right, +100), with 90° (up, 0) in middle
  const needleAngle = (normalizedAngle * Math.PI) / 180;
  const needleLength = radius * 0.75;
  const needleX = centerX - needleLength * Math.cos(needleAngle);
  const needleY = centerY - needleLength * Math.sin(needleAngle);

  const roundedScore = Math.round(score);

  const scoreDisplay = (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1 text-4xl font-bold" style={{ color: getScoreColor(score) }}>
        {roundedScore}
        {tooltipContent && (
          <Info className="w-5 h-5 opacity-70" />
        )}
      </div>
    </div>
  );

  // Generate gradient ID unique per component
  const gradientId = `npsGradient-${size}`;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size * 0.85}`}>
        <defs>
          {/* Gradient from red to orange to green */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="25%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#10b981" />
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

        {/* Tick marks */}
        {[-100, -50, 0, 50, 100].map((value) => {
          const tickAngle = ((value + 100) / 200) * 180;
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

        {/* Labels: -100, 0, 100 */}
        <text x={size * 0.02} y={centerY + 30} fontSize="12" fontWeight="600" fill="hsl(var(--foreground))" textAnchor="start">-100</text>
        <text x={centerX} y={size * 0.08} fontSize="12" fontWeight="600" fill="hsl(var(--foreground))" textAnchor="middle">0</text>
        <text x={size * 0.98} y={centerY + 30} fontSize="12" fontWeight="600" fill="hsl(var(--foreground))" textAnchor="end">100</text>
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
