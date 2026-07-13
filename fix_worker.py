import re

with open('src/worker.ts', 'r') as f:
    code = f.read()

replacement = """      // Mark trim margins of the sheet as occupied
      const T = settings.trimMargin || 0;
      const trimEdges = settings.trimEdges || { top: true, bottom: true, left: true, right: true };
      if (T > 0) {
        const trimCells = Math.ceil(T / scale);
        if (trimEdges.left) markOccupied(0, 0, trimCells, gridHeight, gridWidth, gridHeight, grid);
        if (trimEdges.right) markOccupied(gridWidth - trimCells, 0, trimCells, gridHeight, gridWidth, gridHeight, grid);
        if (trimEdges.top) markOccupied(0, 0, gridWidth, trimCells, gridWidth, gridHeight, grid);
        if (trimEdges.bottom) markOccupied(0, gridHeight - trimCells, gridWidth, trimCells, gridWidth, gridHeight, grid);
      }"""

code = re.sub(
    r"// Mark trim margins of the sheet as occupied\s*const T = settings\.trimMargin \|\| 0;\s*if \(T > 0\) \{\s*const trimCells = Math\.ceil\(T / scale\);\s*markOccupied\(0, 0, trimCells, gridHeight, gridWidth, gridHeight, grid\);\s*markOccupied\(gridWidth - trimCells, 0, trimCells, gridHeight, gridWidth, gridHeight, grid\);\s*markOccupied\(0, 0, gridWidth, trimCells, gridWidth, gridHeight, grid\);\s*markOccupied\(0, gridHeight - trimCells, gridWidth, trimCells, gridWidth, gridHeight, grid\);\s*\}",
    replacement,
    code
)

with open('src/worker.ts', 'w') as f:
    f.write(code)
