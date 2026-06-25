# 📋 Architecture & Algorithm Documentation

## Overview

Carpenter Optimizer एक **2D Wood Sheet Nesting Engine** है जो लकड़ी की शीटों से **minimum waste** के साथ parts कट करने के लिए optimal layouts calculate करता है।

---

## 🔧 Core Features

### 1. **Sheet Optimization**
- Multiple sheet sizes support करता है
- Customizable kerf (blade thickness)
- Edge banding calculation
- Trim margin management

### 2. **Part Management**
- Named parts with custom dimensions
- Grain orientation support (Lengthwise, Widthwise, Free)
- Rotation allowance (parts को rotate कर सकते हैं)
- Edge banding selection (Top, Bottom, Left, Right)

### 3. **Advanced Calculations**
- Material utilization percentage
- Waste percentage calculation
- Total edge banding length
- Cost per sheet tracking
- Unplaced parts detection

---

## 📊 Packing Algorithms

यह app **4 different algorithms** support करता है:

### Algorithm 1: **StripCutRowFirst**
```
कैसे काम करता है:
├─ Sheet को horizontal strips में divide करता है
├─ हर strip को vertically fill करता है
├─ Left-to-right, Top-to-bottom approach
└─ Best for: Regular sized parts

Efficiency: 60-75%
Use Case: Uniform parts
```

### Algorithm 2: **MaxRectsBssf** (Best Short Side Fit)
```
कैसे काम करता है:
├─ Available rectangles track करता है
├─ Shortest side को priority देता है
├─ Dynamic packing
└─ Gaps को minimize करता है

Efficiency: 70-85%
Use Case: Mixed sizes, better waste reduction
```

### Algorithm 3: **MaxRectsBlsf** (Best Long Side Fit)
```
कैसे काम करता है:
├─ Available rectangles track करता है
├─ Longest side को priority देता है
├─ Better for large parts
└─ Good balance

Efficiency: 65-80%
Use Case: Large parts mixed with small
```

### Algorithm 4: **Guillotine** (Advanced)
```
कैसे काम करता है:
├─ Sheet को sequential cuts से divide करता है (saw cuts जैसे)
├─ Practical for real woodworking
├─ Minimizes setup time
└─ Most realistic approach

Efficiency: 75-90%
Use Case: Professional carpentry
```

---

## 📐 Mathematical Calculations

### 1. **Utilization Score**
```
Formula:
Utilization % = (Total Parts Area / Total Available Area) × 100

Example:
Parts Area = 1200 sq inches
Sheet Area = 1500 sq inches
Utilization = (1200/1500) × 100 = 80%
```

### 2. **Waste Calculation**
```
Formula:
Waste % = 100 - Utilization %

OR more detailed:
Total Waste = (Sheet Area × Count) - (Parts Area + Kerf + Trim)

Components:
├─ Kerf Loss: blade thickness × cut lines
├─ Trim Loss: border margins
└─ Scrap: leftover pieces
```

### 3. **Edge Banding Length**
```
Formula:
Banding Length = Σ(Selected Edges × Part Perimeter)

Example:
Part: 24" × 12"
Selected Edges: Top + Bottom = 2 edges
Banding = (24 × 2) + (12 × 0) = 48 inches

Thickness Impact:
Actual Cut Size = Original Size - (2 × Banding Thickness)
Example: 24" part with 2mm banding = 23.84" (approx)
```

### 4. **Material Cost**
```
Formula:
Total Cost = Sheet Count × Cost per Sheet + (Banding Length × Cost per inch)

Break-even Analysis:
Cost Efficiency = Total Cost / Total Parts Area
```

---

## 🎯 Cutting List Generation

### Input Example:
```json
{
  "id": "1",
  "name": "Wardrobe Side Panel",
  "length": 84.0,
  "width": 22.0,
  "grain": "L",
  "allowRot": false,
  "quantity": 2,
  "edges": {
    "T": true,
    "B": true,
    "L": true,
    "R": false
  }
}
```

