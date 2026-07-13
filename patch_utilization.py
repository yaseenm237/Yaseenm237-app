import sys

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    content = f.read()

target = """  const totalPartsArea = React.useMemo(() => {
    return effectiveLayouts.reduce((acc, layout) => {
      return acc + layout.parts.reduce((partAcc, part) => partAcc + (part.w * part.h), 0);
    }, 0);
  }, [effectiveLayouts]);"""

replacement = """  const totalPartsArea = React.useMemo(() => {
    return effectiveLayouts.reduce((acc, layout) => {
      return acc + layout.parts.reduce((partAcc, part) => {
        if (part.isSuper && part.innerW && part.innerH && part.colCount && part.rowCount) {
           return partAcc + (part.innerW * part.innerH * part.colCount * part.rowCount);
        }
        return partAcc + (part.w * part.h);
      }, 0);
    }, 0);
  }, [effectiveLayouts]);"""

content = content.replace(target, replacement)

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(content)
