-- Atualizar a função trigger para permitir mudança de status mesmo em registros protegidos
-- O status é parte do fluxo normal de negócios e deve poder ser alterado
CREATE OR REPLACE FUNCTION public.prevent_protected_business_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- Campos críticos que NÃO podem ser alterados em registros protegidos
    -- Nota: removemos 'status' desta lista pois é parte do fluxo normal de negócios
    IF (
      NEW.name IS DISTINCT FROM OLD.name OR
      NEW.value IS DISTINCT FROM OLD.value OR
      NEW.source IS DISTINCT FROM OLD.source OR
      NEW.created_by IS DISTINCT FROM OLD.created_by OR
      NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
      RAISE EXCEPTION 'Este registro está protegido. Não é possível alterar campos críticos (nome, valor, origem, criador). Para modificar estes campos, um admin deve primeiro desproteger o registro.';
    END IF;
    
    -- Permitir alterações em outros campos incluindo status, notes, contact_person, email, phone, etc
    RETURN NEW;
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
$function$;