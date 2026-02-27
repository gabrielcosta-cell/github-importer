import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface RequiredFieldsData {
  receita_gerada_cliente?: number | null;
  investimento_midia?: number | null;
  teve_vendas?: string | null;
  teve_roas_maior_1?: string | null;
  teve_roi_maior_1?: string | null;
  nota_nps?: number | null;
}

interface RequiredFieldsDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: RequiredFieldsData) => void;
  missingFields: string[];
  currentData?: RequiredFieldsData;
}

export const RequiredFieldsDialog: React.FC<RequiredFieldsDialogProps> = ({
  open,
  onClose,
  onSave,
  missingFields,
  currentData,
}) => {
  const [formData, setFormData] = useState<RequiredFieldsData>(
    currentData || {}
  );

  // Manter valores temporários como string para permitir digitação
  const [receitaTemp, setReceitaTemp] = useState<string>(
    currentData?.receita_gerada_cliente?.toString() || ''
  );
  const [investimentoTemp, setInvestimentoTemp] = useState<string>(
    currentData?.investimento_midia?.toString() || ''
  );

  const handleSave = () => {
    // Converter strings para números ao salvar
    const dataToSave: RequiredFieldsData = {
      ...formData,
      receita_gerada_cliente: receitaTemp ? parseFloat(receitaTemp) : null,
      investimento_midia: investimentoTemp ? parseFloat(investimentoTemp) : null,
    };
    onSave(dataToSave);
  };

  const formatFieldName = (field: string): string => {
    const fieldNames: Record<string, string> = {
      receita_gerada_cliente: 'Receita Gerada ao cliente',
      investimento_midia: 'Total investindo em mídia',
      teve_vendas: 'Já teve Vendas',
      teve_roas_maior_1: 'Já teve ROAS > 1',
      teve_roi_maior_1: 'Já teve ROI > 1',
      nota_nps: 'Nota do ultimo NPS',
    };
    return fieldNames[field] || field;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Campos obrigatórios</DialogTitle>
          <DialogDescription>
            Preencha os campos obrigatórios antes de marcar este negócio como perdido.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Os campos obrigatórios devem ser preenchidos antes que este negócio
            seja marcado como perdido.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          <div className="space-y-2 p-3 bg-muted/50 rounded-md border">
            <h4 className="text-sm font-semibold uppercase tracking-wide">
              NEGÓCIO
            </h4>
          </div>

          {/* Receita Gerada ao cliente */}
          <div className="space-y-2">
            <Label htmlFor="receita_gerada_cliente">
              Receita Gerada ao cliente
              {missingFields.includes('receita_gerada_cliente') && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                id="receita_gerada_cliente"
                type="number"
                step="0.01"
                placeholder="Digite o valor"
                value={receitaTemp}
                onChange={(e) => setReceitaTemp(e.target.value)}
              />
              <Select defaultValue="BRL" disabled>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Brazilian Real (BRL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Total investindo em mídia */}
          <div className="space-y-2">
            <Label htmlFor="investimento_midia">
              Total investindo em mídia
              {missingFields.includes('investimento_midia') && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <div className="flex gap-2">
              <Input
                id="investimento_midia"
                type="number"
                step="0.01"
                placeholder="Digite o valor"
                value={investimentoTemp}
                onChange={(e) => setInvestimentoTemp(e.target.value)}
              />
              <Select defaultValue="BRL" disabled>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Brazilian Real (BRL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Já teve vendas */}
          <div className="space-y-2">
            <Label>
              Já teve vendas
              {missingFields.includes('teve_vendas') && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <ToggleGroup
              type="single"
              value={formData.teve_vendas || '(None)'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  teve_vendas: value === '(None)' ? null : value,
                })
              }
              className="justify-start"
            >
              <ToggleGroupItem value="(None)" aria-label="None">
                (None)
              </ToggleGroupItem>
              <ToggleGroupItem value="Sim" aria-label="Sim">
                Sim
              </ToggleGroupItem>
              <ToggleGroupItem value="Não" aria-label="Não">
                Não
              </ToggleGroupItem>
              <ToggleGroupItem value="Null" aria-label="Null">
                Null
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Já teve ROAS > 1 */}
          <div className="space-y-2">
            <Label>
              Já teve ROAS &gt; 1
              {missingFields.includes('teve_roas_maior_1') && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <ToggleGroup
              type="single"
              value={formData.teve_roas_maior_1 || '(None)'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  teve_roas_maior_1: value === '(None)' ? null : value,
                })
              }
              className="justify-start"
            >
              <ToggleGroupItem value="(None)" aria-label="None">
                (None)
              </ToggleGroupItem>
              <ToggleGroupItem value="Sim" aria-label="Sim">
                Sim
              </ToggleGroupItem>
              <ToggleGroupItem value="Não" aria-label="Não">
                Não
              </ToggleGroupItem>
              <ToggleGroupItem value="Null" aria-label="Null">
                Null
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Já teve ROI > 1 */}
          <div className="space-y-2">
            <Label>
              Já teve ROI &gt; 1
              {missingFields.includes('teve_roi_maior_1') && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <ToggleGroup
              type="single"
              value={formData.teve_roi_maior_1 || '(None)'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  teve_roi_maior_1: value === '(None)' ? null : value,
                })
              }
              className="justify-start"
            >
              <ToggleGroupItem value="(None)" aria-label="None">
                (None)
              </ToggleGroupItem>
              <ToggleGroupItem value="Sim" aria-label="Sim">
                Sim
              </ToggleGroupItem>
              <ToggleGroupItem value="Não" aria-label="Não">
                Não
              </ToggleGroupItem>
              <ToggleGroupItem value="Null" aria-label="Null">
                Null
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Nota NPS */}
          <div className="space-y-2">
            <Label htmlFor="nota_nps">
              Nota do ultimo NPS
              {missingFields.includes('nota_nps') && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <Select
              value={
                formData.nota_nps !== null && formData.nota_nps !== undefined
                  ? String(formData.nota_nps)
                  : 'null'
              }
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  nota_nps: value === 'null' ? null : parseInt(value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="null">null</SelectItem>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
