import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Upload, Link, FileText, Users, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type StageRequirement = {
  field: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'file';
  required: boolean;
  placeholder?: string;
  fileType?: string;
};

type StageRequirementsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetStage: string;
  requirements: StageRequirement[];
  currentValues: Record<string, any>;
  onSubmit: (values: Record<string, any>, files?: File[]) => Promise<void>;
  onCancel: () => void;
};

export function StageRequirementsDialog({
  open,
  onOpenChange,
  targetStage,
  requirements,
  currentValues,
  onSubmit,
  onCancel,
}: StageRequirementsDialogProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, any>>(currentValues);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (field: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async () => {
    // Validate all required fields
    const missingFields = requirements.filter(req => {
      if (!req.required) return false;
      if (req.type === 'file') {
        return !files[req.field] && !currentValues[req.field];
      }
      return !values[req.field]?.trim();
    });

    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: `Preencha: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const fileArray = Object.values(files).filter(Boolean) as File[];
      await onSubmit(values, fileArray.length > 0 ? fileArray : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStageTitle = () => {
    switch (targetStage) {
      case 'triagem': return 'Mover para Triagem';
      case 'aguardando_briefings': return 'Mover para Aguardando Briefings';
      case 'analise_briefings': return 'Mover para Análise de Briefings';
      case 'call_agendada': return 'Mover para Call Agendada';
      case 'call_realizada': return 'Mover para Call Realizada';
      default: return 'Mover Card';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {getStageTitle()}
          </DialogTitle>
          <DialogDescription>
            Para mover este card, preencha os campos obrigatórios abaixo:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {requirements.map((req) => (
            <div key={req.field} className="space-y-2">
              <Label htmlFor={req.field} className="flex items-center gap-1">
                {req.label}
                {req.required && <span className="text-destructive">*</span>}
              </Label>
              
              {req.type === 'text' && (
                <Input
                  id={req.field}
                  value={values[req.field] || ''}
                  onChange={(e) => setValues(prev => ({ ...prev, [req.field]: e.target.value }))}
                  placeholder={req.placeholder}
                />
              )}
              
              {req.type === 'textarea' && (
                <Textarea
                  id={req.field}
                  value={values[req.field] || ''}
                  onChange={(e) => setValues(prev => ({ ...prev, [req.field]: e.target.value }))}
                  placeholder={req.placeholder}
                  rows={3}
                />
              )}
              
              {req.type === 'url' && (
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id={req.field}
                    type="url"
                    className="pl-10"
                    value={values[req.field] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [req.field]: e.target.value }))}
                    placeholder={req.placeholder || "https://..."}
                  />
                </div>
              )}
              
              {req.type === 'file' && (
                <div className="space-y-2">
                  {files[req.field] ? (
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm truncate max-w-[300px]">
                          {files[req.field]?.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleFileChange(req.field, null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : currentValues[req.field] ? (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Arquivo já anexado</span>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Clique para anexar</span>
                      <input
                        type="file"
                        className="hidden"
                        accept={req.fileType}
                        onChange={(e) => handleFileChange(req.field, e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
