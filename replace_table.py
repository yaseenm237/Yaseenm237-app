import re

with open('src/components/CuttingListPanel.tsx', 'r') as f:
    content = f.read()

# We need to extract the part rendering from <table id="cutlist-table" ... to </table>
# Since the block is huge, we will find the start and end indices manually.

start_tag = '<table id="cutlist-table" className="w-full text-left border-collapse min-w-[1400px]">'
end_tag = '          </table>'

start_idx = content.find(start_tag)
end_idx = content.find(end_tag, start_idx) + len(end_tag)

if start_idx == -1 or end_idx == -1:
    print("Could not find table tags!")
    exit(1)

table_content = content[start_idx:end_idx]

# Replace table tags with grid wrappers
new_content = """<div 
            id="cutlist-grid"
            className="grid gap-y-1 min-w-max pb-4 items-center" 
            style={{ 
              gridTemplateColumns: [
                'minmax(220px, auto)',
                hasMultiMaterials ? 'minmax(120px, auto)' : null,
                'minmax(100px, auto)',
                'minmax(100px, auto)',
                'minmax(110px, auto)',
                'minmax(90px, auto)',
                '80px',
                'minmax(140px, auto)',
                hasEdgeMaterials ? 'minmax(140px, auto)' : null,
                'minmax(140px, auto)',
                'minmax(140px, auto)',
                '80px'
              ].filter(Boolean).join(' ') 
            }}
          >
            {/* Header */}
            <div className="contents text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_name}</div>
              {hasMultiMaterials && <div className="pb-3 border-b border-slate-100 px-1">{isHindi ? 'मटीरियल' : 'Material'}</div>}
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_l} ({unit})</div>
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_w} ({unit})</div>
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_grain}</div>
              <div className="pb-3 border-b border-slate-100 px-1">{translations.allow_rot}</div>
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_qty}</div>
              <div className="pb-3 border-b border-slate-100 px-1">{translations.h_edges} (T, B, L, R)</div>
              {hasEdgeMaterials && <div className="pb-3 border-b border-slate-100 px-1">{isHindi ? 'एज बैंड टेप' : 'Edge Band'}</div>}
              <div className="pb-3 border-b border-slate-100 px-1">{isHindi ? 'सामने का माइका' : 'Front Mica'}</div>
              <div className="pb-3 border-b border-slate-100 px-1">{isHindi ? 'पीछे का माइका' : 'Back Mica'}</div>
              <div className="pb-3 border-b border-slate-100 px-1 text-center"></div>
            </div>

            {/* Body */}
            {parts.map((part) => (
              <div key={part.id} className="grid col-span-full items-center hover:bg-slate-50/50 transition-colors p-1 rounded-xl group" style={{ gridTemplateColumns: 'subgrid' }}>
"""

# Extract the inside of the parts loop
row_start_marker = '{parts.map((part) => ('
row_start_idx = table_content.find(row_start_marker)
if row_start_idx == -1:
    print("Could not find row start!")
    exit(1)

row_start_idx += len(row_start_marker)

# Get the contents between <tr ...> and </tr>
tr_start = table_content.find('<tr key={part.id}', row_start_idx)
tr_end = table_content.find('</tr>', tr_start)
td_content = table_content[table_content.find('>', tr_start)+1 : tr_end]

# Replace td with div
td_content = td_content.replace('<td', '<div')
td_content = td_content.replace('</td', '</div')

# Remove invisible spans w-full width constraint and min-w to smaller so they auto-grow more easily
td_content = td_content.replace('min-w-[180px]', 'min-w-[140px]')
td_content = td_content.replace('min-w-[100px]', 'min-w-[80px]')

# Construct the full new block
full_new_content = new_content + td_content + "\n              </div>\n            ))}\n          </div>"

final_file_content = content[:start_idx] + full_new_content + content[end_idx:]

with open('src/components/CuttingListPanel.tsx', 'w') as f:
    f.write(final_file_content)

print("Replaced table with grid!")
