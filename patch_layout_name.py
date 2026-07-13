import sys

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace(">{part.name}</text>", ">{part.name} {part.isSuper ? `x${part.colCount! * part.rowCount!}` : ''}</text>")

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(content)
