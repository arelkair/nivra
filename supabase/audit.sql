-- READ ONLY. Run against the resumed project before applying local migrations.
-- Capture the actual legacy schema, policies and RPC bodies: the repository
-- did not contain the original vault_get/vault_put definitions.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename, policyname;

select grantee, table_name, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('PUBLIC', 'anon', 'authenticated')
order by table_name, grantee, privilege_type;

select p.oid::regprocedure as signature, p.prosecdef as security_definer,
       p.proconfig as function_settings, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' order by p.oid::regprocedure::text;

select routine_name, grantee, privilege_type from information_schema.role_routine_grants
where routine_schema = 'public' and grantee in ('PUBLIC', 'anon', 'authenticated')
order by routine_name, grantee;
