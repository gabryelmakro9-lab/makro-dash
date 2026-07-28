-- Criar tabela para Laudos de Materiais de Içamento
CREATE TABLE IF NOT EXISTS laudos_materiais (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero_laudo TEXT NOT NULL,
  data_inspecao TEXT NOT NULL DEFAULT '',
  local TEXT NOT NULL DEFAULT '',
  inspetor TEXT NOT NULL DEFAULT '',
  crea TEXT NOT NULL DEFAULT '',
  art TEXT NOT NULL DEFAULT '',
  equipamento_atrelado TEXT NOT NULL DEFAULT '',
  frota_atrelada TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  acessorios JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE laudos_materiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select" ON laudos_materiais FOR SELECT USING (true);
CREATE POLICY "anon_insert" ON laudos_materiais FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update" ON laudos_materiais FOR UPDATE USING (true);
CREATE POLICY "anon_delete" ON laudos_materiais FOR DELETE USING (true);
