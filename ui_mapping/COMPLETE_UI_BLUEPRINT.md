# 🚀 COMPLETE A TO Z UI BLUEPRINT: SHAHIRAH INTERIOR (REACT -> RUST/DIOXUS)

This is the MASTER blueprint document. Give this single file to your Rust/Dioxus AI assistant so it understands the exact UI layout, Tailwind CSS classes, state structures, and button actions without needing to read multiple separate files.

---

## 🏗️ 1. GLOBAL STATE (Shared State / Context)
In Dioxus, use `use_shared_state::<AppState>(cx)` or pass down a main struct via props.

```rust
struct AppState {
    // 1. Settings
    unit: String, // "mm", "cm", "inch"
    sheet_length: f64, // e.g., 2440.0
    sheet_width: f64, // e.g., 1220.0
    blade_kerf: f64, // e.g., 3.2
    trim_margin: f64, // e.g., 10.0
    edge_banding_thickness: f64, // e.g., 1.0

    // 2. Parts List (Input)
    parts: Vec<PartInput>,

    // 3. Results (Output from packing algorithm)
    packing_result: Option<PackingResult>,

    // 4. UI Toggles
    is_hindi_language: bool,
    theme: String, // "light" or "dark"
    
    // 5. Modals Open State
    modal_attendance_open: bool,
    modal_estimate_open: bool,
    modal_export_open: bool,
}

struct PartInput {
    id: String,
    name: String,
    length: f64,
    width: f64,
    quantity: u32,
    can_rotate: bool,
    edge_top: bool,
    edge_bottom: bool,
    edge_left: bool,
    edge_right: bool,
}
```

---

## 🖥️ 2. MAIN APP LAYOUT (AppWorkspace)
The main screen is a flex container that splits into a Left Panel (Inputs) and Right Panel (Outputs).

### Base Container HTML/Tailwind:
```html
<div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
    
    <!-- HEADER -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-2 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <h1 class="text-xl font-bold text-slate-800">Shahirah Interior</h1>
            <!-- Smart Badge showing active job name / state -->
            <div class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">New Project</div>
        </div>
        
        <!-- Dropdown Menu Trigger -->
        <button class="p-2 rounded-full hover:bg-slate-100 border border-slate-200" onclick="toggle_menu()">
            [MoreVertical Icon]
        </button>
    </header>

    <!-- MAIN TWO-COLUMN WORKSPACE -->
    <main class="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        <!-- LEFT PANEL (35% width on desktop) -->
        <div class="w-full lg:w-[35%] xl:w-[30%] bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-60px)] overflow-y-auto">
            [See Section 3: Left Panel]
        </div>

        <!-- RIGHT PANEL (65% width on desktop) -->
        <div class="flex-1 bg-slate-50 h-[calc(100vh-60px)] overflow-y-auto p-4 lg:p-6">
            [See Section 4: Right Panel]
        </div>

    </main>
</div>
```

---

## 🎛️ 3. LEFT PANEL: INPUTS (CuttingListPanel)

This panel handles board settings and the list of parts.

### A. Settings Section
```html
<div class="p-4 border-b border-slate-200 bg-slate-50/50">
    <div class="grid grid-cols-2 gap-3">
        <!-- Board Size Input -->
        <div>
            <label class="text-xs font-bold text-slate-600">Board Length (L)</label>
            <input type="number" class="w-full p-2 border rounded" value="{state.sheet_length}" />
        </div>
        <div>
            <label class="text-xs font-bold text-slate-600">Board Width (W)</label>
            <input type="number" class="w-full p-2 border rounded" value="{state.sheet_width}" />
        </div>
        <!-- Kerf Input -->
        <div>
            <label class="text-xs font-bold text-slate-600">Blade Kerf</label>
            <input type="number" class="w-full p-2 border rounded" value="{state.blade_kerf}" />
        </div>
    </div>
</div>
```

### B. Parts List Section
A loop rendering each part in `state.parts`.

```html
<div class="p-4 flex flex-col gap-3">
    <!-- For each part in state.parts -->
    <div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative group">
        
        <div class="flex gap-2">
            <!-- Part Name -->
            <input type="text" placeholder="Part Name" class="flex-1 p-2 border rounded text-sm font-bold" />
            
            <!-- Length -->
            <input type="number" placeholder="L" class="w-16 p-2 border rounded text-sm" />
            <span class="mt-2 text-slate-400">×</span>
            
            <!-- Width -->
            <input type="number" placeholder="W" class="w-16 p-2 border rounded text-sm" />
            
            <!-- Quantity -->
            <input type="number" placeholder="Qty" class="w-12 p-2 border rounded text-sm bg-slate-50" />
            
            <!-- Delete Button -->
            <button class="text-red-500 p-2 hover:bg-red-50 rounded">[Trash Icon]</button>
        </div>

        <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <!-- Edge Banding Controls (Top, Bottom, Left, Right) -->
            <div class="flex gap-1">
                <button class="px-2 py-1 text-xs rounded border {part.edge_top ? 'bg-orange-500 text-white' : 'bg-slate-100'}">Top</button>
                <button class="px-2 py-1 text-xs rounded border {part.edge_bottom ? 'bg-orange-500 text-white' : 'bg-slate-100'}">Btm</button>
                <button class="px-2 py-1 text-xs rounded border {part.edge_left ? 'bg-orange-500 text-white' : 'bg-slate-100'}">Lft</button>
                <button class="px-2 py-1 text-xs rounded border {part.edge_right ? 'bg-orange-500 text-white' : 'bg-slate-100'}">Rgt</button>
            </div>
            
            <!-- Rotation Toggle -->
            <button class="flex items-center gap-1 text-xs px-2 py-1 rounded {part.can_rotate ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 bg-slate-100'}">
                [Rotate Icon] {part.can_rotate ? 'Rotatable' : 'Fixed'}
            </button>
        </div>
    </div>
    
    <!-- Add New Part Button -->
    <button class="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl hover:bg-slate-50 font-bold" onclick="add_empty_part()">
        + Add New Part
    </button>
</div>
```

