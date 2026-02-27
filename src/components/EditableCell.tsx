
// EditableCell component with compact mode support
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check, X, Edit } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

interface EditableCellProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number' | 'currency' | 'select';
  options?: { value: string; label: string }[];
  className?: string;
  badgeClassName?: string;
  compact?: boolean;
  readonly?: boolean;
}

export const EditableCell = ({ 
  value, 
  onSave, 
  type = 'text', 
  options = [],
  className = "",
  badgeClassName = "",
  compact = false,
  readonly = false
}: EditableCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  useEffect(() => {
    // Para campos currency que mostram "-", inicializar com string vazia para edição
    if (type === 'currency' && value === '-') {
      setEditValue('');
    } else {
      setEditValue(value);
    }
  }, [value, type]);

  const handleSave = () => {
    let valueToSave = editValue;
    
    // Para campos currency, garantir que o valor seja processado corretamente
    if (type === 'currency') {
      // Se está vazio ou é "-", salvar como string vazia
      if (!editValue || editValue === '-' || editValue === '') {
        valueToSave = '';
      } else {
        // Remover R$ se existir e manter apenas o número
        const cleanValue = String(editValue).replace(/^R\$\s*/, '').trim();
        valueToSave = cleanValue;
      }
    }
    
    onSave(valueToSave);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const getDisplayClass = (value: string | number, type: string, badgeClassName?: string) => {
    if (type === 'select' && badgeClassName) {
      return badgeClassName
    }

    if (type === 'select') {
      const strValue = String(value);
      
      // Status styles
      if (strValue === 'Assinado') return 'status-assinado';
      if (strValue === 'A assinar') return 'status-a-assinar';
      if (strValue === 'Perdido') return 'status-perdido';
      
      // Closer styles
      if (strValue === 'Will' || strValue === 'Jordan') return 'closer-badge';
      
      // Plano styles
      if (strValue === 'Pro') return 'plano-pro';
      if (strValue === 'Business') return 'plano-business';
      if (strValue === 'IA') return 'plano-ia';
      if (strValue === 'IDV') return 'plano-idv';
      if (strValue === 'Implementação de CRM') return 'plano-crm';
      if (strValue === 'Site') return 'plano-site';
      if (strValue === 'LP') return 'plano-lp';
      
      // Planos personalizados - estilo genérico
      const planosPadrao = ['Pro', 'Business', 'IA', 'IDV', 'Implementação de CRM', 'Site', 'LP'];
      if (!planosPadrao.includes(strValue) && type === 'select') {
        return 'plano-personalizado';
      }
      
      // Origem styles
      if (strValue === 'Inbound' || strValue === 'Indicacao') return 'origem-badge';
    }
    
    return '';
  };

  const displayValue = type === 'currency' && value !== '-' ? formatCurrency(Number(value)) : String(value);
  const displayClass = getDisplayClass(value, type, badgeClassName);

  if (!isEditing) {
    return (
      <div className={`group flex items-center gap-1 whitespace-nowrap ${className}`}>
        {type === 'select' ? (
          <span className={`inline-flex items-center ${compact ? 'px-2 py-1 text-[4.5px] leading-tight min-w-[70px]' : 'px-2 py-1 text-xs'} rounded font-medium ${badgeClassName || displayClass} whitespace-nowrap overflow-hidden text-center justify-center`}>
            {displayValue}
          </span>
        ) : (
          <span className="whitespace-nowrap">{displayValue}</span>
        )}
        {!readonly && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="h-2 w-2" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {type === 'select' ? (
        <Select value={String(editValue)} onValueChange={setEditValue}>
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={type === 'currency' ? 'text' : type}
          value={String(editValue)}
          onChange={(e) => {
            const newValue = e.target.value;
            if (type === 'currency') {
              // Para currency, permite qualquer texto durante a edição
              setEditValue(newValue);
            } else if (type === 'number') {
              setEditValue(Number(newValue) || 0);
            } else {
              setEditValue(newValue);
            }
          }}
          className={`h-8 ${type === 'currency' ? 'min-w-[120px]' : ''}`}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-green-600"
        onClick={handleSave}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-red-600"
        onClick={handleCancel}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};
