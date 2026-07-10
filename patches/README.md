# Patches and Configuration Files

This directory contains patch files and configuration reference data for the project.

## Files

- `patch.txt` - Main patch file for React component modifications
  - Contains undo/redo functionality implementation
  - Keyboard shortcut support (Ctrl+Z, Ctrl+Y)
  - Auto-save feedback mechanism

- `button_patch.txt` - Patch file for button component updates
  - Button styling improvements
  - Functionality enhancements

- `lines.txt` - Reference configuration data
  - Line-by-line configuration reference
  - Update operation guides

## Usage

Patch files can be applied to source code using:
```bash
patch < patches/patch.txt
```

## Important Notes

⚠️ **Before Applying Patches:**
- Always backup your files
- Review patch contents before applying
- Test thoroughly after patch application
- Ensure compatible software versions

## Patch Management

To create a new patch:
```bash
diff -u original_file modified_file > patches/new_patch.txt
```

To check if a patch can be applied:
```bash
patch --dry-run < patches/patch.txt
```
