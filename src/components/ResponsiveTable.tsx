import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  header: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  essential?: boolean; // Para mobile, mostrar apenas colunas essenciais
  sortable?: boolean;
}

interface ResponsiveTableProps {
  data: any[];
  columns: Column[];
  onRowClick?: (row: any) => void;
  className?: string;
  emptyMessage?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  onRowClick,
  className,
  emptyMessage = "Nenhum item encontrado"
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const essentialColumns = columns.filter(col => col.essential !== false);
  const expandableColumns = columns.filter(col => col.essential === false);

  const toggleRowExpansion = (rowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-fluid-base">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile View */}
      <div className="block md:hidden space-y-4">
        {sortedData.map((row, index) => {
          const rowId = row.id || index.toString();
          const isExpanded = expandedRows.has(rowId);
          
          return (
            <div
              key={rowId}
              className="bg-card border rounded-lg p-4 space-y-3 touch-target"
              onClick={() => onRowClick?.(row)}
            >
              {/* Essential columns always visible */}
              <div className="space-y-3">
                {essentialColumns.map((column) => (
                  <div key={column.key} className="flex justify-between items-start gap-3">
                    <span className="text-fluid-sm font-medium text-muted-foreground min-w-0">
                      {column.header}:
                    </span>
                    <div className="text-fluid-sm text-right min-w-0 flex-1">
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </div>
                  </div>
                ))}
              </div>

              {/* Expandable columns */}
              {expandableColumns.length > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => toggleRowExpansion(rowId, e)}
                    className="w-full justify-center gap-2 text-fluid-sm"
                  >
                    {isExpanded ? 'Menos detalhes' : 'Mais detalhes'}
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      isExpanded && "rotate-180"
                    )} />
                  </Button>
                  
                  {isExpanded && (
                    <div className="space-y-3 pt-3 border-t">
                      {expandableColumns.map((column) => (
                        <div key={column.key} className="flex justify-between items-start gap-3">
                          <span className="text-fluid-sm font-medium text-muted-foreground min-w-0">
                            {column.header}:
                          </span>
                          <div className="text-fluid-sm text-right min-w-0 flex-1">
                            {column.render ? column.render(row[column.key], row) : row[column.key]}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "text-left py-3 px-4 text-fluid-sm font-medium text-muted-foreground",
                    column.sortable && "cursor-pointer hover:text-foreground touch-target",
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortConfig?.key === column.key && (
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        sortConfig.direction === 'asc' && "rotate-180"
                      )} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => (
              <tr
                key={row.id || index}
                className={cn(
                  "border-b hover:bg-muted/50 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "py-4 px-4 text-fluid-sm",
                      column.className
                    )}
                  >
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};