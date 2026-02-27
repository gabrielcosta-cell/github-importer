import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MRRInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

export const MRRInput: React.FC<MRRInputProps> = ({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className = '',
  disabled = false,
  compact = false,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Formatar número para moeda brasileira
  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(num);
  };

  // Parsear valor formatado para número
  const parseCurrency = (str: string): number | null => {
    if (!str || str.trim() === '') return null;
    
    // Remove tudo exceto números, vírgula e ponto
    const cleaned = str.replace(/[^\d,.-]/g, '');
    
    // Converter para formato numérico (trocar vírgula por ponto)
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(normalized);
    
    return isNaN(num) ? null : num;
  };

  // Atualizar display quando value mudar (externo)
  useEffect(() => {
    if (!isFocused) {
      if (value === null || value === undefined || value === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatCurrency(value));
      }
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Mostrar apenas o número ao focar
    if (value && value !== 0) {
      const numStr = value.toFixed(2).replace('.', ',');
      setDisplayValue(numStr);
    } else {
      setDisplayValue('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseCurrency(displayValue);
    
    // Validação: apenas valores positivos ou null
    if (parsed !== null && parsed < 0) {
      setDisplayValue('');
      onChange(null);
      return;
    }
    
    onChange(parsed);
    
    // Formatar após blur
    if (parsed !== null && parsed !== 0) {
      setDisplayValue(formatCurrency(parsed));
    } else {
      setDisplayValue('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Permitir apenas números, vírgula, ponto e símbolo R$
    const filtered = input.replace(/[^\d,.R$\s]/g, '');
    setDisplayValue(filtered);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevenir entrada de valores negativos
    if (e.key === '-' || e.key === 'Subtract') {
      e.preventDefault();
    }
    
    // Enter para confirmar
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <Input
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={cn(
        className,
        compact && "h-6 text-[10px] py-0.5 px-1.5"
      )}
      disabled={disabled}
    />
  );
};
