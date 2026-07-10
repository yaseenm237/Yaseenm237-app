import re

with open('src/components/CabinetDesignerModal.tsx', 'r') as f:
    content = f.read()

# Let's insert drawerOffsetY below drawerFasciaH
ui_search = '''                                          className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0 placeholder:text-slate-300"
                                         />
                                         <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                       </div>
                                     </label>
                                   </div>'''

new_ui = '''                                          className="w-12 bg-transparent border-0 p-0 text-right text-xs font-bold text-slate-900 focus:ring-0 placeholder:text-slate-300"
                                         />
                                         <span className="text-[10px] text-slate-400 font-bold">{unit}</span>
                                       </div>
                                     </label>
                                     <label className="flex justify-between items-center text-xs font-bold text-slate-900">
                                       <span>{isHindi ? 'ऐप से दूरी (Position Y)' : 'Offset from Top (Y)'}</span>
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
                                     </label>
                                   </div>'''

if ui_search in content:
    content = content.replace(ui_search, new_ui, 1) # replace only the first occurrence which is in Front Panel section
    with open('src/components/CabinetDesignerModal.tsx', 'w') as f:
        f.write(content)
    print("Replaced UI")
else:
    print("UI search not found")
