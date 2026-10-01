-- Cheap change check for code-based vaults: returns only the timestamp, so a
-- device can tell whether anything changed without downloading the blob.
create or replace function public.vault_stamp(vault_id text)
returns timestamptz
language sql
stable
security definer
set search_path to 'public'
as $$
  select v.updated_at from public.vaults v where v.id = vault_id;
$$;

-- One end-to-end encrypted vault per Google account. The key is derived on the
-- device from a passphrase and a per-user salt; the server only ever stores the
-- salt and ciphertext.
create table public.account_vaults (
  user_id uuid primary key references auth.users (id) on delete cascade,
  salt text not null check (length(salt) between 16 and 64),
  payload text not null check (length(payload) <= 4000000),
  updated_at timestamptz not null default now()
);

alter table public.account_vaults enable row level security;

revoke all on public.account_vaults from anon;

create policy "account_vaults_select_own" on public.account_vaults
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "account_vaults_insert_own" on public.account_vaults
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "account_vaults_update_own" on public.account_vaults
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "account_vaults_delete_own" on public.account_vaults
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- The server owns the timestamp, and the salt can never change after creation
-- (changing it would make the existing ciphertext undecryptable).
create or replace function public.account_vaults_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.salt := old.salt;
  end if;
  return new;
end;
$$;

revoke execute on function public.account_vaults_guard() from public, anon, authenticated;

create trigger account_vaults_guard
  before insert or update on public.account_vaults
  for each row execute function public.account_vaults_guard();
