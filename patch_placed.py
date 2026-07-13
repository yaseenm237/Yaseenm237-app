import sys

with open('src/components/layout-visualizer/PlacedPartsTable.tsx', 'r') as f:
    content = f.read()

content = content.replace("groupedParts.get(key)!.qty += 1;", "groupedParts.get(key)!.qty += (p.isSuper ? ((p.colCount || 1) * (p.rowCount || 1)) : 1);")
content = content.replace("groupedParts.set(key, { ...p, qty: 1 });", "groupedParts.set(key, { ...p, qty: (p.isSuper ? ((p.colCount || 1) * (p.rowCount || 1)) : 1) });")

with open('src/components/layout-visualizer/PlacedPartsTable.tsx', 'w') as f:
    f.write(content)
