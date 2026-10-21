-- Explicit grants, independent of Supabase's installation defaults.
begin;
revoke all on public.account_vaults from public, anon;
revoke all on public.account_vaults from authenticated;
grant select, insert, update, delete on public.account_vaults to authenticated;
alter table public.account_vaults enable row level security;
alter function public.account_vaults_guard() set search_path = '';
alter function public.vault_stamp(text) set search_path = '';
revoke all on function public.vault_stamp(text) from public, anon, authenticated;
grant execute on function public.vault_stamp(text) to anon, authenticated;
commit;
