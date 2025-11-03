-- Create view for task assignees to avoid RLS policy issues
-- This view expands task_assignees with all related task, user, and department data
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE VIEW public.v_task_assignees_expanded AS
SELECT 
  ta.task_id,
  ta.user_id,
  ta.status,
  ta.updated_at,
  ta.created_at as assignment_created_at,
  
  -- Task fields
  t.title as task_title,
  t.description as task_description,
  t.due_date as task_due_date,
  t.due_at as task_due_at,
  t.priority as task_priority,
  t.status as task_status,
  t.created_at as task_created_at,
  t.department_id as task_department_id,
  t.created_by as task_created_by,
  
  -- Created by user fields
  cb.id as created_by_id,
  cb.full_name as created_by_name,
  cb.email as created_by_email,
  cb.role as created_by_role,
  
  -- Department fields
  d.id as department_id,
  d.name as department_name,
  
  -- Assigned user fields (the person the task is assigned to)
  u.id as assigned_user_id,
  u.full_name as assigned_user_name,
  u.email as assigned_user_email,
  u.role as assigned_user_role

FROM public.task_assignees ta
LEFT JOIN public.tasks t ON ta.task_id = t.id
LEFT JOIN public.profiles cb ON t.created_by = cb.id
LEFT JOIN public.departments d ON t.department_id = d.id
LEFT JOIN public.profiles u ON ta.user_id = u.id;

-- Grant access to authenticated users
GRANT SELECT ON public.v_task_assignees_expanded TO authenticated;

-- Enable RLS on the view (views inherit RLS from underlying tables, but we can be explicit)
ALTER VIEW public.v_task_assignees_expanded SET (security_invoker = true);

-- Test the view (optional - you can comment this out)
-- SELECT * FROM public.v_task_assignees_expanded LIMIT 5;

