import sys

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'fill={isColliding || isOOB ? "#991b1b" : "#1e293b"}',
    'fill={isPastCuttingPart ? "#ffffff" : isColliding || isOOB ? "#991b1b" : "#1e293b"}'
)

content = content.replace(
    'fill={isColliding || isOOB ? "#b91c1c" : "#475569"}',
    'fill={isPastCuttingPart ? "#f87171" : isColliding || isOOB ? "#b91c1c" : "#475569"}'
)

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(content)
