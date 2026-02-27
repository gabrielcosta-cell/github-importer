export const formatCurrency = (value: number): string => {
  if (isNaN(value) || value === null || value === undefined) {
    return '-';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
