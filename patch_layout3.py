import sys

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    content = f.read()

old_code = """
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

new_code = """
                            {/* SuperPart Grid Lines (Kerf Gaps) */}
                            {part.isSuper && part.colCount && part.rowCount && (
                              <g>
                                {Array.from({ length: (part.isRotated ? part.rowCount : part.colCount) - 1 }).map((_, i) => {
                                  const stepX = (part.isRotated ? part.innerH! : part.innerW!) * scaleX;
                                  const kerfWidthX = settings.bladeTh * scaleX;
                                  const kerfCenterX = partX + (i + 1) * stepX - kerfWidthX / 2;
                                  return (
                                    <line
                                      key={`vg-${i}`}
                                      x1={kerfCenterX}
                                      y1={partY}
                                      x2={kerfCenterX}
                                      y2={partY + drawH}
                                      stroke="#f8fafc"
                                      strokeWidth={kerfWidthX}
                                    />
                                  );
                                })}
                                {Array.from({ length: (part.isRotated ? part.colCount : part.rowCount) - 1 }).map((_, i) => {
                                  const stepY = (part.isRotated ? part.innerW! : part.innerH!) * scaleY;
                                  const kerfWidthY = settings.bladeTh * scaleY;
                                  const kerfCenterY = partY + (i + 1) * stepY - kerfWidthY / 2;
                                  return (
                                    <line
                                      key={`hg-${i}`}
                                      x1={partX}
                                      y1={kerfCenterY}
                                      x2={partX + drawW}
                                      y2={kerfCenterY}
                                      stroke="#f8fafc"
                                      strokeWidth={kerfWidthY}
                                    />
                                  );
                                })}
                              </g>
                            )}"""

content = content.replace(old_code.strip(), new_code.strip())

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(content)
