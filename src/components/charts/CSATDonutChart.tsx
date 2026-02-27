import { useMemo } from "react";

interface CSATDonutChartProps {
  satisfeitos: number;
  neutros: number;
  insatisfeitos: number;
  satisfeitosCount: number;
  neutrosCount: number;
  insatisfeitosCount: number;
  size?: number;
}

export const CSATDonutChart = ({
  satisfeitos,
  neutros,
  insatisfeitos,
  satisfeitosCount,
  neutrosCount,
  insatisfeitosCount,
  size = 180
}: CSATDonutChartProps) => {
  const total = satisfeitosCount + neutrosCount + insatisfeitosCount;
  
  const segments = useMemo(() => {
    if (total === 0) return [];
    
    const data = [
      { value: satisfeitos, color: "#10b981", label: "Satisfeitos", count: satisfeitosCount },
      { value: neutros, color: "#f59e0b", label: "Neutros", count: neutrosCount },
      { value: insatisfeitos, color: "#ef4444", label: "Insatisfeitos", count: insatisfeitosCount },
    ].filter(d => d.value > 0);

    let currentAngle = -90; // Start from top
    return data.map(segment => {
      const angle = (segment.value / 100) * 360;
      const startAngle = currentAngle;
      currentAngle += angle;
      return {
        ...segment,
        startAngle,
        endAngle: currentAngle,
      };
    });
  }, [satisfeitos, neutros, insatisfeitos, satisfeitosCount, neutrosCount, insatisfeitosCount, total]);

  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.45;
  const innerRadius = size * 0.28;

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
    };
  };

  const createArcPath = (startAngle: number, endAngle: number, innerR: number, outerR: number) => {
    const start1 = polarToCartesian(startAngle, outerR);
    const end1 = polarToCartesian(endAngle, outerR);
    const start2 = polarToCartesian(endAngle, innerR);
    const end2 = polarToCartesian(startAngle, innerR);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `
      M ${start1.x} ${start1.y}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${end1.x} ${end1.y}
      L ${start2.x} ${start2.y}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${end2.x} ${end2.y}
      Z
    `;
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size}>
          <circle
            cx={centerX}
            cy={centerY}
            r={outerRadius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={outerRadius - innerRadius}
          />
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-sm"
          >
            Sem dados
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size}>
        {segments.map((segment, index) => (
          <path
            key={index}
            d={createArcPath(segment.startAngle, segment.endAngle, innerRadius, outerRadius)}
            fill={segment.color}
            className="transition-opacity hover:opacity-80"
          />
        ))}
        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground font-bold"
          fontSize={size * 0.12}
        >
          {total}
        </text>
        <text
          x={centerX}
          y={centerY + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground"
          fontSize={size * 0.07}
        >
          respostas
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#10b981]" />
          <span>Satisfeitos ({satisfeitos}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
          <span>Neutros ({neutros}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span>Insatisfeitos ({insatisfeitos}%)</span>
        </div>
      </div>
    </div>
  );
};
