-- ============================================================
-- MIGRATION 001: Melhorar RLS Policies
-- ============================================================
-- Rode no SQL Editor do Supabase (selecionar tudo e executar)
-- ============================================================

-- 1. DANOS: DELETE restrito — so usuario com sessao Google pode deletar
DROP POLICY IF EXISTS "Anyone can delete danos" ON public.danos;

CREATE POLICY "Only authenticated can delete danos" ON public.danos
  FOR DELETE USING (auth.jwt() IS NOT NULL);

-- 2. USERS: UPDATE liberado para qualquer um (o login padrao
--    nao usa Supabase Auth, entao nao da pra usar auth.jwt())
DROP POLICY IF EXISTS "Self update or developer" ON public.users;

CREATE POLICY "Anyone can update users" ON public.users
  FOR UPDATE USING (true) WITH CHECK (true);

-- 3. METAS: volta a permitir INSERT/UPDATE para qualquer um
DROP POLICY IF EXISTS "Only developer can insert metas" ON public.metas;
DROP POLICY IF EXISTS "Only developer can update metas" ON public.metas;

CREATE POLICY "Anyone can insert metas" ON public.metas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update metas" ON public.metas
  FOR UPDATE USING (true) WITH CHECK (true);
