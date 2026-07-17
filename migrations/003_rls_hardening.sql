-- ============================================================
-- MIGRATION 003: Hardening RLS — autorização server-side
-- ============================================================
-- Rode no SQL Editor do Supabase (selecionar tudo e executar)
-- ============================================================

-- Habilita RLS em todas as tabelas (caso ainda não esteja)
ALTER TABLE public.danos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

-- Remove policies antigas para recriar
DROP POLICY IF EXISTS "Enable read for all users" ON public.danos;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.danos;
DROP POLICY IF EXISTS "Enable update for all users" ON public.danos;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.danos;
DROP POLICY IF EXISTS "Anyone can read danos" ON public.danos;
DROP POLICY IF EXISTS "Anyone can insert danos" ON public.danos;
DROP POLICY IF EXISTS "Anyone can delete danos" ON public.danos;
DROP POLICY IF EXISTS "Authenticated can insert danos" ON public.danos;
DROP POLICY IF EXISTS "Authenticated can delete danos" ON public.danos;
DROP POLICY IF EXISTS "Only authenticated can delete danos" ON public.danos;

-- ============================================================
-- DANOS
-- ============================================================
-- SELECT: liberado para todos (dashboard público)
CREATE POLICY "danos_select_public" ON public.danos
  FOR SELECT USING (true);

-- INSERT: apenas com sessão Supabase Auth válida
CREATE POLICY "danos_insert_auth" ON public.danos
  FOR INSERT WITH CHECK (auth.jwt() IS NOT NULL);

-- UPDATE: apenas com sessão Supabase Auth válida
CREATE POLICY "danos_update_auth" ON public.danos
  FOR UPDATE USING (auth.jwt() IS NOT NULL) WITH CHECK (auth.jwt() IS NOT NULL);

-- DELETE: apenas com sessão Supabase Auth válida
CREATE POLICY "danos_delete_auth" ON public.danos
  FOR DELETE USING (auth.jwt() IS NOT NULL);

-- ============================================================
-- USERS
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read users" ON public.users;
DROP POLICY IF EXISTS "Anyone can insert users" ON public.users;
DROP POLICY IF EXISTS "Anyone can update users" ON public.users;
DROP POLICY IF EXISTS "Authenticated can update users" ON public.users;
DROP POLICY IF EXISTS "Self update or developer" ON public.users;

-- SELECT: liberado (dashboard precisa listar usuários)
CREATE POLICY "users_select_public" ON public.users
  FOR SELECT USING (true);

-- INSERT: liberado para cadastro inicial via login
CREATE POLICY "users_insert_public" ON public.users
  FOR INSERT WITH CHECK (true);

-- UPDATE: apenas com sessão auth — evita que qualquer um altere roles
CREATE POLICY "users_update_auth" ON public.users
  FOR UPDATE USING (auth.jwt() IS NOT NULL) WITH CHECK (auth.jwt() IS NOT NULL);

-- DELETE: apenas com sessão auth
CREATE POLICY "users_delete_auth" ON public.users
  FOR DELETE USING (auth.jwt() IS NOT NULL);

-- ============================================================
-- METAS
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read metas" ON public.metas;
DROP POLICY IF EXISTS "Anyone can insert metas" ON public.metas;
DROP POLICY IF EXISTS "Anyone can update metas" ON public.metas;
DROP POLICY IF EXISTS "Authenticated can insert metas" ON public.metas;
DROP POLICY IF EXISTS "Authenticated can update metas" ON public.metas;

-- SELECT: liberado
CREATE POLICY "metas_select_public" ON public.metas
  FOR SELECT USING (true);

-- INSERT: apenas com auth
CREATE POLICY "metas_insert_auth" ON public.metas
  FOR INSERT WITH CHECK (auth.jwt() IS NOT NULL);

-- UPDATE: apenas com auth
CREATE POLICY "metas_update_auth" ON public.metas
  FOR UPDATE USING (auth.jwt() IS NOT NULL) WITH CHECK (auth.jwt() IS NOT NULL);

-- DELETE: apenas com auth
CREATE POLICY "metas_delete_auth" ON public.metas
  FOR DELETE USING (auth.jwt() IS NOT NULL);

-- ============================================================
-- FROTA
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read frota" ON public.frota;
DROP POLICY IF EXISTS "Only authenticated can insert frota" ON public.frota;
DROP POLICY IF EXISTS "Authenticated can insert frota" ON public.frota;

-- SELECT: liberado
CREATE POLICY "frota_select_public" ON public.frota
  FOR SELECT USING (true);

-- INSERT: apenas com auth
CREATE POLICY "frota_insert_auth" ON public.frota
  FOR INSERT WITH CHECK (auth.jwt() IS NOT NULL);

-- UPDATE: apenas com auth
CREATE POLICY "frota_update_auth" ON public.frota
  FOR UPDATE USING (auth.jwt() IS NOT NULL) WITH CHECK (auth.jwt() IS NOT NULL);

-- DELETE: apenas com auth
CREATE POLICY "frota_delete_auth" ON public.frota
  FOR DELETE USING (auth.jwt() IS NOT NULL);
