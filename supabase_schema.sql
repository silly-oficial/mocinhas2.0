-- ==============================================================================
-- 🌸 MOCINHAS - SCHEMA COMPLETO E DEFINITIVO DO SUPABASE
-- ==============================================================================
-- Como executar:
-- 1. Acesse seu painel no Supabase (https://supabase.com/dashboard)
-- 2. Abra o seu projeto -> Menu lateral esquerdo -> 'SQL Editor'
-- 3. Clique em '+ New query', cole todo o código abaixo e clique em 'Run' (ou Ctrl+Enter)
-- ==============================================================================

-- 0. PERSISTÊNCIA ATUAL: DOCUMENTO JSON E BACKUPS PRIVADOS
-- Mesmo bloqueio de supabase/mocinhas_persistence.sql; executar não apaga payloads.
-- O servidor precisa de SUPABASE_SERVICE_ROLE_KEY. A anon key permanece pública.
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
commit;

-- 1. HABILITAR EXTENSÕES ESSENCIAIS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA DE PERFIS / USUÁRIOS (public.profiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
  banner TEXT DEFAULT 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1200&h=400&fit=crop',
  bio TEXT DEFAULT 'Bem-vinda ao mocinhas 🌸',
  gender TEXT DEFAULT 'feminino',
  is_private BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_expires_at TIMESTAMPTZ,
  anime_title TEXT DEFAULT 'Criadora',
  custom_tag TEXT DEFAULT 'Membro',
  theme_color TEXT DEFAULT '#ec4899',
  website TEXT DEFAULT '',
  recovery_token TEXT,
  accepted_terms BOOLEAN DEFAULT TRUE,
  accepted_terms_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABELA DE CATEGORIAS (public.categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'Tag',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir categorias padrão caso ainda não existam
INSERT INTO public.categories (name, slug, description, icon)
VALUES 
  ('Geral', 'geral', 'Conteúdos gerais e conversas do dia a dia', 'Compass'),
  ('Fotografia', 'fotografia', 'Fotos artísticas, retratos e paisagens', 'Camera'),
  ('Moda & Estilo', 'moda-estilo', 'Looks, inspirações e tendências', 'Sparkles'),
  ('Reels & Vídeos', 'reels', 'Vídeos curtos e clipes divertidos', 'Film'),
  ('Lifestyle', 'lifestyle', 'Rotina, bem-estar, autocuidado e momentos', 'Heart')
ON CONFLICT (slug) DO NOTHING;

-- ==============================================================================
-- 4. TABELA DE POSTS (public.posts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption TEXT DEFAULT '',
  category TEXT DEFAULT 'Geral',
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  location TEXT DEFAULT '',
  allow_comments BOOLEAN DEFAULT TRUE,
  is_temporary BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. MÍDIAS DOS POSTS (public.post_media)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'image' CHECK (type IN ('image', 'video', 'audio', 'pdf', 'gif')),
  filter TEXT DEFAULT 'normal',
  aspect_ratio TEXT DEFAULT 'square',
  thumbnail TEXT,
  file_name TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. CURTIDAS (public.likes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- ==============================================================================
-- 7. ITENS SALVOS / FAVORITOS (public.saved_posts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- ==============================================================================
-- 8. COMENTÁRIOS (public.comments)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. CURTIDAS EM COMENTÁRIOS (public.comment_likes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- ==============================================================================
-- 10. SEGUIDORES E CONEXÕES (public.follows)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ==============================================================================
-- 11. STORIES EFÊMEROS (public.stories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  text_overlay TEXT,
  stickers TEXT[] DEFAULT '{}',
  location TEXT,
  mentions TEXT[] DEFAULT '{}',
  filter TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- ==============================================================================
-- 12. VISUALIZAÇÕES DE STORIES (public.story_views)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

-- ==============================================================================
-- 13. CONVERSAS & GRUPOS (public.conversations)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group BOOLEAN DEFAULT FALSE,
  group_name TEXT,
  group_avatar TEXT,
  group_description TEXT,
  is_public_group BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rules TEXT,
  invite_code TEXT,
  duration_mode TEXT DEFAULT 'permanent',
  message_duration_hours INTEGER DEFAULT 24,
  messages_cleared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 14. MEMBROS DA CONVERSA (public.conversation_members)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- ==============================================================================
-- 15. MENSAGENS DO CHAT (public.messages)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT,
  media_url TEXT,
  media_type TEXT,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 16. NOTIFICAÇÕES (public.notifications)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  text TEXT,
  target_thumbnail TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 17. DENÚNCIAS / MODERAÇÃO (public.reports)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'user', 'comment', 'message')),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 18. BLOQUEIOS (public.blocks)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- ==============================================================================
-- 19. SILENCIAMENTOS (public.mutes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(muter_id, muted_id)
);

-- ==============================================================================
-- 20. CONFIGURAÇÕES GERAIS (public.app_settings)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 21. ÍNDICES DE ALTA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);

-- ==============================================================================
-- 22. ATIVAR REALTIME DO SUPABASE NAS TABELAS PRINCIPAIS
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
  EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- ==============================================================================
-- 23. BUCKET DE ARMAZENAMENTO PÚBLICO (mocinhas-media)
-- ==============================================================================
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('mocinhas-media', 'mocinhas-media', false)
  ON CONFLICT (id) DO UPDATE SET public = false;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Sem leitura ou upload anônimo no bucket; o servidor usa service_role e URLs assinadas.
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public Access Mocinhas" ON storage.objects;
  DROP POLICY IF EXISTS "Allow Uploads Mocinhas" ON storage.objects;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ==============================================================================
-- 24. SEGURANÇA E POLÍTICAS RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- O navegador não acessa contas, mensagens ou dados privados diretamente.
DO $$
DECLARE tbl text; p record;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','categories','posts','post_media','likes','saved_posts','comments','comment_likes','follows','stories','story_views','conversations','conversation_members','messages','notifications','reports','blocks','mutes','app_settings']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tbl
    LOOP EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,tbl); END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',tbl);
  END LOOP;
END $$;
GRANT SELECT ON public.categories, public.app_settings TO anon, authenticated;
CREATE POLICY directory_categories_read ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY directory_settings_read ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
-- app_settings deve conter somente configuração pública; segredos ficam no servidor.
DROP POLICY IF EXISTS "Allow Uploads Mocinhas" ON storage.objects;

-- ==============================================================================
-- 25. TRIGGER AUTOMÁTICO: SINCRONIZAR AUTH.USERS COM PUBLIC.PROFILES
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(COALESCE(NEW.email, 'user'), '@', 1)
  );
  
  final_username := base_username;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id != NEW.id) THEN
    final_username := base_username || '_' || substr(NEW.id::text, 1, 4);
  END IF;

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    email,
    avatar,
    is_admin,
    accepted_terms
  )
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'displayName', base_username),
    COALESCE(NEW.email, NEW.id::text || '@mocinhas.app'),
    COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop'),
    FALSE,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- FIM DO SCRIPT - TABELAS E CONFIGURAÇÕES CRIADAS COM SUCESSO! 🌸✨
