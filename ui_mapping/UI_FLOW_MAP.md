# UI Mapping & Working Logic (React to Rust/Dioxus Translation Guide)

This document provides a complete blueprint of the UI structure, state management, and component logic for the Shahirah Interior Carpentry Optimizer application. It is designed to help you recreate the exact user experience in a pure Rust/Dioxus desktop environment.

## 1. Core Architecture & State Management

In the React app, global state is managed via **Context API** (`src/context/CarpentryContext.tsx`). In Dioxus, you can achieve this using `use_context_provider` and `use_shared_state` or `Signal`.

### Global State Variables
- `parts`: List of all panels/parts the user wants to cut (ID, width, height, quantity, rotation flag, edge banding config, material type).
- `settings`: Global configuration (Sheet size, blade kerf, trim margins, unit of measurement (mm/cm/inch), default edge banding thickness).
- `result`: The output of the Packing Engine (the 2D layout). Contains `sheets` (each with `placed_parts`) and `unplaced` parts.
- `language`: Current UI language (English/Hindi).
- `theme`: Dark/Light mode toggle.

## 2. Main Layout (AppWorkspace.tsx)

The application follows a standard **Two-Pane Desktop Layout** wrapped in a main container.

*   **Header Bar**: Contains the App Title, Smart Badge (Quick stats), and the Main Menu.
*   **Left Pane (`CuttingListPanel`)**: The input area for users to add, edit, and configure the parts to be cut.
*   **Right Pane (`LayoutVisualizerPanel`)**: The graphical output area displaying the SVG rendering of the optimized sheets.

### Header Menu (`HeaderMenu.tsx`)
Located at the top right, triggered by a 'Three Dots' (MoreVertical) icon.
*   **Open / Saved Files (Folder Icon)**: Opens the `SavedFilesModal` to load/save JSON data.
*   **Estimate Calculator (Calculator Icon)**: Opens `EstimateCalculatorModal` to calculate plywood and edge banding costs.
*   **PDF Report / Export (Download Icon)**: Opens `ExportCenterModal` to generate PDF cutting lists or CNC formats.
*   **Hajiri Portal / Attendance (Users Icon)**: Opens `AttendanceModal` for worker management and salary tracking.
*   **User Sessions (Lock Icon)**: Opens `UserSessionsModal` for access control.
*   **App Flow Map (Layout Icon)**: Opens the Logic Map.
*   **Undo/Redo**: Reverts or reapplies changes to the `parts` list.
*   **Language Toggle**: Switches between Hindi and English.
*   **Theme Toggle**: Switches between Dark/Light mode.

## 3. Left Pane: Input & Settings (`CuttingListPanel.tsx`)

This is where the user enters the cutting requirements.

*   **Global Settings Header**: Inputs for standard sheet size (e.g., 2440 x 1220 mm) and kerf (blade thickness).
*   **Add Part Button**: Appends a new empty row to the `parts` array.
*   **Part Row (For each part)**:
    *   **Name/Label**: Text input for the part name (e.g., "Wardrobe Door").
    *   **Length & Width**: Numeric inputs.
    *   **Quantity (Qty)**: Numeric input.
    *   **Rotation Toggle (Icon)**: Toggles whether the algorithm is allowed to rotate this part 90 degrees to save space. (Crucial for wood grain direction).
    *   **Edge Banding Selectors (Top, Bottom, Left, Right)**: Checkboxes or colored buttons to indicate which edges need PVC edge banding.
*   **Optimize Button (Primary Action)**: Calls the `pack_parts` algorithm (your Rust Packing Engine) with the current `parts` and `settings`, and stores the output in `result`.

## 4. Right Pane: Visualizer (`LayoutVisualizerPanel.tsx`)

This panel renders the output of the packing algorithm.

*   **KPI / Stats Bar**: Shows "Total Sheets Used", "Total Parts Placed", "Yield Percentage", and "Unplaced Parts".
*   **Sheet Rendering (SVG Canvas)**:
    *   For each sheet in `result.sheets`, an SVG is rendered.
    *   **Base `<rect>`**: Represents the full plywood sheet (e.g., 8x4 ft).
    *   **Placed Parts `<g>`**: For each part in `sheet.placed_parts`, a `<rect>` is drawn at the coordinates `(x, y)` provided by the packing engine.
    *   **Edge Banding Lines `<line>`**: If a part has edge banding on a specific side, a colored dashed line is drawn on that border of the part's rectangle.
    *   **Labels `<text>`**: The part's name and dimensions are printed in the center of its rectangle.
*   **Interactivity**:
    *   **Hover Tooltip**: When hovering over an SVG part, a floating `div` shows the exact dimensions and coordinates.
    *   **Drag & Drop (Puzzle Mode)**: Clicking a 'Lock/Unlock' button allows the user to manually click and drag SVG parts to adjust the layout slightly.
*   **Offcut Table**: A small data table below the SVG showing the dimensions of the largest reusable leftover pieces (offcuts) from that specific sheet.

## 5. Modal Windows (Popups)

*   **Attendance / Hajiri Portal (`AttendanceModal.tsx`)**:
    *   Tab 1: **Daily Attendance**: Mark Present/Absent/Half-day for staff.
    *   Tab 2: **Advance & Salary**: Add monetary advances, calculate remaining monthly salary.
    *   Logic: Reads/Writes to a local database (or JSON file) to persist records across days.
*   **Estimate Calculator (`EstimateCalculatorModal.tsx`)**:
    *   Takes the `result.sheets.length` (Total Boards) * Cost per Board.
    *   Takes the total perimeter of edges marked for banding * Cost per running meter.
    *   Outputs a total quotation/estimate.
*   **Export Center (`ExportCenterModal.tsx`)**:
    *   Generates a PDF layout map (using `jspdf` and `html2canvas` in JS). In Rust, you can use `print` to PDF via the webview, or generate raw PDF bytes using a crate like `printpdf`.

## 6. Translation Strategy to Dioxus (Rust)

1.  **State**: Move `CarpentryContext` to a `use_shared_state::<AppState>(cx)` in your Dioxus main component.
2.  **Layout**: Map the `flex` and `grid` Tailwind classes exactly as they are. Dioxus supports Tailwind out of the box.
3.  **Engine**: Connect the "Optimize" button `onclick` handler directly to your pure Rust `logic::pack_parts` function, avoiding any FFI or JS interop overhead.
4.  **Graphics**: Map the React `<svg>` tags directly to Dioxus `rsx! { svg { ... } }`. Dioxus handles SVG and pointer events natively in the webview.
