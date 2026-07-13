import sys

with open('src/utils/pdfGenerator.ts', 'r') as f:
    content = f.read()

target = "doc.rect(px, py, pw, ph, 'FD');"

insertion = """
      if (part.isSuper && part.colCount && part.rowCount) {
        doc.setDrawColor(248, 250, 252);
        const kerfScale = settings.bladeTh * scale;
        doc.setLineWidth(kerfScale);
        
        const cCount = part.isRotated ? part.rowCount : part.colCount;
        const rCount = part.isRotated ? part.colCount : part.rowCount;
        const stepX = (part.isRotated ? part.innerH! : part.innerW!) * scale;
        const stepY = (part.isRotated ? part.innerW! : part.innerH!) * scale;
        
        for (let i = 0; i < cCount - 1; i++) {
          const kx = px + (i + 1) * stepX - kerfScale / 2;
          doc.line(kx, py, kx, py + ph);
        }
        
        for (let i = 0; i < rCount - 1; i++) {
          const ky = py + (i + 1) * stepY - kerfScale / 2;
          doc.line(px, ky, px + pw, ky);
        }
      }
"""

content = content.replace(target, target + insertion)

with open('src/utils/pdfGenerator.ts', 'w') as f:
    f.write(content)