### C. Optimize Action (Sticky Bottom)
```html
<div class="sticky bottom-0 bg-white p-4 border-t border-slate-200 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
    <button class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-[0.98]" onclick="run_packing_algorithm()">
        [Play Icon] Optimize Layout
    </button>
</div>
```

---

## 🎨 4. RIGHT PANEL: VISUALIZER (LayoutVisualizerPanel)

When `state.packing_result` is `Some(result)`, show the layouts.

### A. KPI Stats Bar
```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-slate-500 text-xs font-bold uppercase">Sheets Used</div>
        <div class="text-2xl font-black text-indigo-700">{result.sheets.len()}</div>
    </div>
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div class="text-slate-500 text-xs font-bold uppercase">Yield</div>
        <div class="text-2xl font-black text-emerald-600">85%</div>
    </div>
    <!-- ... Placed Parts, Unplaced Parts ... -->
</div>
```

### B. SVG Layout Renderer
For each `sheet` in `result.sheets`, render this:

```html
<div class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
    <div class="bg-slate-800 text-white p-3 flex justify-between items-center">
        <h3 class="font-bold">Sheet 1</h3>
    </div>
    
    <div class="p-4 bg-slate-900 flex justify-center overflow-auto">
        <!-- SVG Canvas (Relative coordinate system) -->
        <svg viewBox="0 0 {svg_width} {svg_height}" class="max-w-full h-auto max-h-[600px]">
            
            <!-- 1. Base Plywood Background -->
            <rect x="0" y="0" width="{sheet_length}" height="{sheet_width}" fill="#f3f4f6" stroke="#cbd5e1" stroke-width="2" />
            
            <!-- 2. Iterate and Draw Each Placed Part -->
            <!-- loop part in sheet.placed_parts -->
            <g class="cursor-pointer group">
                <!-- Part Rectangle -->
                <rect x="{part.x}" y="{part.y}" width="{part.width}" height="{part.height}" fill="#c7d2fe" stroke="#334155" stroke-width="1" />
                
                <!-- Text Label inside part -->
                <text x="{part.x + part.width/2}" y="{part.y + part.height/2}" text-anchor="middle" font-size="12" font-weight="bold" fill="#1e293b">
                    {part.name}
                </text>
                
                <!-- Edge Banding Indicators (If top edge is banded) -->
                <line x1="{part.x}" y1="{part.y}" x2="{part.x + part.width}" y2="{part.y}" stroke="#ea580c" stroke-width="4" stroke-dasharray="4,2" />
            </g>
        </svg>
    </div>
</div>
```

---

## 🛠️ 5. DROPDOWN MENU ACTIONS & MODALS (HeaderMenu)

When clicking the MoreVertical icon in the header, a dropdown appears with these buttons:

1. **App Flow Map (Layout Icon)**: Opens the Logic Map modal.
2. **Attendance / Hajiri (Users Icon)**: Opens `AttendanceModal`.
3. **Estimate Calculator (Calculator Icon)**: Opens `EstimateCalculatorModal`.
4. **Export / Print (Download Icon)**: Triggers PDF generation or prints the screen.

### Example: Hajiri Portal Modal Layout
```html
<!-- Dioxus Modal Overlay -->
<div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <!-- Modal Header -->
        <div class="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h2 class="text-xl font-bold text-slate-800">Hajiri Portal (Attendance & Salary)</h2>
            <button onclick="close_modal()" class="p-2 hover:bg-slate-200 rounded-full">[Close Icon]</button>
        </div>
        
        <!-- Modal Body: Tabs -->
        <div class="flex border-b border-slate-200 px-4 pt-2">
            <button class="px-4 py-2 border-b-2 border-indigo-600 text-indigo-700 font-bold">Daily Attendance</button>
            <button class="px-4 py-2 border-b-2 border-transparent text-slate-500 font-medium">Advance & Salary</button>
        </div>
        
        <!-- Tab Content -->
        <div class="flex-1 overflow-auto p-4">
            <!-- List of workers with Present/Absent toggles -->
            <div class="flex justify-between items-center p-3 border-b">
                <span class="font-bold">Raju Carpenter</span>
                <div class="flex gap-2">
                    <button class="bg-green-100 text-green-700 px-3 py-1 rounded">Present</button>
                    <button class="bg-red-100 text-red-700 px-3 py-1 rounded">Absent</button>
                </div>
            </div>
        </div>
    </div>
</div>
```

## 🧠 6. BEHAVIORAL LOGIC (Crucial for Dioxus Translation)

1. **State Reactivity**: In Rust/Dioxus, whenever you modify `state.parts` (e.g., changing a dimension), the UI must instantly update the input fields. However, the *Right Panel (Visualizer)* ONLY updates when the user explicitly clicks the "Optimize Layout" button.
2. **Hover Tooltip on SVG**: When `onmouseenter` triggers on a part `<g>` tag in the SVG, set a state variable `hovered_part` with the mouse coordinates (`e.client_x`, `e.client_y`) and part details. Render an absolutely positioned `<div>` at those coordinates displaying the dimensions. Clear `hovered_part` on `onmouseleave`.
3. **Print Mode**: When the user clicks Export -> Print, apply a CSS class to hide the Left Panel and Header, and force the Right Panel (SVGs and Tables) to expand to 100% width for standard browser printing.

---
**END OF BLUEPRINT**  
