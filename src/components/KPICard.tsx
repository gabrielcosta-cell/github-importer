import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  iconColor = 'text-primary',
  valueClassName,
  filterComponent
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
