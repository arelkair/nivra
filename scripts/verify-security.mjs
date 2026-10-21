import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const root = path.resolve(import.meta.dirname, '..')
const db = new PGlite()
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role bypassrls;
  create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  insert into auth.users values ('${A}'), ('${B}'), ('${C}');
  -- Only the table shape needed by the pre-existing vault_stamp migration.
  -- Legacy vault_get/vault_put are not present in the repository and remain
  -- a required remote audit, not something this test pretends to verify.
  create table public.vaults(id text primary key, payload text, updated_at timestamptz default now());
`)
for (const file of (await fs.readdir(path.join(root, 'supabase/migrations'))).filter(file => file.endsWith('.sql')).sort()) {
  await db.exec(await fs.readFile(path.join(root, 'supabase/migrations', file), 'utf8'))
}
let checks = 0
async function as(role, user, sql, params = []) {
  assert.ok(['anon', 'authenticated'].includes(role))
  await db.exec(`set role ${role}`)
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? ''])
  try { return (await db.query(sql, params)).rows } finally { await db.exec('reset role') }
}
async function denied(role, user, sql, params) { await assert.rejects(as(role, user, sql, params)); checks++ }
async function empty(role, user, sql, params) { assert.equal((await as(role, user, sql, params)).length, 0); checks++ }

await denied('anon', null, 'select * from public.account_vaults')
await as('authenticated', A, 'insert into public.account_vaults(user_id,salt,payload) values ($1,$2,$3)', [A, 'abcdefghijklmnop', 'ciphertext'])
await empty('authenticated', B, 'select * from public.account_vaults')
await denied('authenticated', B, 'insert into public.account_vaults(user_id,salt,payload) values ($1,$2,$3)', [A, 'abcdefghijklmnop', 'overwrite'])
await as('authenticated', A, 'update public.account_vaults set salt=$1,user_id=$2', ['changed-salt-123456', B])
const ownVault = await as('authenticated', A, 'select user_id,salt from public.account_vaults')
assert.deepEqual(ownVault, [{ user_id: A, salt: 'abcdefghijklmnop' }]); checks++

const hash = 'a'.repeat(64)
const payload = JSON.stringify({ v: 2, keys: { 'nivra-tasks': { v: '[]', t: 1 } } })
await denied('anon', null, 'select * from public.account_sync')
await as('authenticated', A, 'insert into public.account_sync(user_id,payload) values ($1,$2::jsonb)', [A, payload])
await empty('authenticated', B, 'select * from public.account_sync')
await denied('authenticated', B, 'insert into public.account_sync(user_id,payload) values ($1,$2::jsonb)', [A, payload])
await empty('authenticated', B, 'update public.account_sync set payload=$1::jsonb where user_id=$2 returning user_id', [payload, A])
await empty('authenticated', B, 'delete from public.account_sync where user_id=$1 returning user_id', [A])
await denied('authenticated', A, 'update public.account_sync set user_id=$1', [B])
await denied('authenticated', A, 'update public.account_sync set updated_at=now()')
await denied('authenticated', A, 'update public.account_sync set payload=$1::jsonb', ['{}'])
const revision = (await as('authenticated', A, 'select updated_at from public.account_sync'))[0].updated_at
await as('authenticated', A, 'update public.account_sync set payload=$1::jsonb where updated_at=$2', [payload, revision])
await empty('authenticated', A, 'update public.account_sync set payload=$1::jsonb where updated_at=$2 returning user_id', [payload, revision])
await as('authenticated', A, 'insert into public.public_notes(token_hash,owner_id,note_id,title,body) values ($1,$2,$3,$4,$5)', [hash, A, 'note-one', 'Published note', 'Only this copy'])
await denied('anon', null, 'select * from public.public_notes')
await empty('authenticated', B, 'select * from public.public_notes')
const publicNote = await as('anon', null, 'select * from public.read_public_note($1)', [hash])
assert.equal(publicNote.length, 1)
assert.deepEqual(Object.keys(publicNote[0]).sort(), ['body', 'created_at', 'expires_at', 'title']); checks++
await empty('anon', null, 'select * from public.read_public_note($1)', ['b'.repeat(64)])
await empty('anon', null, 'select * from public.read_public_note($1)', ["' OR true --"])
await empty('authenticated', B, 'delete from public.public_notes where token_hash=$1 returning token_hash', [hash])
await denied('authenticated', B, 'insert into public.public_notes(token_hash,owner_id,note_id,title,body) values ($1,$2,$3,$4,$5)', ['c'.repeat(64), A, 'stolen', 'No', 'No'])
await as('authenticated', A, 'delete from public.public_notes where token_hash=$1', [hash])
await empty('anon', null, 'select * from public.read_public_note($1)', [hash])

await as('authenticated', A, "insert into public.app_feedback(user_id,body) values ($1,'Private feedback')", [A])
await empty('authenticated', B, 'select * from public.app_feedback')
await denied('anon', null, 'select * from public.app_feedback')
await denied('authenticated', A, "insert into public.app_updates(id,title,body) values ('forged','Forged update','No')")
await db.exec("insert into public.app_updates values ('past','Visible','Public', now()-interval '1 day'), ('future','Hidden','Draft', now()+interval '1 day')")
assert.deepEqual((await as('anon', null, 'select id from public.app_updates')).map(row => row.id), ['past']); checks++
await db.exec(await fs.readFile(path.join(root, 'supabase/audit.sql'), 'utf8'))
console.log(`Database checks passed: ${checks} allow/deny assertions with anon and three users. No remote database contacted.`)
await db.close()
