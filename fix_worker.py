import re

with open('src/worker.ts', 'r') as f:
    content = f.read()

# Change init(wasmUrl) to init(await (await fetch(wasmUrl)).arrayBuffer())
old_init = "const initResult = await init(wasmUrl);"
new_init = """      const response = await fetch(wasmUrl);
      const buffer = await response.arrayBuffer();
      const initResult = await init(buffer);"""

if old_init in content:
    content = content.replace(old_init, new_init)
    with open('src/worker.ts', 'w') as f:
        f.write(content)
    print("Fixed worker init")
else:
    print("Old init not found")