### Output (PDF/Report):
```
┌─────────────────────────────────────────────────────┐
│ CUTTING LIST - Sheet 1 of 3                         │
├─────────────────────────────────────────────────────┤
│ Part Name          │ Qty │ L×W    │ Grain │ Edges  │
├──────────────────────────────────────────────────────┤
│ Side Panel         │ 2   │ 84×22  │ ↕     │ T,B,L  │
│ Shelf              │ 4   │ 34.5×21│ ↕     │ T      │
│ Drawer Front       │ 3   │ 11.5×33│ ↔     │ All    │
├──────────────────────────────────────────────────────┤
│ Total Area: 1,245 sq in │ Utilization: 82.3%      │
│ Waste: 265 sq in (17.7%) │ Banding: 287 inches     │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Output Types

### 1. **Visual Layout Map**
```
Sheet Visualization:
┌────────────────────────────────────┐
│  Side Panel (84×22)                │
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  └──────────────────────────────┘  │
│  ┌─────────────┐ ┌──────────────┐  │
│  │ Shelf (34.5)│ │ Shelf (34.5) │  │
│  │ x 21        │ │ x 21         │  │
│  └─────────────┘ └──────────────┘  │
│  ┌─────────────────────────────┐   │
│  │ Waste Area (17.7%)          │   │
│  └─────────────────────────────┘   │
└────────────────────────────────────┘
```

### 2. **CSV Export Format**
```csv
Part Name,Length,Width,Grain,Rotation,Quantity,Edges(TBLR)
Wardrobe Side Panel (बायाँ),84.0,22.0,L,N,2,TBL
Wardrobe Shelves (रैक),34.5,21.5,L,Y,4,T
Drawer Fronts (दराज),11.5,33.0,W,N,3,TBLR
```

### 3. **JSON Export** (Complete Project Save)
```json
{
  "settings": {
    "unit": "Inch",
    "sheetL": 96,
    "sheetW": 48,
    "bladeTh": 3,
    "trimMargin": 10,
    "edgeTh": 2,
    "stock": 5,
    "algorithm": "Guillotine",
    "sheetCost": 45.0
  },
  "parts": [
    {
      "id": "1",
      "name": "Side Panel",
      "length": 84,
      "width": 22,
      "grain": "L",
      "allowRot": false,
      "quantity": 2,
      "edges": {"T": true, "B": true, "L": true, "R": false}
    }
  ]
}
```

### 4. **PDF Report** (Print-ready)
```
✓ Header with project info
✓ Settings snapshot
✓ Layout visualization
✓ Detailed cutting list
✓ Waste analysis
✓ Cost breakdown
✓ Banding requirements
✓ Page layout for printing
```

---

## 🧮 Data Structure

```typescript
// Sheet Configuration
interface SheetSettings {
  unit: 'Inch' | 'CM' | 'MM';
  sheetL: number;          // Length in units
  sheetW: number;          // Width in units
  bladeTh: number;         // Kerf in mm
  trimMargin: number;      // Trim in mm
  edgeTh: number;          // Edge banding thickness in mm
  stock: number;           // How many sheets available
  algorithm: string;       // Which packing algorithm
  sheetCost: number;       // Cost per sheet
}

// Individual Part
interface PartInput {
  id: string;
  name: string;
  length: number;
  width: number;
  grain: 'L' | 'W' | 'N';  // Lengthwise, Widthwise, None
  allowRot: boolean;       // Can rotate 90°?
  quantity: number;
  edges: Edges;            // Which edges get banding
}

// Packed Part Result
interface PackedPart {
  id: string;
  name: string;
  x: number;               // Position on sheet
  y: number;
  w: number;               // Width after packing
  h: number;               // Height after packing
  origL: number;           // Original dimensions
  origW: number;
  cutL: number;            // Cut size (after banding subtraction)
  cutW: number;
  isRotated: boolean;
  edges: Edges;
  grain: Grain;
}

