import sys

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    content = f.read()

target = """  const totalKerfLossMm2 = React.useMemo(() => {
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
  }, [effectiveLayouts, settings.bladeTh]);"""

replacement = """  const totalKerfLossMm2 = React.useMemo(() => {
    return effectiveLayouts.reduce((acc, layout) => {
      const partsArea = layout.parts.reduce((partAcc, part) => {
        if (part.isSuper && part.innerW && part.innerH && part.colCount && part.rowCount) {
           return partAcc + (part.innerW * part.innerH * part.colCount * part.rowCount);
        }
        return partAcc + (part.w * part.h);
      }, 0);
      const wasteArea = (layout.wasteRects || []).reduce((wasteAcc, w) => wasteAcc + (w.w * w.h), 0);
      const totalBoardUsableArea = layout.width * layout.height;
      let sheetKerfArea = totalBoardUsableArea - partsArea - wasteArea;
      if (sheetKerfArea < 0) sheetKerfArea = 0; // Safeguard
      return acc + sheetKerfArea;
    }, 0);
  }, [effectiveLayouts, settings.bladeTh]);"""

content = content.replace(target, replacement)

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(content)
