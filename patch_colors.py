import sys

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    content = f.read()

old_palette = """const COLOR_PALETTE = [
  '#dbeafe', // light blue
  '#fef3c7', // light amber
  '#d1fae5', // light emerald
  '#f3e8ff', // light purple
  '#ffe4e6', // light rose
  '#ccfbf1', // light teal
  '#ffedd5', // light orange
  '#e0e7ff', // light indigo
  '#f1f5f9', // light slate
  '#fae8ff', // light fuchsia
];"""

new_palette = """const COLOR_PALETTE = [
  '#bae6fd', // sky 200
  '#fde047', // yellow 300
  '#86efac', // green 300
  '#d8b4fe', // purple 300
  '#fca5a5', // red 300
  '#5eead4', // teal 300
  '#fdba74', // orange 300
  '#a5b4fc', // indigo 300
  '#cbd5e1', // slate 300
  '#f9a8d4', // pink 300
  '#d9f99d', // lime 200
  '#bfdbfe', // blue 200
];"""

content = content.replace(old_palette, new_palette)

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(content)
