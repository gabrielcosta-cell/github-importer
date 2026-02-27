import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/external-client";
import { toast } from "sonner";
import { DotLogo } from "@/components/DotLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findCSMCard, recordFormSubmissionInHistory } from "@/utils/findCSMCard";

const formSchema = z.object({
  empresa: z.string().min(1, "Nome da empresa é obrigatório"),
  responsavel: z.string().min(1, "Nome do responsável é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  cnpj: z.string().optional(),
  recomendacao: z.number().min(1).max(10),
  sentimento_sem_dot: z.string().min(1, "Este campo é obrigatório"),
  observacoes: z.string().min(1, "Observações são obrigatórias"),
});

type FormData = z.infer<typeof formSchema>;

export default function FormNPS() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Buscar card do CSM correspondente (prioriza CNPJ se preenchido)
      const csmCard = await findCSMCard(data.email, data.empresa, data.responsavel, data.cnpj);

      // Inserir resposta do NPS
      const { error } = await supabase.from("nps_responses").insert({
        empresa: data.empresa,
        responsavel: data.responsavel,
        email: data.email,
        cnpj: data.cnpj || null,
        recomendacao: data.recomendacao,
        sentimento_sem_dot: data.sentimento_sem_dot,
        observacoes: data.observacoes,
        card_id: csmCard?.cardId || null,
      });

      if (error) throw error;

      // Se encontrou card do CSM, registrar no histórico
      if (csmCard) {
        await recordFormSubmissionInHistory(
          csmCard.cardId,
          csmCard.stageId,
          'NPS',
          data.responsavel,
          data.email
        );
      }

      setSubmitted(true);
      toast.success("Pesquisa enviada com sucesso!");
    } catch (error) {
      console.error("Error submitting NPS:", error);
      toast.error("Erro ao enviar pesquisa. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
        <DotLogo size={80} className="mb-8" />
        <Card className="w-full max-w-2xl p-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Obrigado!</h1>
          <p className="text-muted-foreground text-lg">
            Sua resposta foi registrada com sucesso. Agradecemos seu tempo!
          </p>
        </Card>
      </div>
    );
  }

  const sentimentOptions = [
    "Muito decepcionado",
    "Um pouco decepcionado",
    "Não mudaria nada",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted px-0 py-6 md:p-4 md:py-12">
      <div className="w-full md:max-w-3xl md:mx-auto">
        <div className="text-center mb-8 px-4">
          <div className="flex justify-center mb-6">
            <DotLogo size={80} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Pesquisa de NPS</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Queremos melhorar constantemente e para isso precisamos da sua opinião.
          </p>
          <p className="text-muted-foreground mt-2">Desde já muito obrigado pelo seu tempo!</p>
        </div>

        <Card className="p-4 md:p-8 rounded-none md:rounded-lg border-x-0 md:border-x">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="empresa">
                Nome da Empresa <span className="text-destructive">*</span>
              </Label>
              <Input id="empresa" {...register("empresa")} />
              {errors.empresa && <p className="text-sm text-destructive">{errors.empresa.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">
                Responsável pelo preenchimento <span className="text-destructive">*</span>
              </Label>
              <Input id="responsavel" {...register("responsavel")} />
              {errors.responsavel && <p className="text-sm text-destructive">{errors.responsavel.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Seu e-mail <span className="text-destructive">*</span>
              </Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ da empresa</Label>
              <Input id="cnpj" {...register("cnpj")} placeholder="00.000.000/0000-00" />
            </div>

            <div className="space-y-3">
              <Label>
                Em uma escala de 1 a 10, o quanto você indicaria a DOT para um amigo ou parente?{" "}
                <span className="text-destructive">*</span>
              </Label>

              {/* Mobile (até md): Select dropdown */}
              <div className="md:hidden">
                <Select
                  value={watch("recomendacao")?.toString() || ""}
                  onValueChange={(value) => setValue("recomendacao", Number(value), { shouldValidate: true })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma nota de 1 a 10" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                      const getColor = () => {
                        if (num <= 6) return "hsl(var(--destructive))";
                        if (num <= 8) return "hsl(var(--warning))";
                        return "hsl(var(--success))";
                      };

                      return (
                        <SelectItem key={num} value={num.toString()}>
                          <span style={{ color: getColor() }} className="font-semibold">
                            {num}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {num <= 6 ? "(Detrator)" : num <= 8 ? "(Neutro)" : "(Promotor)"}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop (md+): botões circulares */}
              <RadioGroup
                value={watch("recomendacao")?.toString()}
                onValueChange={(value) => setValue("recomendacao", Number(value), { shouldValidate: true })}
                className="hidden md:flex justify-between w-full"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = watch("recomendacao") === num;
                  const getColor = () => {
                    if (num <= 6) return "hsl(var(--destructive))";
                    if (num <= 8) return "hsl(var(--warning))";
                    return "hsl(var(--success))";
                  };

                  return (
                    <div key={num} className="flex flex-col items-center">
                      <RadioGroupItem value={num.toString()} id={`recomendacao-${num}`} className="peer sr-only" />
                      <Label
                        htmlFor={`recomendacao-${num}`}
                        className="cursor-pointer relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:scale-110"
                        style={{
                          boxShadow: `inset 0 0 0 3px ${getColor()}`,
                          backgroundColor: isSelected ? getColor() : "hsl(var(--background))",
                        }}
                      >
                        <span
                          className="text-base font-semibold transition-colors"
                          style={{ color: isSelected ? "hsl(var(--primary-foreground))" : getColor() }}
                        >
                          {num}
                        </span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
              {errors.recomendacao && <p className="text-sm text-destructive">{errors.recomendacao.message}</p>}
            </div>

            <div className="space-y-3">
              <Label>
                Como você se sentiria se a DOT não existisse mais? <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={watch("sentimento_sem_dot")}
                onValueChange={(value) => setValue("sentimento_sem_dot", value, { shouldValidate: true })}
                className="flex flex-col gap-2"
              >
                {sentimentOptions.map((option) => (
                  <div key={option} className="flex items-center">
                    <RadioGroupItem value={option} id={`sentimento-${option}`} className="peer sr-only" />
                    <Label
                      htmlFor={`sentimento-${option}`}
                      className="cursor-pointer w-full px-4 py-3 rounded-md border border-input hover:bg-accent peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground transition-colors"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {errors.sentimento_sem_dot && <p className="text-sm text-destructive">{errors.sentimento_sem_dot.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">
                Deixe alguma observação/comentário <span className="text-destructive">*</span>
              </Label>
              <Textarea id="observacoes" {...register("observacoes")} rows={4} />
              {errors.observacoes && <p className="text-sm text-destructive">{errors.observacoes.message}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
