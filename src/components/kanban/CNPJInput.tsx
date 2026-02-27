import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface CNPJInputProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CNPJInput: React.FC<CNPJInputProps> = ({
  value,
  onChange,
  placeholder = 'XX.XXX.XXX/XXXX-XX',
  className = '',
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState('');

  // Formatar CNPJ
  const formatCNPJ = (cnpj: string): string => {
    const cleaned = cnpj.replace(/\D/g, '');
    
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
  };

  // Validar CNPJ básico (apenas formato)
  const isValidFormat = (cnpj: string): boolean => {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.length === 14;
  };

  useEffect(() => {
    if (value) {
      setDisplayValue(formatCNPJ(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cleaned = input.replace(/\D/g, '');
    
    // Limitar a 14 dígitos
    if (cleaned.length > 14) return;
    
    const formatted = formatCNPJ(cleaned);
    setDisplayValue(formatted);
  };

  const handleBlur = () => {
    const cleaned = displayValue.replace(/\D/g, '');
    
    if (cleaned.length === 0) {
      onChange(null);
    } else if (cleaned.length === 14) {
      onChange(cleaned);
    } else {
      // Se não está completo, manter o que foi digitado
      onChange(cleaned);
    }
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      maxLength={18} // XX.XXX.XXX/XXXX-XX
    />
  );
};