// Complete Layout
interface SheetLayout {
  sheetIndex: number;
  width: number;           // Available width after trim
  height: number;
  parts: PackedPart[];
  usedArea: number;
  totalArea: number;
  wastePercent: number;
  wasteRects?: Array;      // Unused rectangles for visualization
}

// Final Result
interface PackingResult {
  layouts: SheetLayout[];
  totalSheetsUsed: number;
  totalUtilization: number;
  overallWastePercent: number;
  totalPartsArea: number;
  totalBandingLength: number;
  unplacedParts: Array;
}
```

---

## 🔄 Workflow (Step-by-step)

```
1. USER INPUT
   ├─ Sheet dimensions
   ├─ Kerf, Trim, Banding thickness
   ├─ Part list with quantities
   └─ Algorithm selection

2. VALIDATION
   ├─ Check part dimensions vs sheet
   ├─ Validate quantities
   └─ Check for conflicts

3. CALCULATION
   ├─ Run packing algorithm
   ├─ Position each part
   ├─ Calculate waste
   └─ Calculate banding

4. COMPARISON
   ├─ Run all algorithms
   ├─ Compare results
   └─ Highlight best option

5. OUTPUT GENERATION
   ├─ Visual layout
   ├─ Cutting list (CSV)
   ├─ Complete config (JSON)
   ├─ Printable report (PDF)
   └─ Statistics dashboard

6. EXPORT/SAVE
   ├─ Save to local storage
   ├─ Export to files
   └─ Share project
```

---

## 🎨 Language Support

यह app **Hindi + English** दोनों में available है:

```
├─ English
│  ├─ "Smart Carpentry Optimizer"
│  ├─ "Cutting List"
│  ├─ "Sheets Used"
│  └─ "Material Efficiency"
│
└─ Hindi
   ├─ "स्मार्ट बढ़ईगिरी ऑप्टिमाइज़र"
   ├─ "कटिंग सूची"
   ├─ "कुल लगी शीटें"
   └─ "मटीरियल उपयोग दक्षता"
```

---

## ⚙️ Configuration Files

### Environment Variables (`.env.local`)
```env
VITE_GEMINI_API_KEY=your_api_key_here
APP_URL=http://localhost:3000
```

### Build Configuration (`vite.config.ts`)
```typescript
- React 19 plugin
- Tailwind CSS integration
- Path aliasing (@/)
- HMR configuration
```

### TypeScript Config (`tsconfig.json`)
```json
- ES2022 target
- Strict mode enabled
- JSX react-jsx
- Path mappings
```

---

## 🐛 Known Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Parts not packing | Sheet too small | Increase stock sheets |
| High waste % | Poor algorithm choice | Try "Guillotine" algorithm |
| Wrong banding | Edges misconfigured | Check edge selection |
| Slow calculation | Too many parts | Use algorithm comparison |

---

## 🚀 Future Enhancements

- [ ] 3D visualization
- [ ] AI-powered optimization via Gemini
- [ ] Multi-sheet project management
- [ ] Material library with real prices
- [ ] Import from CAD files
- [ ] Team collaboration features
- [ ] Historical project tracking

---

## 📞 Community Contribution

### Report Issues:
- GitHub Issues: [Report Bug](https://github.com/yaseenm237/Yaseenm237-app/issues)
- Include: Algorithm type, part dimensions, expected vs actual result

### Suggest Features:
- Create Discussion: [Feature Request](https://github.com/yaseenm237/Yaseenm237-app/discussions)
- Describe use case and benefits

### Code Improvements:
- Submit PR with:
  - Algorithm optimization
  - Performance improvements
  - Bug fixes
  - New language support
  - Feature additions

---

**Document Last Updated:** 2026-06-25

