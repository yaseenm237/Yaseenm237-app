import re

with open('src/utils/pdfGenerator.ts', 'r') as f:
    code = f.read()

replacement_1 = """    const T = settings.trimMargin; // in mm
    const trimEdges = settings.trimEdges || { top: true, bottom: true, left: true, right: true };
    const padTop = trimEdges.top ? T : 0;
    const padBottom = trimEdges.bottom ? T : 0;
    const padLeft = trimEdges.left ? T : 0;
    const padRight = trimEdges.right ? T : 0;
    
    const rawLMm = layout.width + padLeft + padRight;
    const rawWMm = layout.height + padTop + padBottom;"""

code = re.sub(
    r"    const T = settings\.trimMargin; // in mm\s*const rawLMm = layout\.width \+ \(2 \* T\);\s*const rawWMm = layout\.height \+ \(2 \* T\);",
    replacement_1,
    code
)

code = code.replace(
    "const partX = layoutOffsetX + (T + part.x) * scale;",
    "const partX = layoutOffsetX + (padLeft + part.x) * scale;"
)

code = code.replace(
    "const partY = layoutOffsetY + (T + part.y) * scale;",
    "const partY = layoutOffsetY + (padTop + part.y) * scale;"
)

with open('src/utils/pdfGenerator.ts', 'w') as f:
    f.write(code)
