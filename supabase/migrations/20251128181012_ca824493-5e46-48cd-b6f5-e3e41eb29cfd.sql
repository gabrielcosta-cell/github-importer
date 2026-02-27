-- Inserir os 3 clientes faltantes com categoria MRR Vendido
INSERT INTO crm_cards (
  title,
  company_name,
  pipeline_id,
  stage_id,
  created_by,
  categoria,
  monthly_revenue,
  position
) VALUES 
  (
    'CENTROMINAS',
    'CENTROMINAS',
    '1242a985-2f74-4b4a-bc0e-c045a3951d65',
    '94f3f6c9-4a58-433a-a3cc-42a38515263e',
    '81f1f764-0b5f-4366-b058-9e35fffc0460',
    'MRR Vendido',
    0,
    0
  ),
  (
    'Paragon',
    'Paragon',
    '1242a985-2f74-4b4a-bc0e-c045a3951d65',
    '94f3f6c9-4a58-433a-a3cc-42a38515263e',
    '81f1f764-0b5f-4366-b058-9e35fffc0460',
    'MRR Vendido',
    0,
    0
  ),
  (
    'JBLOG',
    'JBLOG',
    '1242a985-2f74-4b4a-bc0e-c045a3951d65',
    '94f3f6c9-4a58-433a-a3cc-42a38515263e',
    '81f1f764-0b5f-4366-b058-9e35fffc0460',
    'MRR Vendido',
    0,
    0
  );