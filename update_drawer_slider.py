import re

with open('src/components/CabinetDesignerModal.tsx', 'r') as f:
    content = f.read()

# Replace the number input for drawerOffsetY with a range slider + number input
old_input = '''                                    <label className="flex justify-between items-center text-xs font-bold text-slate-900">
                                      <span>{isHindi ? 'टॉप से दूरी (Position Y)' : 'Offset from Top (Y)'}</span>
                                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-1">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          value={selectedNode.drawerOffsetY ?? ''}
                                          placeholder="Auto"
                                          onChange={(e) => {
                                            let v = parseFloat(e.target.value);
                                            setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, drawerOffsetY: isNaN(v) ? undefined : v })));
                                          }}
                                          className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0 placeholder:text-slate-300"
                                        />
                                        <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                      </div>
                                    </label>'''

new_input = '''                                    <div>
                                      <div className="flex justify-between items-center text-xs font-bold text-slate-900 mb-2">
                                        <span>{isHindi ? 'टॉप से दूरी (Position Y)' : 'Offset from Top (Y)'}</span>
                                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-1 py-1">
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.1"
                                            value={selectedNode.drawerOffsetY ?? ''}
                                            placeholder="Auto"
                                            onChange={(e) => {
                                              let v = parseFloat(e.target.value);
                                              setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, drawerOffsetY: isNaN(v) ? undefined : v })));
                                            }}
                                            className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0 placeholder:text-slate-300"
                                          />
                                          <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                        </div>
                                      </div>
                                      <input 
                                        type="range" 
                                        min="0" 
                                        max={b ? Math.max(b.h - (selectedNode.drawerFasciaH || 0), 0) : 100} 
                                        step="0.1"
                                        value={selectedNode.drawerOffsetY ?? (b ? (b.h - (selectedNode.drawerFasciaH || b.h)) / 2 : 0)} 
                                        onChange={(e) => {
                                          const v = parseFloat(e.target.value);
                                          setRootNode(prev => updateNode(prev, selectedNode.id, n => ({ ...n, drawerOffsetY: v })));
                                        }}
                                        className="w-full accent-amber-600"
                                      />
                                    </div>'''

if old_input in content:
    content = content.replace(old_input, new_input)
    with open('src/components/CabinetDesignerModal.tsx', 'w') as f:
        f.write(content)
    print("Added slider")
else:
    print("Old input not found")

