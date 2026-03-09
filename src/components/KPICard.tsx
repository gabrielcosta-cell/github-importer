import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendData {
  value: number; // percentage change
  label?: string; // e.g. "vs mês anterior"
  invertColors?: boolean; // true = positive is bad (e.g. churn going up)
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  iconColor?: string;
  valueClassName?: string;
  showVisibilityToggle?: boolean;
  filterComponent?: React.ReactNode;
  trend?: TrendData;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  iconColor = 'text-primary',
  valueClassName,
  filterComponent,
  trend
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'border-green-500/20 bg-green-500/5';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/5';
      case 'danger':
        return 'border-red-500/20 bg-red-500/5';
      default:
        return '';
    }
  };

  const renderTrend = () => {
    if (!trend) return null;
    const isPositive = trend.value > 0;
    const isNeutral = trend.value === 0;
    const invert = trend.invertColors;

    const colorClass = isNeutral
      ? 'text-muted-foreground'
      : (isPositive && !invert) || (!isPositive && invert)
        ? 'text-green-500'
        : 'text-red-500';

    const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
    const sign = isPositive ? '+' : '';

    return (
      <div className={cn('flex items-center gap-1 text-xs font-medium mt-1', colorClass)}>
        <TrendIcon className="h-3 w-3" />
        <span>{sign}{trend.value.toFixed(1)}%</span>
        {trend.label && <span className="text-muted-foreground font-normal">{trend.label}</span>}
      </div>
    );
  };

  return (
    <Card className={cn('overflow-hidden', getVariantClasses())}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', valueClassName)}>
          {value}
        </div>
        {renderTrend()}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {filterComponent && (
          <div className="mt-3">{filterComponent}</div>
        )}
      </CardContent>
    </Card>
  );
};
