import re

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    code = f.read()

replacement = """  const lastSettingsRef = React.useRef({
    sheetL: settings.sheetL,
    sheetW: settings.sheetW,
    unit: settings.unit,
    trimMargin: settings.trimMargin,
    trimEdgesStr: JSON.stringify(settings.trimEdges),
    bladeTh: settings.bladeTh,
  });

  React.useEffect(() => {
    const prev = lastSettingsRef.current;
    const currentTrimEdgesStr = JSON.stringify(settings.trimEdges);
    if (
      prev.sheetL !== settings.sheetL ||
      prev.sheetW !== settings.sheetW ||
      prev.unit !== settings.unit ||
      prev.trimMargin !== settings.trimMargin ||
      prev.trimEdgesStr !== currentTrimEdgesStr ||
      prev.bladeTh !== settings.bladeTh
    ) {
      setCustomLayoutOverrides({});
      setEditingSheetIndex(null);
    }
    lastSettingsRef.current = {
      sheetL: settings.sheetL,
      sheetW: settings.sheetW,
      unit: settings.unit,
      trimMargin: settings.trimMargin,
      trimEdgesStr: currentTrimEdgesStr,
      bladeTh: settings.bladeTh,
    };
  }, [settings.sheetL, settings.sheetW, settings.unit, settings.trimMargin, settings.trimEdges, settings.bladeTh]);"""

code = re.sub(
    r"  const lastSettingsRef = React\.useRef\(\{.*?\}, \[settings\.sheetL, settings\.sheetW, settings\.unit, settings\.trimMargin, settings\.bladeTh\]\);",
    replacement,
    code,
    flags=re.DOTALL
)

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(code)
