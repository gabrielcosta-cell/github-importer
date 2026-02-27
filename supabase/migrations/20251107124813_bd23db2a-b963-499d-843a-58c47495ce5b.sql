-- Unificar os campos value e monthly_revenue em monthly_revenue
-- Regras:
-- 1. Se apenas um campo estiver preenchido, usar esse valor
-- 2. Se ambos estiverem preenchidos e forem iguais, usar qualquer um
-- 3. Se ambos estiverem preenchidos mas diferentes, usar o maior valor

UPDATE public.crm_cards
SET monthly_revenue = CASE
  -- Se ambos são nulos, manter null
  WHEN value IS NULL AND monthly_revenue IS NULL THEN NULL
  -- Se apenas value está preenchido, usar value
  WHEN monthly_revenue IS NULL THEN value
  -- Se apenas monthly_revenue está preenchido, manter monthly_revenue
  WHEN value IS NULL THEN monthly_revenue
  -- Se ambos estão preenchidos e são iguais, manter monthly_revenue
  WHEN value = monthly_revenue THEN monthly_revenue
  -- Se ambos estão preenchidos mas são diferentes, usar o maior
  ELSE GREATEST(value, monthly_revenue)
END
WHERE value IS NOT NULL OR monthly_revenue IS NOT NULL;

-- Opcional: Limpar o campo value após a migração para evitar confusão
-- (Mantemos o campo no schema para não quebrar código, mas zeramos os valores)
UPDATE public.crm_cards SET value = NULL WHERE value IS NOT NULL;