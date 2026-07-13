import sys

with open('src/components/layout-visualizer/GrandTotalSummary.tsx', 'r') as f:
    content = f.read()

content = content.replace("globalGroup.get(key)!.qty += 1;", "globalGroup.get(key)!.qty += (p.isSuper ? ((p.colCount || 1) * (p.rowCount || 1)) : 1);")
content = content.replace("qty: 1,", "qty: (p.isSuper ? ((p.colCount || 1) * (p.rowCount || 1)) : 1),")

with open('src/components/layout-visualizer/GrandTotalSummary.tsx', 'w') as f:
    f.write(content)
