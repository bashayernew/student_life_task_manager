-- Safe, idempotent RPC for deleting a staff member (non-admin).
-- Run this once in Supabase SQL editor if you don't use migrations.

drop function if exists public.delete_staff_member(uuid);

create or replace function public.delete_staff_member(member_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Remove task assignees
  delete from public.task_assignees
  where user_id = member_user_id;

  -- Remove department membership ONLY if table exists (keeps idempotent)
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name   = 'department_members'
  ) then
    execute 'delete from public.department_members where user_id = $1'
    using member_user_id;
  end if;

  -- Remove profile (never delete admins)
  delete from public.profiles
  where id = member_user_id
    and coalesce(role, 'staff') <> 'admin';
end;
$$;

grant execute on function public.delete_staff_member(uuid) to authenticated, anon;

-- Refresh PostgREST so the function becomes visible immediately
notify pgrst, 'reload schema';

