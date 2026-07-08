import re

with open('src/components/CabinetDesignerModal.tsx', 'r') as f:
    content = f.read()

# We want to pull calcBounds up so it can be used for the drawer slider too.
# Actually, the user might be fine with a number input, since all other drawer settings (Height, Depth, Inner Front) are number inputs!
