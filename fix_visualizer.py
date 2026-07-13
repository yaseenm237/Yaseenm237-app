import re

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    code = f.read()

code = re.sub(
    r"const T = settings\.trimMargin; // Trim in mm",
    """const T = settings.trimMargin; // Trim in mm
  const trimEdges = settings.trimEdges || { top: true, bottom: true, left: true, right: true };
  const padTop = trimEdges.top ? T : 0;
  const padBottom = trimEdges.bottom ? T : 0;
  const padLeft = trimEdges.left ? T : 0;
  const padRight = trimEdges.right ? T : 0;""",
    code
)

code = re.sub(
    r"\{\/\* 2\. Trim Boundary Line \(dashed\) \*\/\}\s*\{T > 0 && \(\s*<rect \s*x=\{pad \+ T\} \s*y=\{pad \+ T\} \s*width=\{rawLMm - 2 \* T\} \s*height=\{rawWMm - 2 \* T\}",
    """{/* 2. Trim Boundary Line (dashed) */}
                    {T > 0 && (
                      <rect 
                        x={pad + padLeft} 
                        y={pad + padTop} 
                        width={rawLMm - padLeft - padRight} 
                        height={rawWMm - padTop - padBottom}""",
    code
)

code = re.sub(
    r'<text \s*x=\{pad \+ T \+ 4\} \s*y=\{pad \+ T - 4\} \s*fill="#64748b" \s*fontSize="24" \s*fontWeight="semibold"\s*>',
    """<text 
                        x={pad + Math.max(padLeft, 4)} 
                        y={pad + Math.max(padTop - 4, 20)} 
                        fill="#64748b" 
                        fontSize="24" 
                        fontWeight="semibold"
                      >""",
    code
)

code = code.replace("const wasteX = pad + T + waste.x;", "const wasteX = pad + padLeft + waste.x;")
code = code.replace("const wasteY = pad + T + waste.y;", "const wasteY = pad + padTop + waste.y;")
code = code.replace("const partX = pad + T + part.x;", "const partX = pad + padLeft + part.x;")
code = code.replace("const partY = pad + T + part.y;", "const partY = pad + padTop + part.y;")

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(code)
