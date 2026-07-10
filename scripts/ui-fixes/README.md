# UI Fix Scripts

This directory contains Python scripts for fixing UI-related issues in the CabinetDesignerModal and other components.

## Scripts

- `add_drawer_offset_ui.py` - Searches for drawer fascia height UI element
- `add_drawer_offset_ui2.py` - Adds drawer offset Y position UI control
- `fix_drawer_y.py` - Fixes drawer Y coordinate calculation and positioning
- `fix_drawer_y2.py` - Alternative drawer Y position fix
- `fix_svg.py` - Fixes SVG-related formatting and rendering issues
- `fix_useCarpentryEngine.py` - Fixes Carpentry Engine hook usage

## Usage

Run these scripts from the project root directory:

```bash
python scripts/ui-fixes/add_drawer_offset_ui2.py
python scripts/ui-fixes/fix_drawer_y.py
```

## Purpose

These scripts automate the modification of React component files to add UI features and fix layout issues related to drawer components in the cabinet designer.
