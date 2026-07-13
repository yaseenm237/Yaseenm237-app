import sys

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    content = f.read()

target1 = "          const activeStep = sahiraSteps[activeStepIdx];"
replacement1 = """          const activeStep = sahiraSteps[activeStepIdx];
          const pastCutPartIds = new Set(sahiraSteps.slice(0, activeStepIdx).flatMap(s => s.affectedPartIds || []));"""

target2 = """                        const isActiveCuttingPart = activeStep && activeStep.affectedPartIds?.includes(part.id);

                        if (isEditingThisSheet) {"""

replacement2 = """                        const isActiveCuttingPart = activeStep && activeStep.affectedPartIds?.includes(part.id);
                        const isPastCuttingPart = showStepSequencer && pastCutPartIds.has(part.id);

                        if (isEditingThisSheet) {"""

target3 = """                        } else if (isActiveCuttingPart) {
                          strokeColor = "#e11d48"; // Vivid crimson for active cut pieces
                          strokeW = "4";
                          strokeDash = "4,2";
                        }"""

replacement3 = """                        } else if (isActiveCuttingPart) {
                          strokeColor = "#e11d48"; // Vivid crimson for active cut pieces
                          strokeW = "4";
                          strokeDash = "4,2";
                        } else if (isPastCuttingPart) {
                          rectFill = "#ef4444"; // red-500
                          strokeColor = "#991b1b"; // red-800
                        }"""

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)
content = content.replace(target3, replacement3)

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(content)
