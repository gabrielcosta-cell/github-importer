-- Inserir cópia do lead Isocompositos no pipeline "Leads ganhos comercial"
INSERT INTO crm_cards (
  title, company_name, contact_name, contact_email, contact_phone,
  pipeline_id, stage_id, position,
  monthly_revenue, implementation_value, value, categoria, plano,
  assigned_to, created_by,
  qual_clareza_objetivos, qual_investe_marketing, qual_nicho_certo,
  qual_porte_empresa, qual_tomador_decisao, qual_urgencia_real,
  briefing_answers,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_url
)
SELECT 
  title, company_name, contact_name, contact_email, contact_phone,
  'cd42b8d5-b7d7-482c-bafa-b217b3580fb2' as pipeline_id, -- Leads ganhos comercial
  '7b8c0faa-61b7-4a62-b26b-5401bf95b450' as stage_id, -- Leads ganhos (primeira etapa)
  0 as position,
  monthly_revenue, implementation_value, value, categoria, plano,
  assigned_to, created_by,
  qual_clareza_objetivos, qual_investe_marketing, qual_nicho_certo,
  qual_porte_empresa, qual_tomador_decisao, qual_urgencia_real,
  briefing_answers,
  utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_url
FROM crm_cards 
WHERE id = '8e4873ae-d16c-4b94-a7f1-a909a5109846';