-- ==============================================================================

-- 26. VERIFICAÇÃO PÓS-EXECUÇÃO (somente leitura, executar também em produção)
-- Este arquivo não foi aplicado automaticamente no Supabase de produção.
-- A seção 0 aplica a proteção do banco JSON; selecione as consultas abaixo
-- separadamente para verificar produção. Não consulte o payload.
-- Uma anon key é pública: não protege dados se RLS/permissões estiverem incorretas.
-- Resultados esperados: rls_enabled=true, browser_can_read/write=false,
-- browser_can_execute=false e nenhuma política nas duas tabelas privadas.
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
--        has_any_column_privilege('anon', c.oid, 'SELECT') OR
--        has_any_column_privilege('authenticated', c.oid, 'SELECT') AS browser_can_read,
--        has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR
--        has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR
--        has_any_column_privilege('anon', c.oid, 'INSERT,UPDATE,REFERENCES') OR
--        has_any_column_privilege('authenticated', c.oid, 'INSERT,UPDATE,REFERENCES') AS browser_can_write
-- FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
-- WHERE n.nspname='public' AND c.relname IN ('mocinhas_app_state','mocinhas_app_backups');
-- Exigir duas linhas acima; ausência de uma tabela não é aprovação.
-- SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies
-- WHERE schemaname='public' AND tablename IN ('mocinhas_app_state','mocinhas_app_backups');
-- SELECT p.oid::regprocedure AS function_name,
--        has_function_privilege('anon',p.oid,'EXECUTE') OR
--        has_function_privilege('authenticated',p.oid,'EXECUTE') AS browser_can_execute,
--        has_function_privilege('service_role',p.oid,'EXECUTE') AS server_can_execute
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname='public' AND p.proname='mocinhas_commit_state';
-- Exigir a assinatura (bigint,jsonb), browser_can_execute=false e server_can_execute=true.
-- SELECT has_sequence_privilege('anon','public.mocinhas_app_backups_id_seq','USAGE,SELECT,UPDATE') OR
--        has_sequence_privilege('authenticated','public.mocinhas_app_backups_id_seq','USAGE,SELECT,UPDATE') AS browser_can_use_sequence;
-- Esperado: browser_can_use_sequence=false.
