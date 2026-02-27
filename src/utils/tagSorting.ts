/**
 * Utility function to sort tags in a specific order:
 * 1. Qualificado serviço
 * 2. Pré qualificado
 * 3. Qualificação média
 * 4. Qualificação indefinida
 * 5. Red tags (etiquetas vermelhas)
 * 6. Yellow tags (etiquetas amarelas)
 * 7. Other tags (alphabetically)
 */

interface Tag {
  id: string;
  name: string;
  color: string;
  module_scope?: string;
}

// Priority names in exact order
const PRIORITY_NAMES = [
  'qualificado serviço',
  'pré qualificado',
  'qualificação média',
  'qualificação indefinida',
];

// Helper to check if a color is red
const isRedColor = (color: string): boolean => {
  const lowerColor = color.toLowerCase();
  // Check for red hex colors and named colors
  return lowerColor.includes('#ff') || 
         lowerColor.includes('#e53') || 
         lowerColor.includes('#dc') ||
         lowerColor.includes('#ef4') ||
         lowerColor.includes('#f00') ||
         lowerColor.includes('red') ||
         lowerColor === '#ea384c' ||
         lowerColor === '#dc2626' ||
         lowerColor === '#ef4444' ||
         lowerColor === '#b91c1c' ||
         lowerColor === '#991b1b';
};

// Helper to check if a color is yellow
const isYellowColor = (color: string): boolean => {
  const lowerColor = color.toLowerCase();
  // Check for yellow/amber hex colors and named colors
  return lowerColor.includes('#ff') && (lowerColor.includes('f') || lowerColor.includes('e') || lowerColor.includes('d')) ||
         lowerColor.includes('#f59') ||
         lowerColor.includes('#eab') ||
         lowerColor.includes('#fbbf') ||
         lowerColor.includes('#fcd') ||
         lowerColor.includes('yellow') ||
         lowerColor.includes('amber') ||
         lowerColor === '#f59e0b' ||
         lowerColor === '#fbbf24' ||
         lowerColor === '#fcd34d' ||
         lowerColor === '#d97706' ||
         lowerColor === '#ca8a04';
};

export const sortTags = <T extends Tag>(tags: T[]): T[] => {
  return [...tags].sort((a, b) => {
    const aNameLower = a.name.toLowerCase().trim();
    const bNameLower = b.name.toLowerCase().trim();
    
    // Check priority names first
    const aIndex = PRIORITY_NAMES.findIndex(name => aNameLower === name);
    const bIndex = PRIORITY_NAMES.findIndex(name => bNameLower === name);
    
    // Both are priority names
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // Only A is a priority name
    if (aIndex !== -1) return -1;
    
    // Only B is a priority name
    if (bIndex !== -1) return 1;
    
    // Check colors for remaining tags
    const aIsRed = isRedColor(a.color);
    const bIsRed = isRedColor(b.color);
    const aIsYellow = isYellowColor(a.color);
    const bIsYellow = isYellowColor(b.color);
    
    // Red tags come first (after priority names)
    if (aIsRed && !bIsRed) return -1;
    if (!aIsRed && bIsRed) return 1;
    
    // Yellow tags come after red
    if (aIsYellow && !bIsYellow) return -1;
    if (!aIsYellow && bIsYellow) return 1;
    
    // If same color category, sort alphabetically
    return a.name.localeCompare(b.name, 'pt-BR');
  });
};
