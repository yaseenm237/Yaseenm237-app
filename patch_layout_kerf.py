import sys

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    new_lines.append(line)
    if 'const totalAvailableArea = React.useMemo(() => {' in line:
        new_lines.insert(-1, """
  const totalKerfLossMm2 = React.useMemo(() => {
    return effectiveLayouts.reduce((acc, layout) => {
      return acc + layout.parts.reduce((partAcc, part) => {
        if (part.isSuper) {
          const cutW = part.isRotated ? part.innerW! : part.innerH!;
          const cutH = part.isRotated ? part.innerH! : part.innerW!;
          const cellArea = cutW * cutH;
          const outerCellArea = (cutW + settings.bladeTh) * (cutH + settings.bladeTh);
          return partAcc + (outerCellArea - cellArea) * (part.colCount! * part.rowCount!);
        } else {
          return partAcc + (part.w * part.h - part.cutL * part.cutW);
        }
      }, 0);
    }, 0);
  }, [effectiveLayouts, settings.bladeTh]);
""")
    if 'totalBandingLength={totalBandingLength}' in line:
        new_lines.insert(-1, "        totalKerfLossMm2={totalKerfLossMm2}\n")

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.writelines(new_lines)
