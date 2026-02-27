-- Inserir histórico faltante do case Cotafácil
INSERT INTO success_case_copies (client_name, input_context, ai_response, ai_provider, status, copy_type, created_by)
SELECT 
  'Cotafácil',
  'Cliente: Cotafácil - Squad: Apollo - Nicho(s): Investimentos / Finanças, Franquia - Contexto: A Cota Fácil, empresa do segmento de consórcios, já possuía marketing interno estruturado, porém precisava aumentar volume de leads e contar com um time especializado em tráfego pago para acelerar os resultados e escalar o funil comercial.',
  'Case gerado antes da correção - prompt de post estava inativo no momento da criação. Reative o prompt e gere novamente se necessário.',
  'manual',
  'pending',
  'post',
  '81f1f764-0b5f-4366-b058-9e35fffc0460'
WHERE NOT EXISTS (
  SELECT 1 FROM success_case_copies WHERE client_name = 'Cotafácil' AND copy_type = 'post'
);

INSERT INTO success_case_copies (client_name, input_context, ai_response, ai_provider, status, copy_type, created_by)
SELECT 
  'Cotafácil',
  'Cliente: Cotafácil - Squad: Apollo - Nicho(s): Investimentos / Finanças, Franquia - Contexto: A Cota Fácil, empresa do segmento de consórcios, já possuía marketing interno estruturado, porém precisava aumentar volume de leads e contar com um time especializado em tráfego pago para acelerar os resultados e escalar o funil comercial.',
  'Case gerado antes da correção - prompt de blog estava inativo no momento da criação. Reative o prompt e gere novamente se necessário.',
  'manual',
  'pending',
  'blog',
  '81f1f764-0b5f-4366-b058-9e35fffc0460'
WHERE NOT EXISTS (
  SELECT 1 FROM success_case_copies WHERE client_name = 'Cotafácil' AND copy_type = 'blog'
);