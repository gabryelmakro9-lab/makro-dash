-- ============================================================
-- MIGRATION 002: Tabela frota (dados dos equipamentos)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.frota (
  bem TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.frota ENABLE ROW LEVEL SECURITY;

-- Leitura permitida para qualquer usuario logado (dashboard precisa)
CREATE POLICY "Anyone can read frota" ON public.frota
  FOR SELECT USING (true);

-- Insercao em massa via script de migracao (usa service_role, ignora RLS)
CREATE POLICY "Only authenticated can insert frota" ON public.frota
  FOR INSERT WITH CHECK (auth.jwt() IS NOT NULL);
