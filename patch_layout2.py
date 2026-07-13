import sys

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    content = f.read()

old_code = """
                            {/* SuperPart Grid Lines */}
                            {part.isSuper && part.colCount && part.rowCount && (
                              <g>
                                {Array.from({ length: part.colCount - 1 }).map((_, i) => {
                                  const cellW = drawW / part.colCount!;
                                  return (
                                    <line
                                      key={`vg-${i}`}
                                      x1={partX + (i + 1) * cellW}
                                      y1={partY}
                                      x2={partX + (i + 1) * cellW}
                                      y2={partY + drawH}
                                      stroke="#94a3b8"
                                      strokeWidth="1"
                                      strokeDasharray="2,2"
                                    />
                                  );
                                })}
                                {Array.from({ length: part.rowCount - 1 }).map((_, i) => {
                                  const cellH = drawH / part.rowCount!;
                                  return (
                                    <line
                                      key={`hg-${i}`}
                                      x1={partX}
                                      y1={partY + (i + 1) * cellH}
                                      x2={partX + drawW}
                                      y2={partY + (i + 1) * cellH}
                                      stroke="#94a3b8"
                                      strokeWidth="1"
                                      strokeDasharray="2,2"
                                    />
                                  );
                                })}
                              </g>
                            )}"""

new_code = """
                            {/* SuperPart Grid Lines */}
                            {part.isSuper && part.colCount && part.rowCount && (
                              <g>
                                {Array.from({ length: (part.isRotated ? part.rowCount : part.colCount) - 1 }).map((_, i) => {
                                  const cCount = part.isRotated ? part.rowCount! : part.colCount!;
                                  const cellW = drawW / cCount;
                                  return (
                                    <line
                                      key={`vg-${i}`}
                                      x1={partX + (i + 1) * cellW}
                                      y1={partY}
                                      x2={partX + (i + 1) * cellW}
                                      y2={partY + drawH}
                                      stroke="#94a3b8"
                                      strokeWidth="1"
                                      strokeDasharray="2,2"
                                    />
                                  );
                                })}
                                {Array.from({ length: (part.isRotated ? part.colCount : part.rowCount) - 1 }).map((_, i) => {
                                  const rCount = part.isRotated ? part.colCount! : part.rowCount!;
                                  const cellH = drawH / rCount;
                                  return (
                                    <line
                                      key={`hg-${i}`}
                                      x1={partX}
                                      y1={partY + (i + 1) * cellH}
                                      x2={partX + drawW}
                                      y2={partY + (i + 1) * cellH}
                                      stroke="#94a3b8"
                                      strokeWidth="1"
                                      strokeDasharray="2,2"
                                    />
                                  );
                                })}
                              </g>
                            )}"""

content = content.replace(old_code.strip(), new_code.strip())

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(content)
