import sys

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    content = f.read()

old_code = """
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
                                      stroke="#f3f4f6"
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
                                      stroke="#f3f4f6"
                                      strokeWidth={kerfWidthY}
                                    />
                                  );
                                })}"""

new_code = """
                                {Array.from({ length: (part.isRotated ? part.rowCount : part.colCount) - 1 }).map((_, i) => {
                                  const stepX = (part.isRotated ? part.innerH! : part.innerW!);
                                  const kerfWidthX = settings.bladeTh;
                                  const kerfCenterX = partX + (i + 1) * stepX - kerfWidthX / 2;
                                  return (
                                    <line
                                      key={`vg-${i}`}
                                      x1={kerfCenterX}
                                      y1={partY}
                                      x2={kerfCenterX}
                                      y2={partY + drawH}
                                      stroke="#f3f4f6"
                                      strokeWidth={kerfWidthX}
                                    />
                                  );
                                })}
                                {Array.from({ length: (part.isRotated ? part.colCount : part.rowCount) - 1 }).map((_, i) => {
                                  const stepY = (part.isRotated ? part.innerW! : part.innerH!);
                                  const kerfWidthY = settings.bladeTh;
                                  const kerfCenterY = partY + (i + 1) * stepY - kerfWidthY / 2;
                                  return (
                                    <line
                                      key={`hg-${i}`}
                                      x1={partX}
                                      y1={kerfCenterY}
                                      x2={partX + drawW}
                                      y2={kerfCenterY}
                                      stroke="#f3f4f6"
                                      strokeWidth={kerfWidthY}
                                    />
                                  );
                                })}"""

content = content.replace(old_code.strip(), new_code.strip())

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(content)
