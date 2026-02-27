-- Add tipo_reuniao column to csat_responses table
ALTER TABLE public.csat_responses
ADD COLUMN tipo_reuniao TEXT;