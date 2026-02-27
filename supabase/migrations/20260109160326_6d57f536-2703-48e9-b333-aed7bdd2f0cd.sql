
-- Criar cópia do card Construlima no funil "Leads ganhos comercial"
INSERT INTO crm_cards (
  title, company_name, contact_name, contact_email, contact_phone,
  monthly_revenue, implementation_value, faturamento_display,
  pipeline_id, stage_id, position,
  assigned_to, created_by, briefing_answers, categoria,
  instagram, website, value, plano, upsell_type, upsell_value,
  qual_clareza_objetivos, qual_investe_marketing, qual_nicho_certo,
  qual_porte_empresa, qual_tomador_decisao, qual_urgencia_real
)
SELECT 
  title, company_name, contact_name, contact_email, contact_phone,
  monthly_revenue, implementation_value, faturamento_display,
  'cd42b8d5-b7d7-482c-bafa-b217b3580fb2', -- pipeline_id: Leads ganhos comercial
  '7b8c0faa-61b7-4a62-b26b-5401bf95b450', -- stage_id: primeira etapa
  0, -- position
  assigned_to, created_by, briefing_answers, categoria,
  instagram, website, value, plano, upsell_type, upsell_value,
  qual_clareza_objetivos, qual_investe_marketing, qual_nicho_certo,
  qual_porte_empresa, qual_tomador_decisao, qual_urgencia_real
FROM crm_cards
WHERE id = 'd17f51b4-ec3c-4bd5-9659-ea2825783699';
