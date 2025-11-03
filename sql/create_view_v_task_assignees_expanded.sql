-- Create expanded view for task assignees to avoid RLS recursion issues
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE VIEW public.v_task_assignees_expanded AS
SELECT
  ta.user_id,
  ta.status,
  ta.updated_at,
  ta.created_at as assignment_created_at,
  t.id            AS task_id,
  t.title,
  t.description,
  t.priority,
  t.due_at        AS due_date,       -- alias for UI compatibility
  t.department_id,
  t.created_at    AS task_created_at,
  t.created_by    AS task_created_by,
  p.id            AS created_by_id,
  p.full_name     AS created_by_full_name,
  p.email         AS created_by_email,
  p.role          AS created_by_role,
  d.name          AS department_name
FROM public.task_assignees ta
JOIN public.tasks t             ON t.id  = ta.task_id
LEFT JOIN public.profiles p     ON p.id  = t.created_by
LEFT JOIN public.departments d  ON d.id  = t.department_id;

-- Grant access to authenticated users
GRANT SELECT ON public.v_task_assignees_expanded TO authenticated;

-- Enable RLS on the view (views inherit RLS from underlying tables)
ALTER VIEW public.v_task_assignees_expanded SET (security_invoker = true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

