import sys, os
from pathlib import Path
from PIL import Image
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    print("Erro: pillow-heif não instalado. Execute: python -m pip install pillow-heif")
    sys.exit(1)

if len(sys.argv) < 2:
    print("Uso: python converter-heic.py <pasta_entrada> [pasta_saida]")
    print("Ex:  python converter-heic.py Q:\\fotos Q:\\fotos-convertidas")
    sys.exit(1)

entrada = Path(sys.argv[1])
saida = Path(sys.argv[2]) if len(sys.argv) > 2 else entrada

if not entrada.exists():
    print(f"Pasta de entrada não encontrada: {entrada}")
    sys.exit(1)

saida.mkdir(parents=True, exist_ok=True)

arquivos = sorted([f for f in entrada.iterdir() if f.suffix.lower() in (".heic", ".heif")])
total = len(arquivos)
print(f"\nEncontrados {total} arquivo(s) HEIC/HEIF em: {entrada}\n")

ok = err = 0
for i, f in enumerate(arquivos, 1):
    dest = saida / f.with_suffix(".jpg").name
    progresso = f"[{i}/{total}]"
    try:
        img = Image.open(f).convert("RGB")
        img.save(dest, "JPEG", quality=85)
        kb = dest.stat().st_size / 1024
        print(f"{progresso} OK  {f.name} -> {dest.name} ({kb:.0f}KB)")
        ok += 1
    except Exception as e:
        print(f"{progresso} ERRO {f.name}: {e}")
        err += 1

print(f"\nConcluído! {ok} convertidos, {err} erros.")
print(f"Pasta de saída: {saida}")
