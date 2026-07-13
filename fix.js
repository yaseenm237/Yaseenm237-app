import fs from 'fs';
let code = fs.readFileSync('src/components/LayoutVisualizerPanel.tsx', 'utf8');

// Fix 1
code = code.replace(
  /setDragStart\(\{\s*clientX: touch\.clientX,\s*client\s*const svgElement = e\.currentTarget as SVGSVGElement;/,
  `setDragStart({
      clientX: touch.clientX,
      clientY: touch.clientY,
      startX,
      startY,
      partId
    });
  };

  const handleSvgMouseMove = (e: React.MouseEvent, usableW: number, usableH: number, svgW: number, svgH: number) => {
    if (!dragStart) return;
    e.preventDefault();

    const svgElement = e.currentTarget as SVGSVGElement;`
);

// Fix 2
code = code.replace(
  /const handleEndDrag = \(\) => \{h;\s*const newH = p\.w;\s*const newIsRotated = !p\.isRotated;\s*return \{\s*\.\.\.p,\s*w: newW,\s*h: newH,\s*isRotated: newIsRotated\s*\};\s*\}\);\s*\}\);\s*\};\s*/,
  ``
);

fs.writeFileSync('src/components/LayoutVisualizerPanel.tsx', code);
