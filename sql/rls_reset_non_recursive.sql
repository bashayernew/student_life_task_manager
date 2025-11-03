-- Reset non-recursive RLS that does NOT reference any views.
-- Run this in Supabase SQL Editor after commit: open file, copy, run.

-- === tasks ==============================================================
alter table if exists public.tasks enable row level security;

-- Drop old policies (ignore errors if they don't exist)
do $$
begin
  perform 1 from pg_policies where schemaname='public' and tablename='tasks';
  -- drop all existing policies on tasks
  for r in select policyname from pg_policies where schemaname='public' and tablename='tasks'
  loop
    execute format('drop policy if exists %I on public.tasks', r.policyname);
  end loop;
end$$;

-- Read: creator OR assigned user may see the task
create policy tasks_read on public.tasks
for select
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.task_assignees ta
    where ta.task_id = public.tasks.id
      and ta.user_id = auth.uid()
  )
);

-- Insert: only as yourself; created_by must be you
create policy tasks_insert on public.tasks
for insert
with check ( created_by = auth.uid() );

-- Update: creator or assignee may update; created_by stays consistent
create policy tasks_update on public.tasks
for update
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.task_assignees ta
    where ta.task_id = public.tasks.id
      and ta.user_id = auth.uid()
  )
)
with check ( created_by = auth.uid() );

-- Delete: only creator
create policy tasks_delete on public.tasks
for delete
using ( created_by = auth.uid() );

-- === task_assignees =====================================================
alter table if exists public.task_assignees enable row level security;

do $$
begin
  perform 1 from pg_policies where schemaname='public' and tablename='task_assignees';
  for r in select policyname from pg_policies where schemaname='public' and tablename='task_assignees'
  loop
    execute format('drop policy if exists %I on public.task_assignees', r.policyname);
  end loop;
end$$;

-- Read: user can see rows where they are the assignee OR they own the task
create policy task_assignees_read on public.task_assignees
for select
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.tasks t
    where t.id = public.task_assignees.task_id
      and t.created_by = auth.uid()
  )
);

-- Insert: either assigning yourself OR you're the task creator assigning others
create policy task_assignees_insert on public.task_assignees
for insert
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.tasks t
    where t.id = public.task_assignees.task_id
      and t.created_by = auth.uid()
  )
);

-- Update: same rule as read
create policy task_assignees_update on public.task_assignees
for update
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.tasks t
    where t.id = public.task_assignees.task_id
      and t.created_by = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.tasks t
    where t.id = public.task_assignees.task_id
      and t.created_by = auth.uid()
  )
);

-- Delete: creator of the task or the assignee themself
create policy task_assignees_delete on public.task_assignees
for delete
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.tasks t
    where t.id = public.task_assignees.task_id
      and t.created_by = auth.uid()
  )
);

-- IMPORTANT: no views referenced in any USING/WITH CHECK to avoid recursion.

-- Optional: departments are readable by all logged-in users
create policy if not exists departments_read on public.departments
for select
using ( true );

-- Force PostgREST to re-cache
notify pgrst, 'reload schema';

