import re

with open('src/utils/shareCompressor.ts', 'r') as f:
    code = f.read()

code = code.replace(
    "tm: settings.trimMargin,",
    "tm: settings.trimMargin,\n    te: settings.trimEdges,"
)

code = code.replace(
    "trimMargin: s.tm,",
    "trimMargin: s.tm,\n        trimEdges: s.te,"
)

with open('src/utils/shareCompressor.ts', 'w') as f:
    f.write(code)
