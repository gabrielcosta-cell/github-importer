-- Create function to list users who have a given module permission
CREATE OR REPLACE FUNCTION public.get_users_with_module_permission(
  module_name text,
  permission_type text DEFAULT 'view'
)
RETURNS TABLE (user_id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure caller has access to this module list (admin or has view permission)
  IF NOT (get_current_user_role() = 'admin' OR user_has_module_permission(auth.uid(), module_name, 'view')) THEN
    RAISE EXCEPTION 'Not authorized to list users for module %', module_name;
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.name
  FROM public.profiles p
  WHERE p.is_active = true
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_module_permissions ump
        JOIN public.modules m ON m.id = ump.module_id
        WHERE ump.user_id = p.user_id
          AND m.name = module_name
          AND (
            CASE
              WHEN permission_type = 'view' THEN ump.can_view
              WHEN permission_type = 'create' THEN ump.can_create
              WHEN permission_type = 'edit' THEN ump.can_edit
              WHEN permission_type = 'delete' THEN ump.can_delete
              ELSE false
            END
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.role_module_permissions rmp
        JOIN public.modules m ON m.id = rmp.module_id
        WHERE rmp.role_id = p.custom_role_id
          AND m.name = module_name
          AND (
            CASE
              WHEN permission_type = 'view' THEN rmp.can_view
              WHEN permission_type = 'create' THEN rmp.can_create
              WHEN permission_type = 'edit' THEN rmp.can_edit
              WHEN permission_type = 'delete' THEN rmp.can_delete
              ELSE false
            END
          )
      )
    );
END;
$$;