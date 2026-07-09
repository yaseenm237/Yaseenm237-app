import re

with open('src/hooks/useCarpentryEngine.ts', 'r') as f:
    content = f.read()

# Find the useEffect block for `parts`
# It probably looks like:
#   useEffect(() => {
#     if (parts.length > 0) {
#       calculateResult();
#     } else {
#       setResult({ ... });
#     }
#   }, [parts]);

pattern = re.compile(r'  useEffect\(\(\) => \{\n    // Only auto-calculate.*?if \(parts\.length > 0\) \{.*?calculateResult\(\);.*?\} else \{.*?setResult\(\{.*?unplacedParts: \[\]\n      \}\);\n      setCompareResults\(null\);\n    \}\n  \}, \[parts\]\);', re.DOTALL)
match = pattern.search(content)

if match:
    # Replace it with just resetting the result if parts is empty, no auto calculate if not empty.
    replacement = """  useEffect(() => {
    if (parts.length === 0) {
      setResult({
        layouts: [],
        totalSheetsUsed: 0,
        totalUtilization: 0,
        overallWastePercent: 0,
        totalPartsArea: 0,
        totalBandingLength: 0,
        unplacedParts: []
      });
      setCompareResults(null);
    }
  }, [parts]);"""
    content = content[:match.start()] + replacement + content[match.end():]
    with open('src/hooks/useCarpentryEngine.ts', 'w') as f:
        f.write(content)
    print("Replaced useEffect.")
else:
    print("Could not find useEffect.")

