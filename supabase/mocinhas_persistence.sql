-- Run once in the SQL Editor. New names avoid touching existing profiles/posts tables.
-- The app authenticates on its server. The browser has no access to these snapshots.
begin;
create table if not exists public.mocinhas_app_state (
 id text primary key check (id = 'main'),
 revision bigint not null default 0 check (revision >= 0),
 payload jsonb not null check (jsonb_typeof(payload->'users')='array' and jsonb_typeof(payload->'posts')='array'),
 updated_at timestamptz not null default now()
);
create table if not exists public.mocinhas_app_backups (
 id bigint generated always as identity primary key,
 revision bigint not null,
 payload jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.mocinhas_app_state enable row level security;
alter table public.mocinhas_app_backups enable row level security;
-- Remove policies left by older/manual installations, including permissive ones.
do $$
declare p record; col record;
begin
 for p in select tablename,policyname from pg_policies
   where schemaname='public' and tablename in ('mocinhas_app_state','mocinhas_app_backups')
 loop execute format('drop policy %I on public.%I',p.policyname,p.tablename); end loop;
 -- Table REVOKE does not remove explicit grants on individual columns.
 for col in select table_name,column_name from information_schema.columns
   where table_schema='public' and table_name in ('mocinhas_app_state','mocinhas_app_backups')
 loop execute format('revoke all privileges (%I) on public.%I from public, anon, authenticated',col.column_name,col.table_name); end loop;
end $$;
revoke all on public.mocinhas_app_state, public.mocinhas_app_backups from public, anon, authenticated;
grant select,insert,update on public.mocinhas_app_state to service_role;
grant select,insert on public.mocinhas_app_backups to service_role;
revoke all on sequence public.mocinhas_app_backups_id_seq from public, anon, authenticated;
grant usage,select on sequence public.mocinhas_app_backups_id_seq to service_role;
create or replace function public.mocinhas_commit_state(expected_revision bigint,next_payload jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare old_row public.mocinhas_app_state%rowtype;
begin
 select * into old_row from public.mocinhas_app_state where id='main' for update;
 if not found or old_row.revision<>expected_revision then
  raise exception 'Revision conflict' using errcode='40001';
 end if;
 if jsonb_typeof(next_payload->'users') is distinct from 'array' or jsonb_typeof(next_payload->'posts') is distinct from 'array' then
  raise exception 'Invalid payload';
 end if;
 -- Snapshot the previous revision at most once per day, plus before content deletion.
 -- Backup removal is manual; no post or backup is automatically deleted.
 if not exists(select 1 from public.mocinhas_app_backups where created_at > now()-interval '1 day')
    or exists(select 1 from jsonb_array_elements(old_row.payload->'posts') old_post
       where not exists(select 1 from jsonb_array_elements(next_payload->'posts') new_post where new_post->>'id'=old_post->>'id')) then
   insert into public.mocinhas_app_backups(revision,payload) values(old_row.revision,old_row.payload);
 end if;
 update public.mocinhas_app_state set payload=next_payload,revision=expected_revision+1,updated_at=now() where id='main';
 return expected_revision+1;
end;
$$;
revoke all on function public.mocinhas_commit_state(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.mocinhas_commit_state(bigint,jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit)
values('mocinhas-media','mocinhas-media',false,52428800)
on conflict(id) do nothing;
-- Bucket is new/private; no browser RLS grants or public URL is required.
commit;
