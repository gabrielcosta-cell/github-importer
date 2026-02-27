-- Fix Pedro Brigido's user-specific override denying dashboard view
-- Set can_view = true so role permissions aren't blocked
UPDATE public.user_module_permissions ump
SET can_view = true, updated_at = now()
WHERE ump.user_id = 'd6a3a0e6-b6b7-42cc-85af-425f155276cc'
  AND ump.module_id = (SELECT id FROM public.modules WHERE name = 'dashboard' LIMIT 1);
