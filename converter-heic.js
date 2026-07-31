import sharp from "sharp";
import { readdirSync, statSync, mkdirSync, existsSync } from "fs";
import { join, parse, resolve } from "path";

process.env.LIBHEIF_MAX_NUMBER_OF_IREF_REFERENCES = "200";
process.env.LIBHEIF_MAX_NUMBER_OF_ILOC_ITEMS = "200";

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log("Uso: node converter-heic.js <pasta_entrada> [pasta_saida]");
  console.log("Ex:  node converter-heic.js C:\\fotos C:\\fotos-convertidas");
  process.exit(1);
}

const entrada = resolve(args[0]);
const saida = args[1] ? resolve(args[1]) : entrada;

if (!existsSync(entrada)) {
  console.error("Pasta de entrada não encontrada:", entrada);
  process.exit(1);
}
if (!existsSync(saida)) mkdirSync(saida, { recursive: true });

const arquivos = readdirSync(entrada).filter(f => /\.(heic|heif)$/i.test(f));
const total = arquivos.length;
console.log(`\nEncontrados ${total} arquivo(s) HEIC/HEIF em: ${entrada}\n`);

let ok = 0, err = 0;
for (let i = 0; i < total; i++) {
  const f = arquivos[i];
  const src = join(entrada, f);
  const nome = parse(f).name;
  const dest = join(saida, nome + ".jpg");
  const progresso = `[${i + 1}/${total}]`;
  try {
    const buf = await sharp(src, { failOn: "none" }).jpeg({ quality: 85 }).toBuffer();
    await sharp(buf).toFile(dest);
    const kb = (statSync(dest).size / 1024).toFixed(0);
    console.log(`${progresso} OK  ${f} → ${nome}.jpg (${kb}KB)`);
    ok++;
  } catch (e) {
    console.error(`${progresso} ERRO ${f}: ${e.message}`);
    err++;
  }
}

console.log(`\nConcluído! ${ok} convertidos, ${err} erros.`);
console.log(`Pasta de saída: ${saida}`);
