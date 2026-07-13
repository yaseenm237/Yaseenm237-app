import re

with open('src/components/ReportPreviewModal.tsx', 'r') as f:
    code = f.read()

replacement_1 = """                  const T = settings.trimMargin;
                  const trimEdges = settings.trimEdges || { top: true, bottom: true, left: true, right: true };
                  const padTop = trimEdges.top ? T : 0;
                  const padBottom = trimEdges.bottom ? T : 0;
                  const padLeft = trimEdges.left ? T : 0;
                  const padRight = trimEdges.right ? T : 0;
                  
                  const rawLMm = layout.width + padLeft + padRight;
                  const rawWMm = layout.height + padTop + padBottom;"""

code = re.sub(
    r"                  const T = settings\.trimMargin;\s*const rawLMm = layout\.width \+ \(2 \* T\);\s*const rawWMm = layout\.height \+ \(2 \* T\);",
    replacement_1,
    code
)

code = code.replace(
    "const partX = (T + part.x) * scale;",
    "const partX = (padLeft + part.x) * scale;"
)

code = code.replace(
    "const partY = (T + part.y) * scale;",
    "const partY = (padTop + part.y) * scale;"
)

with open('src/components/ReportPreviewModal.tsx', 'w') as f:
    f.write(code)
