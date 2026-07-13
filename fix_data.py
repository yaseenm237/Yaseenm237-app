import re

with open('src/data.ts', 'r') as f:
    code = f.read()

code = code.replace(
    "trimMargin: 10.0, // standard trim margin (10mm)",
    "trimMargin: 10.0, // standard trim margin (10mm)\n  trimEdges: { top: true, bottom: true, left: true, right: true }, // all edges trimmed by default"
)

with open('src/data.ts', 'w') as f:
    f.write(code)
