-- Adicionar coluna de proteção na tabela businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS is_protected BOOLEAN DEFAULT false;

-- Marcar TODOS os registros existentes como protegidos
UPDATE public.businesses 
SET is_protected = true 
WHERE is_protected = false OR is_protected IS NULL;

-- Criar função para prevenir modificações em registros protegidos
CREATE OR REPLACE FUNCTION public.prevent_protected_business_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se for UPDATE e o registro está protegido
  IF (TG_OP = 'UPDATE' AND OLD.is_protected = true) THEN
    -- Permitir apenas alteração do próprio campo is_protected por admins
    IF (NEW.is_protected IS DISTINCT FROM OLD.is_protected) THEN
      IF get_current_user_role() != 'admin' THEN
        RAISE EXCEPTION 'Cannot modify protection status. Admin only.';
      END IF;
      -- Se admin está apenas mudando is_protected, permitir
      IF (NEW.is_protected = false) THEN
        RETURN NEW;
      END IF;
    END IF;
    
    -- Bloquear qualquer outra modificação em registro protegido
    RAISE EXCEPTION 'Este registro está protegido e não pode ser modificado. Para modificar, um admin deve primeiro desproteger o registro.';
  END IF;
  
  -- Se for DELETE e o registro está protegido
  IF (TG_OP = 'DELETE' AND OLD.is_protected = true) THEN
    RAISE EXCEPTION 'Este registro está protegido e não pode ser deletado. Para deletar, um admin deve primeiro desproteger o registro.';
  END IF;
  
  -- Se for INSERT, novos registros não ficam protegidos automaticamente
  IF (TG_OP = 'INSERT') THEN
    NEW.is_protected = false;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE para businesses
DROP TRIGGER IF EXISTS protect_businesses_trigger ON public.businesses;
CREATE TRIGGER protect_businesses_trigger
  BEFORE UPDATE OR DELETE OR INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_protected_business_changes();

-- Comentário explicativo
COMMENT ON COLUMN public.businesses.is_protected IS 'Quando true, o registro não pode ser modificado ou deletado exceto por admins que primeiro desprotejam o registro';