import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardCheck } from 'lucide-react';
import { CSMCard } from '@/types/kanban';

interface QualificationScoreSectionProps {
  card: CSMCard;
  onUpdate: (field: string, value: number) => Promise<void>;
}

export const QualificationScoreSection: React.FC<QualificationScoreSectionProps> = ({ 
  card, 
  onUpdate 
}) => {
  const questions = [
    { field: 'qual_nicho_certo', label: 'Nicho certo?' },
    { field: 'qual_porte_empresa', label: 'Porte da empresa?' },
    { field: 'qual_tomador_decisao', label: 'Tomador de decisão?' },
    { field: 'qual_investe_marketing', label: 'Já investe em marketing?' },
    { field: 'qual_urgencia_real', label: 'Urgência real?' },
    { field: 'qual_clareza_objetivos', label: 'Nível de clareza sobre os objetivos?' },
  ];

  const calculateTotal = () => {
    return questions.reduce((sum, q) => {
      const value = (card as any)[q.field];
      return sum + (value || 0);
    }, 0);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0 && score <= 5) return 'text-red-600';
    if (score >= 6 && score <= 7) return 'text-blue-600';
    if (score >= 8 && score <= 10) return 'text-green-600';
    if (score >= 11 && score <= 12) return 'text-green-600 animate-pulse';
    return 'text-foreground';
  };

  const getScoreLabel = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'Selecione';
    if (value === 0) return '0 - Não';
    if (value === 1) return '1 - Talvez';
    if (value === 2) return '2 - Sim';
    return 'Selecione';
  };

  const total = calculateTotal();

  return (
    <div className="space-y-4 bg-secondary/20 p-4 rounded-lg">
      {questions.map((question) => {
        const value = (card as any)[question.field];
        
        return (
          <div key={question.field} className="space-y-2">
            <Label className="text-sm font-medium">{question.label}</Label>
            <Select
              value={value?.toString() || ''}
              onValueChange={(val) => onUpdate(question.field, parseInt(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione">
                  {getScoreLabel(value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 - Não</SelectItem>
                <SelectItem value="1">1 - Talvez</SelectItem>
                <SelectItem value="2">2 - Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      })}

      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Pontuação Total:</span>
          <span className={`text-lg font-bold ${getScoreColor(total)}`}>
            {total}/12
          </span>
        </div>
      </div>
    </div>
  );
};