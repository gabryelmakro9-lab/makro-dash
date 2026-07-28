import pdfplumber
pdf = pdfplumber.open('LaudoManilha.pdf')
page = pdf.pages[0]
print('Page:', page.width, 'x', page.height)
print()
words = page.extract_words(keep_blank_chars=True, x_tolerance=3)
for w in words:
    print(f'x0={w["x0"]:.0f} x1={w["x1"]:.0f} y={w["top"]:.0f} text="{w["text"]}"')
print()
tables = page.find_tables()
print(f'{len(tables)} tables')
for ti, table in enumerate(tables):
    print(f'T{ti}:')
    for ri, row in enumerate(table.extract()):
        print(f'  R{ri}: {row}')
