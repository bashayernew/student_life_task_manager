-- Safe RLS policies to fix infinite recursion issues
-- Run this in your Supabase SQL Editor

-- TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks select" ON public.tasks;
CREATE POLICY "tasks select" ON public.tasks
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "tasks insert by owner" ON public.tasks;
CREATE POLICY "tasks insert by owner" ON public.tasks
FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "tasks update by owner" ON public.tasks;
CREATE POLICY "tasks update by owner" ON public.tasks
FOR UPDATE USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- TASK_ASSIGNEES
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignees select" ON public.task_assignees;
CREATE POLICY "assignees select" ON public.task_assignees
FOR SELECT USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid())
);

DROP POLICY IF EXISTS "assignees insert by task owner" ON public.task_assignees;
CREATE POLICY "assignees insert by task owner" ON public.task_assignees
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid())
);

DROP POLICY IF EXISTS "assignees update by owner or self" ON public.task_assignees;
CREATE POLICY "assignees update by owner or self" ON public.task_assignees
FOR UPDATE USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid())
) WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.created_by = auth.uid())
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

