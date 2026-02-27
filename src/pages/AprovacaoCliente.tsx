// v2.0 - Página de aprovação com layout atualizado
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { InstagramPostPreview } from "@/components/approval/InstagramPostPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DotLogo } from "@/components/DotLogo";

export default function AprovacaoCliente() {
  const { token } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [clientName, setClientName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"aprovado" | "revisao" | null>(null);

  useEffect(() => {
    loadJob();
  }, [token]);

  async function loadJob() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .rpc("get_approval_job_public", { _token: token });

      if (error) throw error;

      if (!data || data.length === 0) {
        setJob(null);
      } else {
        setJob(data[0]);
      }
    } catch (error) {
      console.error("Error loading job:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o material para aprovação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(status: "aprovado" | "revisao") {
    if (!rating) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione uma avaliação de 1 a 5 estrelas.",
        variant: "destructive",
      });
      return;
    }

    if (!clientName.trim()) {
      toast({
        title: "Atenção",
        description: "Por favor, informe seu nome.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase
        .from("approval_client_feedback")
        .insert({
          job_id: job.id,
          rating,
          comment: comment.trim() || null,
          client_name: clientName.trim(),
          approval_status: status,
        });

      if (error) throw error;

      setApprovalStatus(status);
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar seu feedback. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando material...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Material não encontrado</CardTitle>
            <CardDescription>
              Este link pode estar inválido ou o material foi removido.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const imageFiles = (job.attached_files || [])
    .filter((f: any) => f?.type?.startsWith('image/'))
    .map((f: any) => ({ url: f.url, name: f.name }));

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
        <div className="mb-8">
          <DotLogo size={60} />
        </div>
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {approvalStatus === "aprovado" ? (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              ) : (
                <AlertCircle className="h-16 w-16 text-amber-500" />
              )}
            </div>
            <CardTitle>Obrigado pelo seu feedback!</CardTitle>
            <CardDescription>
              {approvalStatus === "aprovado" 
                ? "Material aprovado com sucesso." 
                : "Suas sugestões de revisão foram registradas."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mb-6 flex justify-center">
        <DotLogo size={48} />
      </div>
      
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Aprovação de Material</CardTitle>
            <CardDescription>
              Cliente: {job.client_name || "Não informado"}
            </CardDescription>
            {job.approval_deadline && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Prazo para aprovação:</strong>{" "}
                {format(new Date(job.approval_deadline), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </p>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
          {/* Material Preview - Left Side */}
          <div className="flex justify-center items-start">
            {imageFiles.length > 0 ? (
              <InstagramPostPreview
                images={imageFiles}
                description={job.description}
                clientName={job.client_name || "Cliente"}
              />
            ) : (
              <Card className="w-full">
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma imagem anexada
                </CardContent>
              </Card>
            )}
          </div>

          {/* Feedback Form - Right Side */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Sua Avaliação</CardTitle>
              <CardDescription>
                Avalie o material e deixe seus comentários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Seu nome</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Digite seu nome"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Avaliação (obrigatório)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110"
                      disabled={submitting}
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= (hoveredRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Comentários (opcional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Deixe seus comentários, sugestões ou aprovação..."
                  rows={4}
                  disabled={submitting}
                  className="resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => handleSubmit("aprovado")}
                  disabled={submitting || !rating || !clientName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {submitting ? "Enviando..." : "Aprovado"}
                </Button>
                <Button
                  onClick={() => handleSubmit("revisao")}
                  disabled={submitting || !rating || !clientName.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {submitting ? "Enviando..." : "Revisão"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
