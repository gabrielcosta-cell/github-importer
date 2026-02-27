import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  cols = { default: 1, sm: 2, lg: 3, xl: 4 },
  gap = { default: 4, md: 6 }
}) => {
  const getGridClasses = () => {
    const colClasses = [];
    const gapClasses = [];

    // Grid columns
    if (cols.default) colClasses.push(`grid-cols-${cols.default}`);
    if (cols.sm) colClasses.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) colClasses.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) colClasses.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) colClasses.push(`xl:grid-cols-${cols.xl}`);
    if (cols['2xl']) colClasses.push(`2xl:grid-cols-${cols['2xl']}`);

    // Gap
    if (gap.default) gapClasses.push(`gap-${gap.default}`);
    if (gap.sm) gapClasses.push(`sm:gap-${gap.sm}`);
    if (gap.md) gapClasses.push(`md:gap-${gap.md}`);
    if (gap.lg) gapClasses.push(`lg:gap-${gap.lg}`);
    if (gap.xl) gapClasses.push(`xl:gap-${gap.xl}`);

    return [...colClasses, ...gapClasses].join(' ');
  };

  return (
    <div className={cn('grid', getGridClasses(), className)}>
      {children}
    </div>
  );
};