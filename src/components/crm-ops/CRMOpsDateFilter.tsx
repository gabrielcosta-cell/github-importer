import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CRMOpsDateFilterProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onApply: (start: Date | undefined, end: Date | undefined) => void;
  onClear: () => void;
}

export const CRMOpsDateFilter: React.FC<CRMOpsDateFilterProps> = ({
  startDate,
  endDate,
  onApply,
  onClear,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [tempStart, setTempStart] = useState<Date | undefined>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | undefined>(endDate);
  const [open, setOpen] = useState(false);

  const hasFilter = startDate || endDate;
  const activeCount = (startDate ? 1 : 0) + (endDate ? 1 : 0);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setStep(1);
      setTempStart(startDate);
      setTempEnd(endDate);
    }
  };

  const handleNext = () => {
    setStep(2);
  };

  const handleApply = () => {
    onApply(tempStart, tempEnd);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9 text-xs relative">
          <CalendarIcon className="h-3.5 w-3.5" />
          Filtros
          {hasFilter && (
            <>
              <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] font-bold">
                {activeCount}
              </span>
              <span
                role="button"
                className="ml-1 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
              >
                <X className="h-3 w-3" />
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-4" align="end">
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
              <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
            </div>
            <span className="text-xs text-muted-foreground">Etapa {step} de 2</span>
          </div>

          {step === 1 && (
            <>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Data de criação do lead</h4>
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione o período de criação dos leads que deseja filtrar.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Data inicial</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left text-xs h-9">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {tempStart ? format(tempStart, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data inicial"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tempStart}
                        onSelect={setTempStart}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block">Data final</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left text-xs h-9">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {tempEnd ? format(tempEnd, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data final"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={tempEnd}
                        onSelect={setTempEnd}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleNext} className="gap-1">
                  Próximo <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Confirmar filtros</h4>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Data inicial:</span>
                  <span className="font-medium">
                    {tempStart ? format(tempStart, "dd/MM/yyyy", { locale: ptBR }) : "Não definida"}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Data final:</span>
                  <span className="font-medium">
                    {tempEnd ? format(tempEnd, "dd/MM/yyyy", { locale: ptBR }) : "Não definida"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button size="sm" onClick={handleApply}>
                  Aplicar filtros
                </Button>
              </div>
            </>
          )}

          <div className="border-t pt-2">
            <span className="text-xs text-muted-foreground">
              {activeCount} filtros ativos
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
