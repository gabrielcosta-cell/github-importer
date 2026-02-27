-- Remover a palavra "Padrão" das funções SDR e Closer
UPDATE custom_roles 
SET display_name = 'SDR'
WHERE name = 'sdr_standard' AND display_name = 'SDR Padrão';

UPDATE custom_roles 
SET display_name = 'Closer'
WHERE name = 'closer_standard' AND display_name = 'Closer Padrão';