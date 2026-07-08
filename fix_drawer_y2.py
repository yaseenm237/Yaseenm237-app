import re

with open('src/components/CabinetDesignerModal.tsx', 'r') as f:
    content = f.read()

search = """          const fasciaH = node.drawerFasciaH || ch - (unit === 'Inch' ? 0.125 : 3);
          const sideL = node.drawerSideL || (depth - (unit === 'Inch' ? 1 : 25));
          const sideH = node.drawerSideH || Math.max(fasciaH - (unit === 'Inch' ? 1 : 25), 0);
          const boxW = Math.max(effCw - clearance - (2 * p), 0);
          const innerFrontH = node.drawerInnerFrontH || (unit === 'Inch' ? 3 : unit === 'CM' ? 7 : 70);

          // Front
          addPart({
            id: `cab-draw-front-${node.id}`,
            name: isHindi ? 'दराज फ्रंट पैनल (Drawer Front)' : 'Drawer Front Plate',
            length: fasciaW,
            width: fasciaH,
            grain: 'W',
            allowRot: false,
            quantity: 1,
            edges: { T: true, B: true, L: true, R: true }
          }, rx + cw/2, ry + ch/2, 'drawer_front', node.id);

          // Sides
          addPart({
            id: `cab-draw-side-${node.id}`,
            name: isHindi ? 'दराज साइड बॉक्स (Drawer Side)' : 'Drawer Side Box',
            length: sideL,
            width: sideH,
            grain: 'L',
            allowRot: true,
            quantity: 2,
            edges: { T: true, B: false, L: false, R: false }
          }, rx + cw/2, ry + ch/2, 'drawer_side', node.id);

          // Back
          addPart({
            id: `cab-draw-back-${node.id}`,
            name: isHindi ? 'दराज बैक बॉक्स (Drawer Back)' : 'Drawer Back Box',
            length: boxW,
            width: sideH,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: true, B: false, L: false, R: false }
          }, rx + cw/2, ry + ch/2, 'drawer_back', node.id);

          // Inner Front
          addPart({
            id: `cab-draw-front-inner-${node.id}`,
            name: isHindi ? 'दराज अंदरूनी फ्रंट (Drawer Inner Front)' : 'Drawer Inner Front Strip',
            length: boxW,
            width: innerFrontH,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: true, B: false, L: false, R: false }
          }, rx + cw/2, ry + ch/2, 'drawer_inner_front', node.id);

          // Bottom
          addPart({
            id: `cab-draw-bot-${node.id}`,
            name: isHindi ? 'दराज का बेस (Drawer Bottom)' : 'Drawer Bottom',
            length: boxW,
            width: sideL,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: false, B: false, L: false, R: false }
          }, rx + cw/2, ry + ch/2, 'drawer_bottom', node.id);
        }
        return;"""

new_block = """          const fasciaH = node.drawerFasciaH || ch - (unit === 'Inch' ? 0.125 : 3);
          const sideL = node.drawerSideL || (depth - (unit === 'Inch' ? 1 : 25));
          const sideH = node.drawerSideH || Math.max(fasciaH - (unit === 'Inch' ? 1 : 25), 0);
          const boxW = Math.max(effCw - clearance - (2 * p), 0);
          const innerFrontH = node.drawerInnerFrontH || (unit === 'Inch' ? 3 : unit === 'CM' ? 7 : 70);

          const fy = node.drawerOffsetY !== undefined ? ry + node.drawerOffsetY : ry + (ch - fasciaH) / 2;

          // Front
          addPart({
            id: `cab-draw-front-${node.id}`,
            name: isHindi ? 'दराज फ्रंट पैनल (Drawer Front)' : 'Drawer Front Plate',
            length: fasciaW,
            width: fasciaH,
            grain: 'W',
            allowRot: false,
            quantity: 1,
            edges: { T: true, B: true, L: true, R: true }
          }, rx + cw/2, fy + fasciaH/2, 'drawer_front', node.id);

          // Sides
          addPart({
            id: `cab-draw-side-${node.id}`,
            name: isHindi ? 'दराज साइड बॉक्स (Drawer Side)' : 'Drawer Side Box',
            length: sideL,
            width: sideH,
            grain: 'L',
            allowRot: true,
            quantity: 2,
            edges: { T: true, B: false, L: false, R: false }
          }, rx + cw/2, fy + fasciaH/2, 'drawer_side', node.id);

          // Back
          addPart({
            id: `cab-draw-back-${node.id}`,
            name: isHindi ? 'दराज बैक बॉक्स (Drawer Back)' : 'Drawer Back Box',
            length: boxW,
            width: sideH,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: true, B: false, L: false, R: false }
          }, rx + cw/2, fy + fasciaH/2, 'drawer_back', node.id);

          // Inner Front
          addPart({
            id: `cab-draw-front-inner-${node.id}`,
            name: isHindi ? 'दराज अंदरूनी फ्रंट (Drawer Inner Front)' : 'Drawer Inner Front Strip',
            length: boxW,
            width: innerFrontH,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: true, B: false, L: false, R: false }
          }, rx + cw/2, fy + fasciaH/2, 'drawer_inner_front', node.id);

          // Bottom
          addPart({
            id: `cab-draw-bot-${node.id}`,
            name: isHindi ? 'दराज का बेस (Drawer Bottom)' : 'Drawer Bottom',
            length: boxW,
            width: sideL,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: false, B: false, L: false, R: false }
          }, rx + cw/2, fy + fasciaH/2, 'drawer_bottom', node.id);
        }
        return;"""

if search in content:
    content = content.replace(search, new_block)
    with open('src/components/CabinetDesignerModal.tsx', 'w') as f:
        f.write(content)
    print("Replaced Y offset for drawer parts")
else:
    print("Could not find block")

