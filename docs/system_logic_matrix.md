# System Logic Matrix

## 1. Inter-Language Mapping
- **React (UI/Frontend):**
  - Handles all user inputs, settings toggles (e.g., Edge Banding `enableEdgeBanding`, unit conversions).
  - Uses `src/components/layout-visualizer/` for rendering complex 2D SVGs and HTML data grids.
  - State management uses React hooks (`useCarpentryEngine.ts`) wrapping local storage and triggering re-renders.

- **Rust (Packing Engine):**
  - (If integrated) Receives flattened array of parts and sheet configurations.
  - Solves the 2D bin packing problem (e.g., Guillotine or MaxRects algorithm).
  - Returns coordinates (`x`, `y`, `w`, `h`) back to React via WebAssembly (Wasm) for ultra-fast rendering.

- **Python (Automation/AI Scripts):**
  - Used strictly for offline tooling (e.g., patching UI features, fixing scripts, data conversion).
  - Runs outside of the core React runtime to perform codebase-level migrations (e.g., `patch_layout.py`).

- **Java (Backend/Mobile Android):**
  - Capacitor wrapper (`android/app/src/main/java/`) allowing the web app to run natively on Android.
  - Native filesystem access or mobile hardware APIs.

## 2. Synchronization Rule
**CRITICAL:** Any future changes in the codebase must strictly align with this logic matrix first. Before implementing a new feature in React, ensure the Rust engine supports the coordinates, and Java/Capacitor supports the environment.

## 3. Feature Log

### Dynamic Contrast
- **Implementation:** Integrated a YIQ-based brightness formula in `utils/colors.ts`.
- **Logic:** `YIQ = (R*0.299 + G*0.587 + B*0.114)`. If `YIQ >= 128` output Black, else White.
- **Status:** Fully functional in `LayoutVisualizerPanel.tsx` avoiding text unreadability.

### Box Sizing Constraints
- **Implementation:** Removed fixed width constraints and manual text length multipliers. Modern CSS (`width: 'fit-content'`, `minWidth: '50px'`, `padding: '4px 12px'`) ensure content scales effortlessly.

### Edge Banding Constraints
- **Implementation:** Fixed the bug where red-dashed edge banding lines were shown on internal grid edges during batch packing.
- **Logic:** Only renders the red dashed line (`strokeDasharray="3,2"`) around the OUTER boundaries (`isOuterTop`, `isOuterBottom`, etc.) of a grouped batch when `settings.edgeTh > 0` AND the specific edge flag is `true`. Properly maps rotated edges to visual coordinates.
- **Status:** Integrated across SVG paths in `LayoutVisualizerPanel.tsx`.

### Code Modularization
- **Implementation:** The `LayoutVisualizerPanel` and `AppWorkspace` are broken down into single-responsibility sub-components.
- **Sub-components:** 
  - `CuttingListPanel` (Handles panel size inputs and tabular data)
  - `LayoutVisualizerPanel` (Handles the 2D layout SVG grid and cutting marks)
  - `KpiStatsGrid`, `UnplacedWarning`, `GrandTotalSummary`, `OffcutsTable` (Handle total sheet and wastage calculations)
- **Status:** All cross-component imports and props are perfectly wired.
