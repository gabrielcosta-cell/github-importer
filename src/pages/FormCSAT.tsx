import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DotLogo } from "@/components/DotLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { findCSMCard, recordFormSubmissionInHistory } from "@/utils/findCSMCard";
import { useSearchParams } from "react-router-dom";

const tiposReuniao = ["Check-in", "Boas-Vindas", "Kick-Off", "Planejamento Estratégico"] as const;

// Mapeamento dos parâmetros da URL para os tipos de reunião
const urlParamToTipoReuniao: Record<string, string> = {
  "check-in": "Check-in",
  "boas-vindas": "Boas-Vindas",
  "kick-off": "Kick-Off",
  "planejamento": "Planejamento Estratégico",
};

const ratingOptions = [
  { value: 1, label: "Muito\nInsatisfeito", emoji: "😠", bgColor: "bg-red-700", hoverColor: "hover:bg-red-600", selectedColor: "bg-red-700" },
  { value: 2, label: "Insatisfeito", emoji: "😞", bgColor: "bg-red-500", hoverColor: "hover:bg-red-400", selectedColor: "bg-red-500" },
  { value: 3, label: "Neutro", emoji: "😐", bgColor: "bg-yellow-500", hoverColor: "hover:bg-yellow-400", selectedColor: "bg-yellow-500" },
  { value: 4, label: "Satisfeito", emoji: "🙂", bgColor: "bg-lime-500", hoverColor: "hover:bg-lime-400", selectedColor: "bg-lime-500" },
  { value: 5, label: "Muito\nSatisfeito", emoji: "😄", bgColor: "bg-green-600", hoverColor: "hover:bg-green-500", selectedColor: "bg-green-600" },
];

// Schema para Check-in (3 perguntas)
const checkInSchema = z.object({
  empresa: z.string().min(1, "Nome da empresa é obrigatório"),
  responsavel: z.string().min(1, "Nome do responsável é obrigatório"),
  email: z.string().email("E-mail inválido").min(1, "E-mail é obrigatório"),
  tipo_reuniao: z.literal("Check-in"),
  nota_atendimento: z.number().min(1).max(5),
  nota_performance: z.number().min(1).max(5),
  nota_conteudo: z.number().min(1).max(5),
  observacoes: z.string().min(1, "Observações são obrigatórias"),
});

// Schema para outras reuniões (1 pergunta única)
const otherMeetingSchema = z.object({
  empresa: z.string().min(1, "Nome da empresa é obrigatório"),
  responsavel: z.string().min(1, "Nome do responsável é obrigatório"),
  email: z.string().email("E-mail inválido").min(1, "E-mail é obrigatório"),
  tipo_reuniao: z.enum(["Boas-Vindas", "Kick-Off", "Planejamento Estratégico"]),
  nota_reuniao: z.number().min(1).max(5),
  observacoes: z.string().min(1, "Observações são obrigatórias"),
});

// Schema combinado para validação flexível
const formSchema = z.object({
  empresa: z.string().min(1, "Nome da empresa é obrigatório"),
  responsavel: z.string().min(1, "Nome do responsável é obrigatório"),
  email: z.string().email("E-mail inválido").min(1, "E-mail é obrigatório"),
  tipo_reuniao: z.string().min(1, "Tipo de reunião é obrigatório"),
  nota_atendimento: z.number().min(1).max(5).optional(),
  nota_performance: z.number().min(1).max(5).optional(),
  nota_conteudo: z.number().min(1).max(5).optional(),
  nota_reuniao: z.number().min(1).max(5).optional(),
  observacoes: z.string().min(1, "Observações são obrigatórias"),
}).refine((data) => {
  if (data.tipo_reuniao === "Check-in") {
    return data.nota_atendimento !== undefined && 
           data.nota_performance !== undefined && 
           data.nota_conteudo !== undefined;
  } else {
    return data.nota_reuniao !== undefined;
  }
}, {
  message: "Por favor, responda todas as perguntas obrigatórias",
  path: ["nota_reuniao"],
});

type FormData = z.infer<typeof formSchema>;

interface EmojiRatingProps {
  value: number | undefined;
  onChange: (value: number) => void;
  name: string;
}

