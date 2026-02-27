-- Add nota_po column to csat_responses table
ALTER TABLE public.csat_responses 
ADD COLUMN nota_po integer NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.csat_responses.nota_po IS 'Internal PO rating for CSAT response';