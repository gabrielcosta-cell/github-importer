-- Criar tabela para armazenar customizações dos labels do formulário de briefing
CREATE TABLE IF NOT EXISTS public.briefing_form_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key TEXT NOT NULL UNIQUE,
  label_text TEXT,
  description_text TEXT,
  section_title TEXT,
  section_description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.briefing_form_labels ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos podem ler, apenas admins podem editar
CREATE POLICY "Anyone can view form labels"
  ON public.briefing_form_labels
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert form labels"
  ON public.briefing_form_labels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update form labels"
  ON public.briefing_form_labels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_briefing_form_labels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_briefing_form_labels_updated_at
  BEFORE UPDATE ON public.briefing_form_labels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_briefing_form_labels_updated_at();

-- Inserir labels padrão para todas as seções
INSERT INTO public.briefing_form_labels (field_key, section_title, section_description) VALUES
  ('section_meetings', 'Reuniões', 'Transcrições das reuniões realizadas com o cliente. Copie e cole a transcrição da IA que grava as nossas calls.'),
  ('section_structure', 'Estrutura da Landing Page', 'Tamanho da LP'),
  ('section_company', 'Empresa & Oferta', 'Dados do negócio e do que é vendido (produto ou serviço).'),
  ('section_audience', 'Público, Jornada & Mídia', 'Dados do público, jornada de compra e canais de mídia.')
ON CONFLICT (field_key) DO NOTHING;

-- Inserir labels padrão para cada campo
INSERT INTO public.briefing_form_labels (field_key, label_text, description_text) VALUES
  ('reuniao_boas_vindas', 'Reunião de Boas-Vindas', 'Cole a transcrição ou link da gravação da primeira call.'),
  ('reuniao_kick_off', 'Reunião de Kick-Off', 'Cole a transcrição ou link da reunião de kickoff.'),
  ('reuniao_brainstorm', 'Reunião de Brainstorm', 'Cole a transcrição ou link da call de Brainstorm.'),
  ('tamanho_lp', 'Defina o tamanho da página de vendas (seleção única)', NULL),
  ('nome_empresa', 'Nome da empresa', 'Informe o nome da empresa. EX: Sul solar'),
  ('nicho_empresa', 'Nicho da empresa', 'Informe o nicho da empresa EX: Energia solar, escritório de investimento, Varejo'),
  ('site', 'Site', 'Insira a URL principal do site do cliente'),
  ('servicos_produtos', 'Produtos/Serviços', 'Descreva os principais produtos/serviços. EX: Instalação de placas solares para residências e empresas'),
  ('investimento_medio', 'Planos/Preços/Ticket', 'Liste pacotes/planos com respectivos preços e periodicidade. EX: Ticket médio de R$ 5.000 para instalar placas solares'),
  ('informacao_extra', 'Garantias/Bônus', 'Indique garantias, testes, brindes, contrato mínimo ou políticas especiais caso tenha. EX: Garantimos uma redução na sua conta de luz ou seu dinheiro de volta'),
  ('diferencial_competitivo', 'Diferenciais competitivos', 'Explique por que escolhem a empresa… EX: Preço, agilidade na entrega e condição de parcelamento de até 48x diretamente com a empresa.'),
  ('publico_alvo', 'Público-alvo', 'Descreva seu público-alvo… Lembre-se que isso ajude a qualificar o lead e criar copys que qualifiquem mais seu público EX: Empresas e pessoas físicas que gastam mais de R$ 600 em conta de luz e buscam redução de custos na energia'),
  ('avatar_principal', 'Persona', 'Descreva 1 perfil típico, com nome fictício, papel, meta principal, maior medo e canal onde consome. EX: Empresário que tem conta de luz de R$ 1.000 reais, fica na mão da empresa distribuidora de energia aumentar ou não os preços e ao invés de investir em algo que reduz custos, está gastando em conta de energia que nunca volta para o bolso dele.'),
  ('principal_inimigo', 'Dores/Problemas', 'Liste 3-5 principais dores atuais que a oferta resolve. EX: Redução de custos, previsão de gasto mensal, trocar um custo por um investimento que retorna ao longo prazo.'),
  ('maior_objecao', 'Objeções', 'Aponte 2-4 barreiras na hora de comprar EX: O investimento é muito alto e não consigo parcelar'),
  ('pergunta_qualificatoria', 'Gatilho de qualificação de público', 'Gatilho inicial para qualificar o lead, aqui você precisa de uma frase curta para colocar no início dos roteiros e criativos e qualificar o lead. EX: "Você gasta pelo menos R$600 por mês em conta de luz?"'),
  ('crencas_mitos', 'Crenças/Mitos do mercado', 'Registre crenças comuns que atrapalham a compra. EX: Demora para instalação e obras'),
  ('momento_jornada', 'Estágio da Jornada (seleção única)', 'Qual o nível médio de consciência do público:'),
  ('cases_impressionantes', 'Cases de Sucesso', 'Descreva resultados importantes que esse cliente já obteve com seus serviços ou produtos. EX: Uma indústria que atendemos reduziu a conta de luz de R$2.500 para apenas R$750.'),
  ('numeros_certificados', 'Certificações/Números relevantes ou empresas que confiam na gente', 'Registre certificações, selos, indicadores e reconhecimentos úteis. EX: Mais de 1.000 projetos de placas solares instalados em todo o Rio Grande do Sul. Uma das maiores empresas do estado. Atendemos: Nestle, DOT, Rolex, XP, Petobras')
ON CONFLICT (field_key) DO NOTHING;