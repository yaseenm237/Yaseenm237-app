#!/bin/bash
cat src/components/LayoutVisualizerPanel.tsx | sed '/{isHindi ? .क्षेत्रफल. : .Area.}: {((waste.w \* waste.h) \/ 100).t/,$d' > temp.tsx
cat << 'INNER_EOF' >> temp.tsx
                            {isHindi ? 'क्षेत्रफल' : 'Area'}: {((waste.w * waste.h) / 100).toFixed(1)} cm²
                          </title>
                        </g>
                      );
                    })}

                     {/* 3. Placed Parts (Interactive in Puzzle Mode, static otherwise) */}
                    {(() => {
                      const isEditingThisSheet = editingSheetIndex === layout.sheetIndex;
                      const activeParts = isEditingThisSheet ? editingParts : layout.parts;
                      
                      const { hasCollision, isOutOfBounds } = isEditingThisSheet 
                        ? getCollisionStatus(editingParts, layout.width, layout.height)
                        : { hasCollision: new Set<string>(), isOutOfBounds: new Set<string>() };

                      return activeParts.map((part, pIdx) => {
                        const partX = pad + T + part.x;
                        const partY = pad + T + part.y;
                        const drawW = Math.max(1, part.w - K);
                        const drawH = Math.max(1, part.h - K);
                        
                        const isColliding = hasCollision.has(part.id);
                        const isOOB = isOutOfBounds.has(part.id);
                        const isSelected = isEditingThisSheet && selectedPartId === part.id;
                        
                        // Pick color based on name/index
                        let rectFill = getPartColor(part.name, pIdx);
                        let strokeColor = "#334155";
                        let strokeW = "1";
                        let strokeDash = undefined;
                        
                        const isActiveCuttingPart = activeStep && activeStep.affectedPartIds?.includes(part.id);
                        const isPastCuttingPart = showStepSequencer && pastCutPartIds.has(part.id);

                        if (isEditingThisSheet) {
                          if (isColliding || isOOB) {
                            rectFill = "#fca5a5"; // Soft red
                            strokeColor = "#dc2626"; // Hard red
                            strokeW = "2";
                            strokeDash = "3,3";
                          } else if (isSelected) {
                            strokeColor = "#4f46e5"; // Indigo select glow
                            strokeW = "2.5";
                          }
                        } else if (isActiveCuttingPart) {
                          strokeColor = "#e11d48"; // Vivid crimson for active cut pieces
                          strokeW = "4";
                          strokeDash = "4,2";
                        } else if (isPastCuttingPart) {
                          rectFill = "#f8fafc"; // slate-50
                          strokeColor = "#cbd5e1"; // slate-300
                        }

                        return (
                          <g 
                            key={part.id} 
                            className={`group/part ${isEditingThisSheet ? 'cursor-grab active:cursor-grabbing' : 'cursor-help'}`}
                            onMouseDown={(e) => {
                              if (isEditingThisSheet) {
                                handlePartMouseDown(e, part.id, part.x, part.y);
                              }
                            }}
                            onTouchStart={(e) => {
                              if (isEditingThisSheet) {
                                handlePartTouchStart(e, part.id, part.x, part.y);
                              }
                            }}
                            onDoubleClick={() => {
                              if (isEditingThisSheet) {
                                handleRotatePart(part.id);
                              }
                            }}
                          >
                            {(() => {
                              const cells = [{
                                cellX: partX,
                                cellY: partY,
                                cellW: drawW,
                                cellH: drawH,
                                key: part.id
                              }];
                              
                              return cells.map((cell) => {
                                const cx = cell.cellX;
                                const cy = cell.cellY;
                                const cw = cell.cellW;
                                const ch = cell.cellH;
                                const textFill = getContrastColor(rectFill);
                                
                                // Map original edges to the rendered orientation
                                let renderT = part.edges.T;
                                let renderB = part.edges.B;
                                let renderL = part.edges.L;
                                let renderR = part.edges.R;
                                
                                if (part.isRotated) {
                                  renderT = part.edges.R;
                                  renderB = part.edges.L;
                                  renderL = part.edges.T;
                                  renderR = part.edges.B;
                                }
INNER_EOF
cat src/components/LayoutVisualizerPanel.tsx | awk '/return \(\n?[ \t]*<g key=\{cell.key\}>/{flag=1} flag' >> temp.tsx
mv temp.tsx src/components/LayoutVisualizerPanel.tsx
