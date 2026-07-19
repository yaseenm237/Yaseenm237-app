import re

with open('src/components/AppWorkspace.tsx', 'r') as f:
    code = f.read()

# We need to insert `const [isMapOpen, setIsMapOpen] = useState(false);` at the top of the AppWorkspace component.
# Let's find `export default function AppWorkspace() {\n  const {`
replacement = """export default function AppWorkspace() {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const {"""

code = code.replace("""export default function AppWorkspace() {
  const {""", replacement)

with open('src/components/AppWorkspace.tsx', 'w') as f:
    f.write(code)

