import re

filepath = "js/laudo-materiais.js"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# I need to fix places where I had `\` or \`
# In the original python script I wrote: `\\` and \\``
# This resulted in `\` and \`` in JS.
# Let's replace `\` with ` and \`` with `
# Be careful not to break valid things.
# I know exactly the strings I injected:
# 1. `${emissaoData.acessorios.map((ac, i) => `\`
# 2. \``).join('')}`
# 3. `return \`<span class="font-bold uppercase \${col}">\${text}</span>\`;`
# 4. `checklistRowsHtml += \` ... \`;`
# 5. `dimensoesHtml = \` ... \`;`
# 6. `\${nom ? \` ... \`` : ''}`
# 7. `\${ac.dimensoes?.w ? \`\${ac.dimensoes.w} mm\`` : '-'}`
# etc.

# It is just easier to replace ALL `\` with ` and \`` with ` inside the `gerarPDFLaudoMateriais` function.
# Wait, I want the inner template strings to just be regular template strings because they are inside a ${...} block.
# Wait! In JS, if you have an outer template string:
# const html = `... ${... `...`} ...`
# The inner template string `...` does NOT need its backticks escaped!
# BUT what about the variables inside the inner template string?
# E.g. ${ac.tag}
# If I don't escape the `${`, it will be evaluated in the OUTER string's context?
# NO!
# If I have:
# const html = `
#   ${arr.map(x => `
#      <span>${x.name}</span>
#   `)}
# `
# Here, `${x.name}` is perfectly valid, it evaluates inside the `map` arrow function!
# Because the outer template string expression `${ ... }` contains real JS code, and inside that JS code is another template string `...`, which can have its own `${...}`.
# So ALL escapes like `\${` and `\`` inside the `gerarPDFLaudoMateriais` HTML string construction were WRONG!
# I need to remove the `\` from `\${` and `\`` everywhere in that function.

def fix_func(m):
    block = m.group(0)
    # Remove \ from \${
    block = block.replace(r'\${', '${')
    # Remove \ from \`
    block = block.replace(r'\`', '`')
    # Remove `\` which was my mistake for starting a template string
    block = block.replace('`\\`', '`')
    block = block.replace('\\``', '`')
    return block

# Apply to gerarPDFLaudoMateriais
pattern = re.compile(r'function gerarPDFLaudoMateriais\(\) \{.*?\n\}', re.MULTILINE | re.DOTALL)
content = pattern.sub(fix_func, content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Backticks fixed!")
