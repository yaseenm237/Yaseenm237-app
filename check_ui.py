import re

with open('src/components/CabinetDesignerModal.tsx', 'r') as f:
    content = f.read()

if 'drawerOffsetY' in content:
    print("drawerOffsetY is in the file")
else:
    print("drawerOffsetY is NOT in the file")

