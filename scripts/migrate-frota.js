/**
 * Script de migracao: le public/data/frota.js e envia para o Supabase
 *
 * Uso:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/migrate-frota.js
 *
 * A chave service_role pode ser obtida em:
 *   Supabase Dashboard > Project Settings > API > service_role key
 * (NUNCA expor essa chave no front-end)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_KEY como variaveis de ambiente.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 1. Ler frota.js
const frotaPath = resolve(__dirname, "..", "public", "data", "frota.js");
const content = readFileSync(frotaPath, "utf-8");

// 2. Extrair o array JSON
const jsonStr = content
  .replace(/^window\._frotaData\s*=\s*/, "")
  .replace(/;$/, "")
  .trim();

let items;
try {
  items = JSON.parse(jsonStr);
} catch (e) {
  console.error("Erro ao fazer parse do JSON:", e.message);
  process.exit(1);
}

console.log(`Total de registros no frota.js: ${items.length}`);

// 3. Transformar para o formato da tabela frota (bem + data JSONB)
const rows = items.map((item) => ({
  bem: String(item.Bem || "").trim(),
  data: item,
}));

// 4. Inserir em lotes de 500
const BATCH_SIZE = 500;
let inserted = 0;
let errors = 0;

for (let i = 0; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE);
  const { error } = await supabase.from("frota").upsert(batch, {
    onConflict: "bem",
    ignoreDuplicates: false,
  });

  if (error) {
    console.error(`Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
    errors++;
  } else {
    inserted += batch.length;
    console.log(`Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rows.length / BATCH_SIZE)}: ${batch.length} registros`);
  }
}

console.log(`\nConcluido! Inseridos: ${inserted}, Erros: ${errors}`);
