-- Public RPC to fetch approval job by share token (bypasses RLS safely)
create or replace function public.get_approval_job_public(_token uuid)
returns table (
  id uuid,
  title text,
  client_name text,
  description text,
  attached_files jsonb,
  approval_deadline timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, title, client_name, description, attached_files, approval_deadline, created_at
  from public.approval_jobs
  where share_token = _token and status <> 'arquivado';
$$;

-- Ensure fast lookup by token
create index if not exists idx_approval_jobs_share_token on public.approval_jobs(share_token);

-- Allow anonymous access to this function only
revoke all on function public.get_approval_job_public(uuid) from public;
grant execute on function public.get_approval_job_public(uuid) to anon;