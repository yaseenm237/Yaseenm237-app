import re

with open('src/components/CabinetDesignerModal.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<div className="lg:col-span-5 flex flex-col space-y-4">',
    '<div className="lg:col-span-4 flex flex-col space-y-4">'
)

content = content.replace(
    '<div className="lg:col-span-7 flex flex-col md:flex-row gap-4 items-center justify-center">',
    '<div className="lg:col-span-8 flex flex-col gap-4 items-center justify-center h-full">'
)

content = content.replace(
    '<div className="flex justify-between items-center w-full max-w-[220px] mb-1.5">',
    '<div className="flex justify-between items-center w-full mb-1.5 px-4">'
)

content = content.replace(
    '<div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex items-center justify-center w-[220px] h-[304px]">',
    '<div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex items-center justify-center w-full h-full min-h-[500px] max-h-[80vh]">'
)

content = content.replace(
    '<svg width={180} height={260} className="text-white">',
    '<svg viewBox="0 0 180 260" className="text-white w-full h-full">'
)

with open('src/components/CabinetDesignerModal.tsx', 'w') as f:
    f.write(content)

print("Fixed SVG width")
