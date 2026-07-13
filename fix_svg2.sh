#!/bin/bash
cat << 'INNER_EOF' >> src/components/LayoutVisualizerPanel.tsx
                                return (
                                  <g key={cell.key}>
                                    {/* Part Board Base Rectangle */}
                                    <rect
                                      x={cx}
                                      y={cy}
                                      width={cw}
                                      height={ch}
                                      fill={rectFill}
                                      stroke={strokeColor}
                                      strokeWidth={strokeW}
                                      strokeDasharray={strokeDash}
                                      rx="1.5"
                                      className={isSelected ? "filter drop-shadow-[0_0_4px_rgba(79,70,229,0.4)]" : ""}
                                    />
                                    {/* Edge Banding Visual Indicators */}
                                    {settings.edgeTh > 0 && renderT && (
                                      <line
                                        x1={cx + 1.5}
                                        y1={cy + 1.5}
                                        x2={cx + cw - 1.5}
                                        y2={cy + 1.5}
                                        stroke="#ea580c"
                                        strokeWidth="3.5"
                                        strokeDasharray="3,2"
                                      />
                                    )}
                                    {settings.edgeTh > 0 && renderB && (
                                      <line
                                        x1={cx + 1.5}
                                        y1={cy + ch - 1.5}
                                        x2={cx + cw - 1.5}
                                        y2={cy + ch - 1.5}
                                        stroke="#ea580c"
                                        strokeWidth="3.5"
                                        strokeDasharray="3,2"
                                      />
                                    )}
                                    {settings.edgeTh > 0 && renderL && (
                                      <line
                                        x1={cx + 1.5}
                                        y1={cy + 1.5}
                                        x2={cx + 1.5}
                                        y2={cy + ch - 1.5}
                                        stroke="#ea580c"
                                        strokeWidth="3.5"
                                        strokeDasharray="3,2"
                                      />
                                    )}
                                    {settings.edgeTh > 0 && renderR && (
                                      <line
                                        x1={cx + cw - 1.5}
                                        y1={cy + 1.5}
                                        x2={cx + cw - 1.5}
                                        y2={cy + ch - 1.5}
                                        stroke="#ea580c"
                                        strokeWidth="3.5"
                                        strokeDasharray="3,2"
                                      />
                                    )}
                                    {/* Text Labels inside Part */}
                                    {cw > 45 && ch > 25 ? (
                                      <>
                                        <text
                                          x={cx + cw / 2}
                                          y={cy + ch / 2 - (ch > 40 ? 4 : 0)}
                                          textAnchor="middle"
                                          fill={textFill}
                                          fontSize={ch > 40 ? "11" : "9"}
                                          fontWeight="bold"
                                          className="select-none pointer-events-none drop-shadow-sm"
                                        >
                                          {part.name}
                                        </text>
                                        {ch > 40 && (
                                          <text
                                            x={cx + cw / 2}
                                            y={cy + ch / 2 + 10}
                                            textAnchor="middle"
                                            fill={textFill}
                                            fontSize="8"
                                            opacity="0.85"
                                            className="select-none pointer-events-none"
                                          >
                                            {formatDim(part.origL)} x {formatDim(part.origW)}
                                          </text>
                                        )}
                                      </>
                                    ) : null}
                                  </g>
                                );
                              });
                            })()}
                            
                            {/* LIVE CUT MAPPING OVERLAY FOR THIS PART */}
                            {isActiveCuttingPart && (
                              <g className="pointer-events-none z-50">
                                {/* ... live cutting mapping would go here, maybe I'll omit it or keep it simple */}
                              </g>
                            )}
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>

                <PlacedPartsTable
                  layout={layout}
                  isHindi={isHindi}
                  formatDim={formatDim}
                  getPartColor={getPartColor}
                />

                <OffcutsTable
                  layout={layout}
                  settings={settings}
                  savedOffcuts={savedOffcuts}
                  isHindi={isHindi}
                  onUpdateSettings={onUpdateSettings}
                  handleSaveOffcut={handleSaveOffcut}
                  formatDim={formatDim}
                />
              </div>

              {/* 3.6. 📋 Sahira: Visual Cutting Guide & Sequencer */}
              {showStepSequencer && (
                <SahiraSequencer
                  layout={layout}
                  settings={settings}
                  isHindi={isHindi}
                  activeStepIndices={activeStepIndices}
                  setActiveStepIndices={setActiveStepIndices}
                  completedSteps={completedSteps}
                  toggleStepCompleted={toggleStepCompleted}
                  convertMmToUnit={convertMmToUnit}
                  getPartColor={getPartColor}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Grand Total Summary Node */}
      {layouts.length > 0 && (
        <GrandTotalSummary
          layouts={layouts}
          isHindi={isHindi}
          formatDim={formatDim}
          showGrandSummary={showGrandSummary}
          setShowGrandSummary={setShowGrandSummary}
          settings={settings}
        />
      )}
    </div>
  );
}
INNER_EOF
