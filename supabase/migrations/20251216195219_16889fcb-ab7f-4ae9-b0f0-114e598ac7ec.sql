-- Inserir case de sucesso Cross Equipamentos
INSERT INTO success_cases (
  client_name,
  squad,
  owner,
  nichos,
  contexto_inicial,
  como_chegou,
  principais_dores,
  tentativas_anteriores,
  objetivos_alinhados,
  metas_entrada,
  prazo_analise,
  estrategia_dot,
  periodo_analisado,
  resultados_atingidos,
  aprendizados,
  insights_replicaveis,
  resumo_case,
  titulo_destaque,
  descricao_curta,
  metricas_badges,
  is_published,
  is_featured,
  display_order,
  dot_logo_variant,
  created_by
) VALUES (
  'Cross Equipamentos',
  NULL,
  NULL,
  ARRAY['B2B', 'Varejo'],
  'A Cross Equipamentos é uma empresa que vende equipamentos de academia específicos para academias de crossfit. Antes do nosso trabalho, nunca tinham vendido através do marketing digital, nunca rodaram campanhas, não tinham CRM e nunca tinham feito nenhum trabalho para o digital ou captado qualquer tipo de lead.',
  'O cliente chegou até nós em um cenário onde não acreditava 100% que o marketing digital poderia trazer resultado, justamente por nunca ter testado nada relacionado a isso anteriormente.',
  'As principais dores eram: vendas apenas através de indicação ou orgânico (muito fraco), sem nenhuma previsibilidade de vendas. Além disso, o nicho é extremamente específico - uma agulha no palheiro: academias especificamente de crossfit.',
  'Absolutamente nada havia sido tentado antes em referência ao marketing digital. Esse era o principal problema porque o cliente não acreditava 100% que o marketing poderia trazer resultado.',
  'O objetivo era trazer as primeiras vendas e fazer com que o investimento apenas se pagasse. Essa era a primeira expectativa, que foi superada muito além do imaginado.',
  'Realizar as primeiras vendas através do digital.',
  '45 dias',
  'Nossa estratégia foi implementar criativos que realmente falassem com o público-alvo, comunicando diretamente com o público de academias de crossfit. Usamos termos que só os donos de academia entenderiam, fazendo com que soubessem que era para eles. Também criamos criativos que segmentassem para quem queria comprar equipamento, evitando confusão com academias de crossfit. Mesmo com criativos estáticos, conseguimos converter bastante antes mesmo dos anúncios em vídeo serem produzidos. Implementamos um CRM para controlar exatamente o dia que estava vindo cada cadastro qualificado e aumentar as conversões.',
  '45 dias (com análise de 1 ano completo)',
  'Investimos R$ 2.500 em apenas 45 dias e faturamos mais de R$ 100.000 em vendas diretas. Saímos de uma operação que nunca tinha vendido no marketing digital para uma operação que vendeu mais de R$ 100 mil em apenas 45 dias de projeto.',
  'Criativos que segmentam um público, mesmo que muito nichado, conseguem chegar ao público-alvo com eficiência.',
  'A estratégia de utilizar o WhatsApp funciona desde que haja um CRM que realmente consiga rastrear de onde está vindo cada lead.',
  'Investimos R$ 2.500 e faturamos mais de R$ 100.000 em 45 dias partindo de uma operação que nunca havia vendido no marketing digital.',
  'De R$ 0 a R$ 100 mil em 45 dias: Como a Cross Equipamentos conquistou o digital',
  'Empresa de equipamentos para crossfit que nunca tinha vendido online faturou mais de R$ 100 mil com apenas R$ 2.500 de investimento em 45 dias.',
  ARRAY['+R$ 100k faturados', '45 dias', 'R$ 2.500 investidos', 'ROI 40x'],
  true,
  true,
  1,
  'dark',
  (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)
);

-- Inserir histórico de cópia IA (post Instagram)
INSERT INTO success_case_copies (
  client_name,
  input_context,
  ai_response,
  ai_provider,
  status,
  copy_type,
  created_by
) VALUES (
  'Cross Equipamentos',
  'Case de sucesso: Cross Equipamentos - De R$ 0 a R$ 100 mil em 45 dias no marketing digital. Nicho: Equipamentos para academias de crossfit. Investimento: R$ 2.500. Faturamento: +R$ 100.000.',
  'Slide 1: "Nunca vendemos pelo digital"
Era isso que a Cross Equipamentos acreditava.

Slide 2: O desafio?
Vender equipamentos para academias de CROSSFIT.
Um nicho tão específico que parecia impossível.

Slide 3: A estratégia
✓ Criativos que só donos de academia entenderiam
✓ CRM para rastrear cada lead
✓ WhatsApp como canal de conversão

Slide 4: O resultado
💰 R$ 2.500 investidos
📈 +R$ 100.000 faturados
⏱️ Em apenas 45 dias

Slide 5: De ZERO vendas digitais para mais de R$ 100 mil.
Esse é o poder de uma estratégia bem executada.

Slide 6: Quer resultados assim para o seu negócio?
Fale com a DOT 👇',
  'manual_creation',
  'completed',
  'post',
  (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)
);

-- Inserir histórico de cópia IA (blog article)
INSERT INTO success_case_copies (
  client_name,
  input_context,
  ai_response,
  ai_provider,
  status,
  copy_type,
  created_by
) VALUES (
  'Cross Equipamentos',
  'Case de sucesso: Cross Equipamentos - De R$ 0 a R$ 100 mil em 45 dias no marketing digital. Nicho: Equipamentos para academias de crossfit.',
  '# De R$ 0 a R$ 100 mil em 45 dias: Como a Cross Equipamentos conquistou o digital

## O Desafio: Um nicho que parecia impossível

A Cross Equipamentos vendia equipamentos especializados para academias de crossfit - um nicho tão específico que encontrar clientes era como procurar uma agulha no palheiro. Antes de conhecer a DOT, a empresa nunca tinha vendido através do marketing digital. Sem campanhas, sem CRM, sem nenhuma estrutura digital.

O ceticismo era real: como vender um produto tão nichado pela internet?

## A Estratégia que Mudou Tudo

Nossa abordagem foi cirúrgica:

1. **Criativos que falam a língua do cliente**: Usamos termos que só donos de academia de crossfit entenderiam, criando identificação imediata.

2. **Segmentação inteligente**: Diferenciamos quem queria comprar equipamentos de quem buscava uma academia para treinar.

3. **CRM para rastreabilidade**: Implementamos um sistema que mostrava exatamente de onde vinha cada lead qualificado.

4. **WhatsApp como canal de conversão**: Combinado com o CRM, transformamos conversas em vendas.

## Os Resultados Falam por Si

Em apenas **45 dias**:
- 💰 **Investimento**: R$ 2.500
- 📈 **Faturamento**: +R$ 100.000
- 🚀 **ROI**: 40x o valor investido

De uma operação que NUNCA tinha vendido no digital para mais de R$ 100 mil em menos de dois meses.

## O Que Isso Significa Para Você

Se você acha que seu nicho é específico demais para o marketing digital, a Cross Equipamentos prova o contrário. Com a estratégia certa, qualquer mercado pode ser alcançado.

**Pronto para transformar seu negócio?** [Fale com a DOT](https://dotconceito.com.br/nova-lp-bio)',
  'manual_creation',
  'completed',
  'blog',
  (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)
);