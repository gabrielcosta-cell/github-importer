import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeText } from '@/utils/normalizeText';

interface EditableFieldProps {
  value: string | number | undefined;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number' | 'email' | 'tel' | 'textarea';
  label: string;
  icon: React.ReactNode;
  placeholder?: string;
  formatDisplay?: (value: string | number | undefined) => string;
  compact?: boolean;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onSave,
  type = 'text',
  label,
  icon,
  placeholder,
  formatDisplay,
  compact = false
}) => {
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const [loading, setLoading] = useState(false);

  // Update editValue when value prop changes
  React.useEffect(() => {
    setEditValue(value?.toString() || '');
  }, [value]);

  const handleSave = async () => {
    // Only save if value changed
    if (editValue === (value?.toString() || '')) {
      return;
    }
    
    setLoading(true);
    try {
      const raw = editValue.trim();
      const valueToSave = type === 'number' ? raw : editValue;
      
      await onSave(valueToSave);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || '');
  };

  const hasChanges = editValue !== (value?.toString() || '');

  return (
    <div className={cn("space-y-1", compact && "space-y-0")}>
      <div className={cn(
        "flex items-center gap-1 text-muted-foreground",
        compact ? "text-[10px]" : "text-sm"
      )}>
        {icon}
        <p>{label}</p>
      </div>
      
      <div className={cn("flex items-center gap-2", compact && "gap-1 mt-0")}>
        {type === 'textarea' ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(normalizeText(e.target.value))}
            placeholder={placeholder}
            className={cn(
              "w-full",
              compact ? "min-h-[32px] text-[10px] py-1 px-1.5" : "min-h-[60px] text-sm"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSave();
              } else if (e.key === 'Escape') {
                handleCancel();
              }
            }}
          />
        ) : (
          <Input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(normalizeText(e.target.value))}
            placeholder={placeholder}
            className={cn(
              "w-full",
              compact ? "h-6 text-[10px] py-0.5 px-1.5" : "text-sm"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              } else if (e.key === 'Escape') {
                handleCancel();
              }
            }}
          />
        )}

        {hasChanges && (
          <div className="flex gap-1 flex-shrink-0">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={loading}
              className={cn(
                "p-0 bg-green-600 hover:bg-green-700 text-white",
                compact ? "h-6 w-6" : "h-8 w-8"
              )}
            >
              <Check className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={loading}
              className={cn(
                "p-0 text-red-600 hover:text-red-700 hover:bg-red-50",
                compact ? "h-6 w-6" : "h-8 w-8"
              )}
            >
              <X className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
