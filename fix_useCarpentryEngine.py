import re

with open('src/hooks/useCarpentryEngine.ts', 'r') as f:
    content = f.read()

idx_start = content.find("const calculateResult = async (overrideSettings?: SheetSettings) => {")
idx_end = content.find("  const handleLanguageToggle = () => {", idx_start)

if idx_start != -1 and idx_end != -1:
    new_calculate_result = """  const calculateResult = async (overrideSettings?: SheetSettings) => {
    setIsCalculating(true);
    let success = false;
    const activeSettings = (overrideSettings && typeof overrideSettings === 'object' && 'unit' in overrideSettings) ? overrideSettings : settings;

    // Use worker if ready
    if (engineRef.current) {
      try {
        console.log("[App] Sending input to JS Worker:", parts.length, "parts");
        const workerRes = await engineRef.current.runPackingJS(parts, activeSettings);
        
        if (workerRes && workerRes.status === 'success') {
          setResult(workerRes.result);
          success = true;
          if (compareResults) {
            const comp = compareAlgorithms(parts, activeSettings);
            setCompareResults(comp);
          }
        } else {
          console.warn("[App] JS Worker failed:", workerRes);
        }
      } catch (err) {
        console.error("[App] Worker calculation error:", err);
      }
    }

    if (!success) {
      console.log("[App] Running fallback JS-based packing algorithm directly...");
      const updatedResult = runPacking(parts, activeSettings);
      setResult(updatedResult);
      if (compareResults) {
        const comp = compareAlgorithms(parts, activeSettings);
        setCompareResults(comp);
      }
    }

    setIsCalculating(false);
  };

"""
    content = content[:idx_start] + new_calculate_result + content[idx_end:]
    with open('src/hooks/useCarpentryEngine.ts', 'w') as f:
        f.write(content)
    print("Success")
else:
    print(f"Could not find. Start: {idx_start}, End: {idx_end}")
