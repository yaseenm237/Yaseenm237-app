import sys

with open('src/components/layout-visualizer/KpiStatsGrid.tsx', 'r') as f:
    content = f.read()

content = content.replace("convertMmToUnit(totalBandingLength,\n  totalKerfLossMm2 = 0, unit)", "convertMmToUnit(totalBandingLength, unit)")

with open('src/components/layout-visualizer/KpiStatsGrid.tsx', 'w') as f:
    f.write(content)