const EmojiRating = ({ value, onChange, name }: EmojiRatingProps) => {
  return (
    <div className="flex flex-wrap justify-start gap-3 sm:gap-4">
      {ratingOptions.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex flex-col items-center gap-2 transition-all duration-200 ${
              isSelected ? "scale-110" : "opacity-70 hover:opacity-100"
            }`}
          >
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl transition-all duration-200 ${
                isSelected
                  ? `${option.selectedColor} ring-4 ring-offset-2 ring-offset-background ring-white/50`
                  : `${option.bgColor} ${option.hoverColor}`
              }`}
            >
              {option.emoji}
            </div>
            <span className="text-xs text-center text-muted-foreground whitespace-pre-line leading-tight h-8 flex items-center justify-center">
              {option.label}
            </span>
            <span className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
              {option.value}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default function FormCSAT() {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Verificar se o tipo de reunião veio da URL
  const tipoFromUrl = searchParams.get("tipo");
  const mappedTipoFromUrl = tipoFromUrl ? urlParamToTipoReuniao[tipoFromUrl.toLowerCase()] : null;
  const isTypeFromUrl = !!mappedTipoFromUrl;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      empresa: "",
      responsavel: "",
      email: "",
      tipo_reuniao: mappedTipoFromUrl || "",
      nota_atendimento: undefined,
      nota_performance: undefined,
      nota_conteudo: undefined,
      nota_reuniao: undefined,
      observacoes: "",
    },
  });

  // Definir o tipo de reunião da URL quando o componente carregar
  useEffect(() => {
    if (mappedTipoFromUrl) {
      setValue("tipo_reuniao", mappedTipoFromUrl);
    }
  }, [mappedTipoFromUrl, setValue]);

  const tipoReuniao = watch("tipo_reuniao");
  const isCheckIn = tipoReuniao === "Check-in";

  // Limpar notas quando muda o tipo de reunião
  useEffect(() => {
    if (tipoReuniao) {
      if (isCheckIn) {
        setValue("nota_reuniao", undefined);
      } else {
        setValue("nota_atendimento", undefined);
        setValue("nota_performance", undefined);
        setValue("nota_conteudo", undefined);
      }
    }
  }, [tipoReuniao, isCheckIn, setValue]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Buscar card do CSM correspondente
      const csmCard = await findCSMCard(data.email, data.empresa, data.responsavel);

      // Para Check-in: usar as 3 notas
      // Para outras reuniões: usar nota_reuniao para todas as 3 colunas (mesma nota)
      const nota_atendimento = isCheckIn ? data.nota_atendimento! : data.nota_reuniao!;
      const nota_performance = isCheckIn ? data.nota_performance! : data.nota_reuniao!;
      const nota_conteudo = isCheckIn ? data.nota_conteudo! : data.nota_reuniao!;

      // Inserir resposta do CSAT
      const { error } = await supabase.from("csat_responses").insert({
        empresa: data.empresa,
        responsavel: data.responsavel,
        email: data.email,
        tipo_reuniao: data.tipo_reuniao,
        nota_atendimento,
        nota_performance,
        nota_conteudo,
        observacoes: data.observacoes,
        card_id: csmCard?.cardId || null,
      });

      if (error) throw error;

      // Se encontrou card do CSM, registrar no histórico
      if (csmCard) {
        await recordFormSubmissionInHistory(
          csmCard.cardId,
          csmCard.stageId,
          'CSAT',
          data.responsavel,
          data.email
        );
      }

      setSubmitted(true);
      toast.success("Pesquisa enviada com sucesso!");
    } catch (error) {
      console.error("Error submitting CSAT:", error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <DotLogo size={80} />
          </div>
          <h1 className="text-4xl font-bold mb-4">Pesquisa de CSAT</h1>
          <p className="text-muted-foreground text-lg">
            Queremos melhorar constantemente e para isso precisamos da sua opinião.
          </p>
          <p className="text-muted-foreground mt-2">Desde já muito obrigado pelo seu tempo!</p>
        </div>

        <Card className="p-8">
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

            {/* Campo de seleção de tipo de reunião - oculto quando vem da URL */}
            {!isTypeFromUrl && (
              <div className="space-y-2">
                <Label>
                  Tipo de reunião <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch("tipo_reuniao") || ""}
                  onValueChange={(value) => setValue("tipo_reuniao", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo de reunião" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposReuniao.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo_reuniao && <p className="text-sm text-destructive">{errors.tipo_reuniao.message}</p>}
              </div>
            )}

            {/* Perguntas condicionais baseadas no tipo de reunião */}
            {tipoReuniao && (
              <>
                {isCheckIn ? (
                  // Check-in: 3 perguntas separadas
                  <>
                    <div className="space-y-4">
                      <Label>
                        Qual seu nível de satisfação em relação ao atendimento da DOT? <span className="text-destructive">*</span>
                      </Label>
                      <EmojiRating
                        value={watch("nota_atendimento")}
                        onChange={(value) => setValue("nota_atendimento", value)}
                        name="nota_atendimento"
                      />
                      {errors.nota_atendimento && <p className="text-sm text-destructive text-center">{errors.nota_atendimento.message}</p>}
                    </div>

                    <div className="space-y-4">
                      <Label>
                        Qual seu nível de satisfação em relação aos resultados gerados pelas campanhas da DOT? <span className="text-destructive">*</span>
                      </Label>
                      <EmojiRating
                        value={watch("nota_performance")}
                        onChange={(value) => setValue("nota_performance", value)}
                        name="nota_performance"
                      />
                      {errors.nota_performance && <p className="text-sm text-destructive text-center">{errors.nota_performance.message}</p>}
                    </div>

                    <div className="space-y-4">
                      <Label>
                        Qual seu nível de satisfação em relação as últimas entregas realizadas (criativos, vídeos e LPs)? <span className="text-destructive">*</span>
                      </Label>
                      <EmojiRating
                        value={watch("nota_conteudo")}
                        onChange={(value) => setValue("nota_conteudo", value)}
                        name="nota_conteudo"
                      />
                      {errors.nota_conteudo && <p className="text-sm text-destructive text-center">{errors.nota_conteudo.message}</p>}
                    </div>
                  </>
                ) : (
                  // Outras reuniões: 1 pergunta única
                  <div className="space-y-4">
                    <Label>
                      Qual seu nível de satisfação em relação a nossa reunião de {tipoReuniao}? <span className="text-destructive">*</span>
                    </Label>
                    <EmojiRating
                      value={watch("nota_reuniao")}
                      onChange={(value) => setValue("nota_reuniao", value)}
                      name="nota_reuniao"
                    />
                    {errors.nota_reuniao && <p className="text-sm text-destructive text-center">{errors.nota_reuniao.message}</p>}
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacoes">
                Deixe alguma observação/comentário <span className="text-destructive">*</span>
              </Label>
              <Textarea id="observacoes" {...register("observacoes")} rows={4} />
              {errors.observacoes && <p className="text-sm text-destructive">{errors.observacoes.message}</p>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !tipoReuniao}>
              {isSubmitting ? "Enviando..." : "Enviar"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
