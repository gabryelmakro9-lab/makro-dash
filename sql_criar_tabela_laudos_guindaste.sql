-- Criar tabela para Laudos de Guindaste
CREATE TABLE IF NOT EXISTS laudos_guindaste (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero_laudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'Guindaste',
  frota TEXT NOT NULL DEFAULT '',
  modelo TEXT NOT NULL DEFAULT '',
  capacidade TEXT NOT NULL DEFAULT '',
  serie TEXT NOT NULL DEFAULT '',
  ano TEXT NOT NULL DEFAULT '',
  unidade TEXT NOT NULL DEFAULT '',
  data_inspecao TEXT NOT NULL DEFAULT '',
  inspetor TEXT NOT NULL DEFAULT '',
  crea TEXT NOT NULL DEFAULT '',
  art TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  parecer TEXT NOT NULL DEFAULT 'Aprovado',
  recomendacoes TEXT NOT NULL DEFAULT '',
  fotos JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE laudos_guindaste ENABLE ROW LEVEL SECURITY;

-- Política: anon pode ler tudo
CREATE POLICY "anon_select" ON laudos_guindaste
  FOR SELECT USING (true);

-- Política: anon pode inserir
CREATE POLICY "anon_insert" ON laudos_guindaste
  FOR INSERT WITH CHECK (true);

-- Política: anon pode atualizar
CREATE POLICY "anon_update" ON laudos_guindaste
  FOR UPDATE USING (true);

-- Política: anon pode deletar
CREATE POLICY "anon_delete" ON laudos_guindaste
  FOR DELETE USING (true);
