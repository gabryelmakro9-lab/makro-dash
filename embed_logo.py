import base64

# Read the logo
logo_path = "public/assets/logo.png"
with open(logo_path, "rb") as f:
    logo_b64 = base64.b64encode(f.read()).decode()

logo_src = f"data:image/png;base64,{logo_b64}"

# Read JS
with open("js/laudo-materiais.js", "r", encoding="utf-8") as f:
    content = f.read()

print(f"File size before: {len(content)}")

# Direct substitution of all logo img occurrences
old_logo_14 = """<img src="./assets/LOGO AZUL (1).png" alt="Makro" class="max-h-14 mx-auto object-contain grayscale-0" onerror="this.src='../assets/LOGO AZUL (1).png'; this.onerror=null;" />"""
new_logo_14 = f"""<img src="{logo_src}" alt="Makro" class="max-h-14 mx-auto object-contain" />"""

old_logo_12 = """<img src="./assets/LOGO AZUL (1).png" alt="Makro" class="max-h-12 mx-auto object-contain grayscale-0" onerror="this.src='../assets/LOGO AZUL (1).png'; this.onerror=null;" />"""
new_logo_12 = f"""<img src="{logo_src}" alt="Makro" class="max-h-12 mx-auto object-contain" />"""

count14 = content.count(old_logo_14)
count12 = content.count(old_logo_12)
print(f"Found max-h-14: {count14}, max-h-12: {count12}")

content = content.replace(old_logo_14, new_logo_14)
content = content.replace(old_logo_12, new_logo_12)

print(f"File size after: {len(content)}")

with open("js/laudo-materiais.js", "w", encoding="utf-8") as f:
    f.write(content)

print("Done!")
