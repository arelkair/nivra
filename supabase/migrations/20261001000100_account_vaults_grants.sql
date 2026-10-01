-- RLS does not cover TRUNCATE, and the API never needs these privileges.
revoke truncate, references, trigger on public.account_vaults from authenticated;
