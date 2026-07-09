import re

with open('src/components/LayoutVisualizerPanel.tsx', 'r') as f:
    content = f.read()

# Add imports for jsPDF and html2canvas
if 'import { jsPDF } from' not in content:
    content = content.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { jsPDF } from 'jspdf';\nimport html2canvas from 'html2canvas';")

# Find the actions div and add the buttons
actions_div = r'<div className="flex items-center gap-3 ml-auto pr-6">'

new_buttons = """
          <button
            onClick={async () => {
              const element = document.getElementById('layout-container');
              if (element) {
                const canvas = await html2canvas(element, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                  orientation: 'landscape',
                  unit: 'px',
                  format: [canvas.width, canvas.height]
                });
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save('layout.pdf');
              }
            }}
            className="flex items-center justify-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Printer size={14} className="text-indigo-500" />
            {isHindi ? "PDF सहेजें" : "Save PDF"}
          </button>
          <button
            onClick={async () => {
              const element = document.getElementById('layout-container');
              if (element) {
                const canvas = await html2canvas(element, { scale: 2 });
                const link = document.createElement('a');
                link.download = 'layout.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
              }
            }}
            className="flex items-center justify-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Download size={14} className="text-teal-500" />
            {isHindi ? "छवि सहेजें" : "Save Image"}
          </button>
"""

if "Save PDF" not in content:
    content = content.replace(actions_div, actions_div + new_buttons)

    # Need to add ID to the layout container
    # Find the container for the layouts
    # Let's search for the div that wraps the sheets
    # We can wrap the whole mapping of layouts
    # <div className="space-y-16 pb-24">
    content = content.replace('<div className="space-y-16 pb-24">', '<div id="layout-container" className="space-y-16 pb-24 bg-white p-8 rounded-xl">')

with open('src/components/LayoutVisualizerPanel.tsx', 'w') as f:
    f.write(content)

