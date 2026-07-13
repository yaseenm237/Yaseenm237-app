import fs from 'fs';
let code = fs.readFileSync('src/components/SettingsModal.tsx', 'utf8');

const regex = /<label className="block text-\[11px\] font-bold text-slate-500 uppercase tracking-wider mb-1\.5 flex justify-between">\s*\{isHindi \? "ट्रिम मार्जिन \(Trim\)" : "Trim Margin"\}\s*<span className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">mm<\/span>\s*<\/label>\s*<input\s*type="number"\s*min="0"\s*step="1"\s*value=\{localSettings\.trimMargin\}\s*onFocus=\{\(e\) => e\.target\.select\(\)\}\s*onChange=\{\(e\) => handleFieldChange\('trimMargin', parseFloat\(e\.target\.value\) \|\| 0\)\}\s*className="w-full text-sm font-medium border-slate-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2\.5"\s*\/>/;

const replacement = \`<label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                  {isHindi ? "ट्रिम मार्जिन (Trim)" : "Trim Margin"}
                  <span className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">mm</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={localSettings.trimMargin}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    handleFieldChange('trimMargin', parseFloat(e.target.value) || 0);
                    if (!localSettings.trimEdges) {
                      handleFieldChange('trimEdges', { top: true, bottom: true, left: true, right: true });
                    }
                  }}
                  className="w-full text-sm font-medium border-slate-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-3 py-2.5"
                />
                
                {localSettings.trimMargin > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    {['top', 'bottom', 'left', 'right'].map(edge => {
                      const edges = localSettings.trimEdges || { top: true, bottom: true, left: true, right: true };
                      const label = isHindi 
                        ? (edge === 'top' ? 'ऊपर' : edge === 'bottom' ? 'नीचे' : edge === 'left' ? 'बाएं' : 'दाएं')
                        : edge.charAt(0).toUpperCase() + edge.slice(1);
                      return (
                        <label key={edge} className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={edges[edge as keyof typeof edges]} 
                            onChange={(e) => {
                              handleFieldChange('trimEdges', {
                                ...edges,
                                [edge]: e.target.checked
                              });
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          {label}
                        </label>
                      )
                    })}
                  </div>
                )}\`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/SettingsModal.tsx', code);
