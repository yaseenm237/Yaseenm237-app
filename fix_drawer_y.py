import re

with open('src/components/CabinetDesignerModal.tsx', 'r') as f:
    content = f.read()

# Replace the Y coordinate in addPart for drawers
search = '''          const innerFrontH = node.drawerInnerFrontH || (unit === 'Inch' ? 3 : unit === 'CM' ? 7 : 70);

          if (dumL > 0) {
            addPart({
              id: `cab-dumL-${node.id}`,
              name: isHindi ? 'दराज डमी (बायाँ)' : 'Drawer Dummy (Left)',
              length: ch,
              width: dumL,
              grain: 'L',
              allowRot: true,
              quantity: 1,
              edges: { T: true, B: true, L: true, R: false }
            }, rx + dumL/2, ry + ch/2, 'dummy', node.id);
          }
          if (dumR > 0) {
            addPart({
              id: `cab-dumR-${node.id}`,
              name: isHindi ? 'दराज डमी (दायाँ)' : 'Drawer Dummy (Right)',
              length: ch,
              width: dumR,
              grain: 'L',
              allowRot: true,
              quantity: 1,
              edges: { T: true, B: true, L: false, R: true }
            }, rx + cw - dumW/2, ry + ch/2, 'dummy', node.id);
          }

          const clearance = node.channelClearance || (unit === 'Inch' ? 1 : unit === 'CM' ? 2.5 : 25);
          const fasciaW = node.drawerFasciaW || Math.max(effCw - (unit === 'Inch' ? 0.25 : 6), 0);
          const fasciaH = node.drawerFasciaH || ch - (unit === 'Inch' ? 0.125 : 3);
          const sideL = node.drawerSideL || (depth - (unit === 'Inch' ? 1 : 25));
          const sideH = node.drawerSideH || Math.max(fasciaH - (unit === 'Inch' ? 1 : 25), 0);
          const boxW = Math.max(effCw - clearance - (2 * p), 0);
          const innerFrontH_calc = innerFrontH; // renaming since it's already defined

          const fy = node.drawerOffsetY !== undefined ? ry + node.drawerOffsetY : ry + (ch - fasciaH) / 2;

          // Fascia
          addPart({
            id: `cab-draw-fasc-${node.id}`,
            name: isHindi ? 'दराज फ्रंट पैनल (Fascia)' : 'Drawer Front Panel (Fascia)',
            length: fasciaW,
            width: fasciaH,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: true, B: true, L: true, R: true }
          }, rx + cw/2, fy + fasciaH/2, 'drawer_fascia', node.id);

          // Side
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
        return;'''

def build_regex(old_code):
    lines = old_code.split('\n')
    pattern = '.*'.join(re.escape(l.strip()) for l in lines if l.strip())
    return pattern

import string
# Read all lines
lines = content.split('\n')
start_idx = -1
end_idx = -1
for i, line in enumerate(lines):
    if "const innerFrontH =" in line and start_idx == -1:
        start_idx = i
    if "return;" in line and start_idx != -1 and i > start_idx + 10:
        if "if (node.splitType === 'h'" in lines[i+2]:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    old_block = '\n'.join(lines[start_idx:end_idx+1])
    
    new_block = '''          const clearance = node.channelClearance || (unit === 'Inch' ? 1 : unit === 'CM' ? 2.5 : 25);
          const fasciaW = node.drawerFasciaW || Math.max(effCw - (unit === 'Inch' ? 0.25 : 6), 0);
          const fasciaH = node.drawerFasciaH || ch - (unit === 'Inch' ? 0.125 : 3);
          const fy = node.drawerOffsetY !== undefined ? ry + node.drawerOffsetY : ry + (ch - fasciaH) / 2;
          const dummyH = fasciaH; // Adjust dummy height to match fascia or leave as ch? If it's attached to the drawer it should be fasciaH. User usually wants dummy full height, or fascia height. Let's make it fasciaH.

          const innerFrontH = node.drawerInnerFrontH || (unit === 'Inch' ? 3 : unit === 'CM' ? 7 : 70);

          if (dumL > 0) {
            addPart({
              id: `cab-dumL-${node.id}`,
              name: isHindi ? 'दराज डमी (बायाँ)' : 'Drawer Dummy (Left)',
              length: ch, // Dummies are usually full compartment height
              width: dumL,
              grain: 'L',
              allowRot: true,
              quantity: 1,
              edges: { T: true, B: true, L: true, R: false }
            }, rx + dumL/2, ry + ch/2, 'dummy', node.id);
          }
          if (dumR > 0) {
            addPart({
              id: `cab-dumR-${node.id}`,
              name: isHindi ? 'दराज डमी (दायाँ)' : 'Drawer Dummy (Right)',
              length: ch,
              width: dumR,
              grain: 'L',
              allowRot: true,
              quantity: 1,
              edges: { T: true, B: true, L: false, R: true }
            }, rx + cw - dumW/2, ry + ch/2, 'dummy', node.id);
          }

          const sideL = node.drawerSideL || (depth - (unit === 'Inch' ? 1 : 25));
          const sideH = node.drawerSideH || Math.max(fasciaH - (unit === 'Inch' ? 1 : 25), 0);
          const boxW = Math.max(effCw - clearance - (2 * p), 0);

          // Fascia
          addPart({
            id: `cab-draw-fasc-${node.id}`,
            name: isHindi ? 'दराज फ्रंट पैनल (Fascia)' : 'Drawer Front Panel (Fascia)',
            length: fasciaW,
            width: fasciaH,
            grain: 'L',
            allowRot: true,
            quantity: 1,
            edges: { T: true, B: true, L: true, R: true }
          }, rx + cw/2, fy + fasciaH/2, 'drawer_fascia', node.id);

          // Side
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
        return;'''
    
    content = content.replace(old_block, new_block)
    with open('src/components/CabinetDesignerModal.tsx', 'w') as f:
        f.write(content)
    print("Replaced Drawer part coordinates")
else:
    print("Could not find block")

