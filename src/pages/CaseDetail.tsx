import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/external-client';
import { Button } from '@/components/ui/button';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dotLogoDark from '@/assets/dot-logo-dark.png';

interface SuccessCase {
  id: string;
  client_name: string;
  nichos: string[];
  titulo_destaque: string;
  descricao_curta: string;
  metricas_badges: string[];
  resumo_case: string;
  como_chegou: string;
  contexto_inicial: string;
  principais_dores: string;
  tentativas_anteriores: string;
  objetivos_alinhados: string;
  metas_entrada: string;
  prazo_analise: string;
  estrategia_dot: string;
  periodo_analisado: string;
  resultados_atingidos: string;
  aprendizados: string;
  cover_image: string | null;
  client_logo: string | null;
}

// Non-breaking space character
const NBSP = "\u00A0";

/**
 * Previne linhas órfãs (2-3 palavras no final) inserindo non-breaking spaces
 * nas últimas palavras de cada parágrafo/sentença
 */
function preventWidows(text: string | null | undefined): string {
  if (!text) return "";

  // Processa cada linha/parágrafo
  return text.split('\n').map(line => {
    const trimmed = line.trim();
    
    // Ignora linhas vazias, headings, blockquotes, code
    if (!trimmed || /^#{1,6}\s/.test(trimmed) || /^>\s/.test(trimmed) || /^```/.test(trimmed)) {
      return line;
    }

    // Para listas, processa apenas o texto após o marcador
    const listMatch = trimmed.match(/^([-*+]\s+|\d+\.\s+)(.*)$/);
    if (listMatch) {
      const marker = listMatch[1];
      const content = listMatch[2];
      return line.replace(content, fixWidows(content));
    }

    return line.replace(trimmed, fixWidows(trimmed));
  }).join('\n');
}

/**
 * Junta as últimas N palavras com non-breaking spaces para evitar quebras
 */
function fixWidows(text: string): string {
  if (!text) return text;
  
  const words = text.split(/\s+/);
  
  // Precisa de pelo menos 4 palavras para fazer sentido
  if (words.length < 4) return text;

  // Tenta juntar as últimas 4-5 palavras se couberem em ~35 caracteres
  for (let n = Math.min(5, words.length - 1); n >= 3; n--) {
    const lastWords = words.slice(-n);
    const chunk = lastWords.join(' ');
    
    if (chunk.length <= 40) {
      const prefix = words.slice(0, -n).join(' ');
      const suffix = lastWords.join(NBSP);
      return prefix ? `${prefix} ${suffix}` : suffix;
    }
  }

  return text;
}

const CaseDetail = () => {
  const { param: slug } = useParams<{ param: string }>();
  const [caseData, setCaseData] = useState<SuccessCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCase();
  }, [slug]);

  const fetchCase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('success_cases')
        .select('*')
        .eq('is_published', true);

      if (error) throw error;

      // Find case by slug
      const foundCase = data?.find(c => {
        const caseSlug = c.client_name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        return caseSlug === slug;
      });

      if (foundCase) {
        setCaseData({
          ...foundCase,
          nichos: foundCase.nichos || [],
          metricas_badges: foundCase.metricas_badges || []
        });
      }
    } catch (error) {
      console.error('Erro ao buscar case:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando case...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Case não encontrado</p>
        <Button asChild>
          <Link to="/cases">Voltar para Cases</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white py-4">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <Link to="/cases">
            <img src={dotLogoDark} alt="DOT" className="h-8 md:h-10" />
          </Link>
        </div>
      </header>

      {/* Back Button */}
      <div className="container mx-auto px-4 pt-8">
        <Button variant="ghost" asChild>
          <Link to="/cases" className="gap-2 text-secondary">
            <ArrowLeft className="h-4 w-4" />
            Voltar para Cases
          </Link>
        </Button>
      </div>

      {/* Hero Section with Cover */}
      <section className="relative">
        {/* Cover Image */}
        {caseData.cover_image && (
          <div className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] overflow-hidden">
            <img
              src={caseData.cover_image}
              alt={caseData.client_name}
              className="w-full h-full object-cover"
            />
            {/* Client Logo overlay */}
            {caseData.client_logo && (
              <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-5 bg-white/30 backdrop-blur-sm rounded-lg md:rounded-xl px-4 md:px-8 py-3 md:py-5">
                <img
                  src={caseData.client_logo}
                  alt={caseData.client_name}
                  className="h-8 md:h-16 object-contain"
                />
                <span className="text-white/80 text-lg md:text-2xl font-light">+</span>
                <img
                  src="/dot-o-dark.png"
                  alt="DOT"
                  className="h-7 md:h-14 object-contain"
                />
              </div>
            )}
          </div>
        )}
        
        {/* Title and description */}
        <div className={`container mx-auto px-4 text-center ${caseData.cover_image ? 'pt-8 md:pt-12' : 'py-12'}`}>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 text-secondary">
            {caseData.titulo_destaque || caseData.client_name}
          </h1>
          
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
            {caseData.descricao_curta || caseData.resumo_case}
          </p>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="prose prose-lg max-w-none space-y-8 [&_h2]:text-secondary [&_p]:text-gray-700 [&_li]:text-gray-700 [&_strong]:text-secondary [&_ul]:text-gray-700 [&_ol]:text-gray-700">
            {caseData.como_chegou && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Como chegou até a DOT</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.como_chegou)}</ReactMarkdown>
              </div>
            )}

            {caseData.contexto_inicial && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Contexto Inicial</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.contexto_inicial)}</ReactMarkdown>
              </div>
            )}

            {caseData.principais_dores && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Principais Dores</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.principais_dores)}</ReactMarkdown>
              </div>
            )}

            {caseData.tentativas_anteriores && (
              <div>
                <h2 className="text-2xl font-bold mb-4">O que já havia sido tentado</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.tentativas_anteriores)}</ReactMarkdown>
              </div>
            )}

            {caseData.objetivos_alinhados && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Objetivos Alinhados</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.objetivos_alinhados)}</ReactMarkdown>
              </div>
            )}

            {caseData.metas_entrada && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Metas na Entrada</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.metas_entrada)}</ReactMarkdown>
              </div>
            )}

            {caseData.prazo_analise && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Prazo / Janela de Análise</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.prazo_analise)}</ReactMarkdown>
              </div>
            )}

            {caseData.estrategia_dot && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Estratégia DOT</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.estrategia_dot)}</ReactMarkdown>
              </div>
            )}

            {caseData.periodo_analisado && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Período Analisado</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.periodo_analisado)}</ReactMarkdown>
              </div>
            )}

            {caseData.resultados_atingidos && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Resultados Atingidos</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.resultados_atingidos)}</ReactMarkdown>
              </div>
            )}

            {caseData.aprendizados && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Aprendizados e Replicabilidade</h2>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{preventWidows(caseData.aprendizados)}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-secondary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Quer resultados assim para sua empresa?
          </h2>
          <p className="text-white/80 mb-8">
            Descubra como a DOT pode transformar seu negócio.
          </p>
          <Button 
            size="lg" 
            className="bg-[#4CAF50] text-white hover:bg-[#43A047] rounded-full px-8"
            asChild
          >
            <a href="https://dotconceito.com.br/nova-lp-bio" target="_blank" rel="noopener noreferrer">
              Falar com a DOT
              <ExternalLink className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-white">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} DOT Marketing. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default CaseDetail;
