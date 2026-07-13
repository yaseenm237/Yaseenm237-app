import sys

with open('src/utils/pdfGenerator.ts', 'r') as f:
    content = f.read()

content = content.replace("groupedParts.get(key)!.qty++;", "groupedParts.get(key)!.qty += (p.isSuper ? ((p.colCount || 1) * (p.rowCount || 1)) : 1);")

with open('src/utils/pdfGenerator.ts', 'w') as f:
    f.write(content)
