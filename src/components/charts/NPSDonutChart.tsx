import { useMemo } from "react";

interface NPSDonutChartProps {
  promotores: number;
  neutros: number;
  detratores: number;
  promotoresCount: number;
  neutrosCount: number;
  detratoresCount: number;
  size?: number;
}

export const NPSDonutChart = ({
  promotores,
  neutros,
  detratores,
  promotoresCount,
  neutrosCount,
  detratoresCount,
  size = 180
}: NPSDonutChartProps) => {
  const total = promotoresCount + neutrosCount + detratoresCount;
  
  const segments = useMemo(() => {
    if (total === 0) return [];
    
    const data = [
      { value: promotoresCount, color: "#10b981", label: "Promotores" },
      { value: neutrosCount, color: "#f59e0b", label: "Neutros" },
      { value: detratoresCount, color: "#ef4444", label: "Detratores" },
    ].filter(d => d.value > 0);

    let currentAngle = -90;
    return data.map(item => {
      const angle = (item.value / total) * 360;
      const segment = {
        ...item,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
      };
      currentAngle += angle;
      return segment;
    });
  }, [promotoresCount, neutrosCount, detratoresCount, total]);

  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size / 2 - 10;
  const innerRadius = outerRadius * 0.6;

  const createArcPath = (startAngle: number, endAngle: number, inner: number, outer: number) => {
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + outer * Math.cos(startRad);
    const y1 = centerY + outer * Math.sin(startRad);
    const x2 = centerX + outer * Math.cos(endRad);
    const y2 = centerY + outer * Math.sin(endRad);
    const x3 = centerX + inner * Math.cos(endRad);
    const y3 = centerY + inner * Math.sin(endRad);
    const x4 = centerX + inner * Math.cos(startRad);
    const y4 = centerY + inner * Math.sin(startRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${outer} ${outer} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
  };

  // Calculate label positions
  const getLabelPosition = (startAngle: number, endAngle: number) => {
    const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
    const labelRadius = (innerRadius + outerRadius) / 2;
    return {
      x: centerX + labelRadius * Math.cos(midAngle),
      y: centerY + labelRadius * Math.sin(midAngle),
    };
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <div className="text-muted-foreground text-sm">Sem dados</div>
      </div>
    );
  }

  // Check if there's only one type of response
  const isSingleCategory = segments.length === 1;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {isSingleCategory ? (
          // Render full donut with single color
          (() => {
            // Position the number inside the donut ring (at the top)
            const midRadius = (innerRadius + outerRadius) / 2;
            const labelX = centerX;
            const labelY = centerY - midRadius;
            
            return (
              <g>
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={outerRadius}
                  fill={segments[0].color}
                />
                <circle
                  cx={centerX}
                  cy={centerY}
                  r={innerRadius}
                  fill="hsl(var(--background))"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {segments[0].value}
                </text>
              </g>
            );
          })()
        ) : (
          segments.map((segment, index) => {
            const labelPos = getLabelPosition(segment.startAngle, segment.endAngle);
            const percentage = Math.round((segment.value / total) * 100);
            
            return (
              <g key={index}>
                <path
                  d={createArcPath(segment.startAngle, segment.endAngle, innerRadius, outerRadius)}
                  fill={segment.color}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                />
                {percentage >= 10 && (
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {segment.value}
                  </text>
                )}
              </g>
            );
          })
        )}
      </svg>
      
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#10b981]" />
          <span>Promotores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
          <span>Neutros</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span>Detratores</span>
        </div>
      </div>
    </div>
  );
};
