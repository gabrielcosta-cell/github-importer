import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MonthYearPickerProps {
  selectedPeriods: { month: number; year: number }[];
  onPeriodsChange: (periods: { month: number; year: number }[]) => void;
  singleSelect?: boolean;
  minYear?: number;
  minMonth?: number;
  /** When true, renders as inline ghost button for bordered toolbar containers */
  inlineStyle?: boolean;
}

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const MonthYearPicker = ({ selectedPeriods, onPeriodsChange, singleSelect = false, minYear, minMonth, inlineStyle = false }: MonthYearPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());

  const togglePeriod = (month: number, year: number) => {
    // Check if month/year is before minimum
    if (minYear !== undefined && minMonth !== undefined) {
      if (year < minYear || (year === minYear && month < minMonth)) {
        return;
      }
    }
    
    const exists = selectedPeriods.some(p => p.month === month && p.year === year);
    if (exists) {
      onPeriodsChange(selectedPeriods.filter(p => !(p.month === month && p.year === year)));
    } else {
      if (singleSelect) {
        onPeriodsChange([{ month, year }]);
      } else {
        onPeriodsChange([...selectedPeriods, { month, year }]);
      }
    }
  };

  const isPeriodSelected = (month: number, year: number) => {
    return selectedPeriods.some(p => p.month === month && p.year === year);
  };

  const formatPeriod = (period: { month: number; year: number }) => {
    return `${MONTHS[period.month]}/${period.year}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant={inlineStyle ? "ghost" : "outline"} 
          className={cn(
            "justify-start text-left font-normal gap-2",
            inlineStyle ? "rounded-none h-9 px-3 min-w-0" : "min-w-[200px]"
          )}
        >
          <Calendar className="h-4 w-4" />
          {selectedPeriods.length === 0 ? (
            <span className="text-muted-foreground">Selecione períodos</span>
          ) : selectedPeriods.length === 1 ? (
            <span>{formatPeriod(selectedPeriods[0])}</span>
          ) : (
            <span>{selectedPeriods.length} períodos</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          {/* Year Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewYear(v => v - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold">{viewYear}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewYear(v => v + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((month, index) => (
              <Button
                key={month}
                variant={isPeriodSelected(index, viewYear) ? "default" : "outline"}
                size="sm"
                className={cn(
                  "text-xs",
                  isPeriodSelected(index, viewYear) && "bg-primary text-primary-foreground"
                )}
                onClick={() => togglePeriod(index, viewYear)}
              >
                {month}
              </Button>
            ))}
          </div>

          {/* Selected Periods */}
          {selectedPeriods.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2 border-t">
              {selectedPeriods.map((period, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="gap-1"
                >
                  {formatPeriod(period)}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPeriodsChange(selectedPeriods.filter((_, idx) => idx !== i));
                    }}
                  />
                </Badge>
              ))}
            </div>
          )}

          {/* Clear All */}
          {selectedPeriods.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => onPeriodsChange([])}
            >
              Limpar seleção
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
