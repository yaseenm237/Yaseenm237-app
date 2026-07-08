import re

with open('src/components/CabinetDesignerModal.tsx', 'r') as f:
    content = f.read()

# Find the block inside else:
search = '''                        const boundsMap: Record<string, { w: number, h: number }> = {};
                        const calcBounds = (n: CompartmentNode, cw: number, ch: number) => {
                          boundsMap[n.id] = { w: cw, h: ch };
                          if (n.splitType === 'h' && n.child1 && n.child2) {
                            const val = n.splitValue || (ch - plyThickness) / 2;
                            calcBounds(n.child1, cw, val);
                            calcBounds(n.child2, cw, ch - val - plyThickness);
                          } else if (n.splitType === 'v' && n.child1 && n.child2) {
                            const val = n.splitValue || (cw - plyThickness) / 2;
                            calcBounds(n.child1, val, ch);
                            calcBounds(n.child2, cw - val - plyThickness, ch);
                          }
                        };
                        calcBounds(rootNode, width - 2 * plyThickness, height - 2 * plyThickness);
                        
                        const b = boundsMap[selectedNode.id];'''

new_code = '''                      // Moved bounds calculation up
                      const boundsMap: Record<string, { w: number, h: number }> = {};
                      const calcBounds = (n: CompartmentNode, cw: number, ch: number) => {
                        boundsMap[n.id] = { w: cw, h: ch };
                        if (n.splitType === 'h' && n.child1 && n.child2) {
                          const val = n.splitValue || (ch - plyThickness) / 2;
                          calcBounds(n.child1, cw, val);
                          calcBounds(n.child2, cw, ch - val - plyThickness);
                        } else if (n.splitType === 'v' && n.child1 && n.child2) {
                          const val = n.splitValue || (cw - plyThickness) / 2;
                          calcBounds(n.child1, val, ch);
                          calcBounds(n.child2, cw - val - plyThickness, ch);
                        }
                      };
                      calcBounds(rootNode, width - 2 * plyThickness, height - 2 * plyThickness);
                      const b = boundsMap[selectedNode.id];
'''

# We need to insert this right after:
# const selectedNode = findNode(rootNode, selectedElementId);
# if (!selectedNode) return null;

insert_after = '''                      const selectedNode = findNode(rootNode, selectedElementId);
                      if (!selectedNode) return null;'''

if search in content and insert_after in content:
    content = content.replace(search, '                        // boundsMap already calculated above\n')
    content = content.replace(insert_after, insert_after + '\n\n' + new_code)
    
    with open('src/components/CabinetDesignerModal.tsx', 'w') as f:
        f.write(content)
    print("Moved bounds calculation")
else:
    print("Search string not found")

