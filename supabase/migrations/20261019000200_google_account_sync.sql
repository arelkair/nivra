-- Automatic Google account restore. Data is protected by account RLS;
-- unlike legacy account_vaults, this copy is not end-to-end encrypted.
begin;
create table public.account_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (coalesce(jsonb_typeof(payload) = 'object' and payload->>'v' = '2' and jsonb_typeof(payload->'keys') = 'object', false) and octet_length(payload::text) <= 4000000),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.account_sync enable row level security;
revoke all on public.account_sync from public, anon, authenticated;
grant select, insert, delete on public.account_sync to authenticated;
grant update(payload) on public.account_sync to authenticated;
grant all on public.account_sync to service_role;
create policy account_sync_select on public.account_sync for select to authenticated using (user_id = (select auth.uid()));
create policy account_sync_insert on public.account_sync for insert to authenticated with check (user_id = (select auth.uid()));
create policy account_sync_update on public.account_sync for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy account_sync_delete on public.account_sync for delete to authenticated using (user_id = (select auth.uid()));
create function public.account_sync_guard() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  new.user_id := old.user_id;
  return new;
end;
$$;
create trigger account_sync_stamp before update on public.account_sync for each row execute function public.account_sync_guard();
revoke all on function public.account_sync_guard() from public, anon, authenticated;
commit;
