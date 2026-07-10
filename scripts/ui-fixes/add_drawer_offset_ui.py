import re

with open('src/components/CabinetDesignerModal.tsx', 'r') as f:
    content = f.read()

# Look for drawerFasciaH
ui_search = '''                                        <input
                                           type="number"
                                           min="0"
                                           step="0.1"
                                           value={selectedNode.drawerFasciaH || ''}'''

new_ui = '''                                        <input
                                           type="number"
                                           min="0"
                                           step="0.1"
                                           value={selectedNode.drawerFasciaH || ''}'''

if ui_search in content:
    print("Found UI")
else:
    print("UI not found")
