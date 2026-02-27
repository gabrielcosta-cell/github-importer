import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface CEPInputProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  onAddressFetch?: (address: {
    rua: string;
    cidade: string;
    estado: string;
  }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CEPInput: React.FC<CEPInputProps> = ({
  value,
  onChange,
  onAddressFetch,
  placeholder = 'XXXXX-XXX',
  className = '',
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Formatar CEP
  const formatCEP = (cep: string): string => {
    const cleaned = cep.replace(/\D/g, '');
    
    if (cleaned.length <= 5) return cleaned;
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
  };

  useEffect(() => {
    if (value) {
      setDisplayValue(formatCEP(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const fetchAddress = async (cep: string) => {
    const cleaned = cep.replace(/\D/g, '');
    
    if (cleaned.length !== 8) return;

    setIsLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await response.json();
      
      if (!data.erro && onAddressFetch) {
        onAddressFetch({
          rua: data.logradouro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const cleaned = input.replace(/\D/g, '');
    
    // Limitar a 8 dígitos
    if (cleaned.length > 8) return;
    
    const formatted = formatCEP(cleaned);
    setDisplayValue(formatted);
  };

  const handleBlur = () => {
    const cleaned = displayValue.replace(/\D/g, '');
    
    if (cleaned.length === 0) {
      onChange(null);
    } else if (cleaned.length === 8) {
      onChange(cleaned);
      fetchAddress(cleaned);
    } else {
      onChange(cleaned);
    }
  };

  return (
    <div className="relative">
      <Input
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        disabled={disabled || isLoading}
        maxLength={9} // XXXXX-XXX
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
};
