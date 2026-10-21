begin;
create table public.public_notes (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  note_id text not null,
  title text not null check (length(title) <= 200),
  body text not null check (octet_length(body) <= 200000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create table public.app_updates (
  id text primary key,
  title text not null check (length(title) between 1 and 200),
  body text not null check (length(body) <= 20000),
  published_at timestamptz not null default now()
);
create table public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  update_id text,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.public_notes enable row level security;
alter table public.app_updates enable row level security;
alter table public.app_feedback enable row level security;
revoke all on public.public_notes, public.app_updates, public.app_feedback from public, anon, authenticated;
grant select, insert, delete on public.public_notes to authenticated;
grant select on public.app_updates to anon, authenticated;
grant select, insert on public.app_feedback to authenticated;
grant all on public.public_notes, public.app_updates, public.app_feedback to service_role;
create policy public_notes_owner_select on public.public_notes for select to authenticated using (owner_id = (select auth.uid()));
create policy public_notes_owner_insert on public.public_notes for insert to authenticated with check (owner_id = (select auth.uid()) and expires_at > now() and expires_at <= now() + interval '31 days');
create policy public_notes_owner_delete on public.public_notes for delete to authenticated using (owner_id = (select auth.uid()));
create policy updates_public_read on public.app_updates for select to anon, authenticated using (published_at <= now());
create policy feedback_own_read on public.app_feedback for select to authenticated using (user_id = (select auth.uid()));
create policy feedback_own_insert on public.app_feedback for insert to authenticated with check (user_id = (select auth.uid()));

-- Narrow capability lookup, never grant anonymous table listing of notes.
create function public.read_public_note(p_token_hash text)
returns table(title text, body text, created_at timestamptz, expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select n.title, n.body, n.created_at, n.expires_at from public.public_notes n
  where n.token_hash = p_token_hash and p_token_hash ~ '^[0-9a-f]{64}$' and n.expires_at > now();
$$;
revoke all on function public.read_public_note(text) from public, anon, authenticated;
grant execute on function public.read_public_note(text) to anon, authenticated;
commit;
