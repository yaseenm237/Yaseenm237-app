import re

with open('src/components/CabinetDesignerModal.tsx', 'r') as f:
    content = f.read()

# Add drawerOffsetY to CompartmentNode
content = content.replace(
    '  drawerFasciaH?: number;',
    '  drawerFasciaH?: number;\n  drawerOffsetY?: number;'
)

# Render changes
# Render dummy panels
render_dummy = '''
                                          // Left Dummy
                                          {dumL > 0 && (
                                            <rect x={19 + rx * scaleX} y={19 + ry * scaleY} width={Math.max(dumL * scaleX, 0)} height={Math.max(rh * scaleY, 0)} fill="#475569" stroke="#334155" strokeWidth="0.5" />
                                          )}
                                          {/* Right Dummy */}
                                          {dumR > 0 && (
                                            <rect x={19 + (rx + rw - dumR) * scaleX} y={19 + ry * scaleY} width={Math.max(dumR * scaleX, 0)} height={Math.max(rh * scaleY, 0)} fill="#475569" stroke="#334155" strokeWidth="0.5" />
                                          )}'''

new_render_dummy = '''
                                          // Left Dummy
                                          {dumL > 0 && (
                                            <rect x={19 + rx * scaleX} y={19 + (node.drawerOffsetY !== undefined ? ry + node.drawerOffsetY : ry) * scaleY} width={Math.max(dumL * scaleX, 0)} height={Math.max((node.drawerFasciaH || rh) * scaleY, 0)} fill="#475569" stroke="#334155" strokeWidth="0.5" />
                                          )}
                                          {/* Right Dummy */}
                                          {dumR > 0 && (
                                            <rect x={19 + (rx + rw - dumR) * scaleX} y={19 + (node.drawerOffsetY !== undefined ? ry + node.drawerOffsetY : ry) * scaleY} width={Math.max(dumR * scaleX, 0)} height={Math.max((node.drawerFasciaH || rh) * scaleY, 0)} fill="#475569" stroke="#334155" strokeWidth="0.5" />
                                          )}'''
content = content.replace(render_dummy, new_render_dummy)

# Render fascia
render_fascia = '''                                        const fx = rx + (rw - fW) / 2;
                                        const fy = ry + (rh - fH) / 2;'''
new_render_fascia = '''                                        const fx = rx + (rw - fW) / 2;
                                        const fy = node.drawerOffsetY !== undefined ? ry + node.drawerOffsetY : ry + (rh - fH) / 2;'''
content = content.replace(render_fascia, new_render_fascia)

# Render inner box
render_inner = '''                                            <rect x={19 + bx * scaleX} y={19 + (ry + (rh - innerFrontH) / 2) * scaleY} width={Math.max(boxOuterW * scaleX, 0)} height={Math.max(innerFrontH * scaleY, 0)} fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
                                            <text x={19 + bx * scaleX + Math.max(boxOuterW * scaleX, 0)/2} y={19 + (ry + (rh - innerFrontH) / 2) * scaleY + Math.max(innerFrontH * scaleY, 0)/2 + 2} fontSize="5" fill="#38bdf8" textAnchor="middle">BOX</text>'''
new_render_inner = '''                                            {(() => {
                                              const fH = node.drawerFasciaH || Math.max(rh - (unit === 'Inch' ? 0.125 : 3), 0);
                                              const fy = node.drawerOffsetY !== undefined ? ry + node.drawerOffsetY : ry + (rh - fH) / 2;
                                              const innerFy = fy + (fH - innerFrontH) / 2;
                                              return (
                                                <>
                                                  <rect x={19 + bx * scaleX} y={19 + innerFy * scaleY} width={Math.max(boxOuterW * scaleX, 0)} height={Math.max(innerFrontH * scaleY, 0)} fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2,2" />
                                                  <text x={19 + bx * scaleX + Math.max(boxOuterW * scaleX, 0)/2} y={19 + innerFy * scaleY + Math.max(innerFrontH * scaleY, 0)/2 + 2} fontSize="5" fill="#38bdf8" textAnchor="middle">BOX</text>
                                                </>
                                              );
                                            })()}'''
content = content.replace(render_inner, new_render_inner)

with open('src/components/CabinetDesignerModal.tsx', 'w') as f:
    f.write(content)

print("Replaced variables in render")
