import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { PublicPageWithSidebar } from "@/components/PublicPageWithSidebar";

type FormType = "nps" | "csat" | "churn" | null;
type ReunionType = "check-in" | "boas-vindas" | "kick-off" | "planejamento" | null;

const GerarForms = () => {
  const [formType, setFormType] = useState<FormType>(null);
  const [reunionType, setReunionType] = useState<ReunionType>(null);
  const [copied, setCopied] = useState(false);

  const baseUrl = "https://skala.dotconceito.com";

  const getNPSLink = () => `${baseUrl}/pesquisa-nps`;
  const getChurnLink = () => `${baseUrl}/solicitacao-cancelamento`;

  const getCSATLink = () => {
    if (!reunionType) return "";
    return `${baseUrl}/pesquisa-csat?tipo=${encodeURIComponent(reunionType)}`;
  };

  const copyToClipboard = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormTypeChange = (value: string) => {
    setFormType(value as FormType);
    setReunionType(null);
    setCopied(false);
  };

  const handleReunionTypeChange = (value: string) => {
    setReunionType(value as ReunionType);
    setCopied(false);
  };

  const reunionOptions = [
    { value: "check-in", label: "Check-in" },
    { value: "boas-vindas", label: "Boas vindas" },
    { value: "kick-off", label: "Kick-off" },
    { value: "planejamento", label: "Planejamento" },
  ];

  return (
    <PublicPageWithSidebar>
      <div className="container mx-auto p-6 max-w-2xl min-h-screen flex items-center justify-center">
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Gerar Formulários</CardTitle>
            <CardDescription>
              Selecione o tipo de formulário e gere o link para compartilhar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seleção do tipo de formulário */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Formulário</label>
              <Select value={formType || ""} onValueChange={handleFormTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de formulário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nps">NPS</SelectItem>
                  <SelectItem value="csat">CSAT</SelectItem>
                  <SelectItem value="churn">CHURN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Se for NPS, mostra o botão de copiar direto */}
            {formType === "nps" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Button 
                  onClick={() => copyToClipboard(getNPSLink())} 
                  className="w-full"
                  variant={copied ? "secondary" : "default"}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Link
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Se for Churn, mostra o botão de copiar direto */}
            {formType === "churn" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Button 
                  onClick={() => copyToClipboard(getChurnLink())} 
                  className="w-full"
                  variant={copied ? "secondary" : "default"}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Link
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Se for CSAT, mostra seleção de tipo de reunião */}
            {formType === "csat" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Reunião</label>
                  <Select value={reunionType || ""} onValueChange={handleReunionTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de reunião" />
                    </SelectTrigger>
                    <SelectContent>
                      {reunionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Mostra o botão após selecionar o tipo de reunião */}
                {reunionType && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <Button 
                      onClick={() => copyToClipboard(getCSATLink())} 
                      className="w-full"
                      variant={copied ? "secondary" : "default"}
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Link
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicPageWithSidebar>
  );
};

export default GerarForms;
