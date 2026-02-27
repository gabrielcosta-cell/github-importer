import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FinalOutcome = 'revertido' | 'cancelado' | null;

type FinalOutcomeButtonsProps = {
  currentOutcome: FinalOutcome;
  onOutcomeChange: (outcome: FinalOutcome) => Promise<void>;
  onCanceladoClick?: () => void;
  compact?: boolean;
};

export function FinalOutcomeButtons({
  currentOutcome,
  onOutcomeChange,
  onCanceladoClick,
  compact = false,
}: FinalOutcomeButtonsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<FinalOutcome>(null);

  const handleOutcome = async (outcome: FinalOutcome) => {
    setConfirmDialog(null);
    setIsUpdating(true);
    try {
      await onOutcomeChange(outcome);
    } finally {
      setIsUpdating(false);
    }
  };

  if (compact) {
    // Badge display for Kanban cards
    if (currentOutcome === 'revertido') {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Revertido
        </Badge>
      );
    }
    if (currentOutcome === 'cancelado') {
      return (
        <Badge className="bg-red-500/20 text-red-600 border-red-500/30 hover:bg-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelado
        </Badge>
      );
    }
    return null;
  }

  // Full buttons for detail view
  return (
    <>
      <div className="space-y-3">
        <p className="text-sm font-medium">Resultado da Retenção</p>
        <div className="flex gap-2">
          <Button
            variant={currentOutcome === 'revertido' ? 'default' : 'outline'}
            className={currentOutcome === 'revertido' 
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
              : 'border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10'
            }
            onClick={() => setConfirmDialog('revertido')}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Cliente Revertido
          </Button>
          
          <Button
            variant={currentOutcome === 'cancelado' ? 'default' : 'outline'}
            className={currentOutcome === 'cancelado' 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'border-red-500/50 text-red-600 hover:bg-red-500/10'
            }
            onClick={() => onCanceladoClick ? onCanceladoClick() : setConfirmDialog('cancelado')}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Cliente Cancelado
          </Button>
        </div>
        
        {currentOutcome && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setConfirmDialog(null)}
            disabled={isUpdating}
          >
            Limpar resultado
          </Button>
        )}
      </div>

      <AlertDialog open={confirmDialog !== null} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog === 'revertido' 
                ? 'Confirmar Cliente Revertido' 
                : 'Confirmar Cancelamento'
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog === 'revertido'
                ? 'Você confirma que o cliente foi revertido e continuará com os serviços?'
                : 'Você confirma que o cliente decidiu cancelar definitivamente?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog === 'revertido' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-red-600 hover:bg-red-700'
              }
              onClick={() => handleOutcome(confirmDialog)}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function FinalOutcomeBadge({ outcome }: { outcome: FinalOutcome }) {
  if (outcome === 'revertido') {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
        <CheckCircle className="h-3 w-3 mr-1" />
        Revertido
      </Badge>
    );
  }
  if (outcome === 'cancelado') {
    return (
      <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
        <XCircle className="h-3 w-3 mr-1" />
        Cancelado
      </Badge>
    );
  }
  return null;
}
