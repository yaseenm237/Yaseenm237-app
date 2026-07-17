use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Part {
    pub id: String,
    pub width: f64,
    pub height: f64,
    pub can_rotate: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlacedPart {
    pub id: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub rotated: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sheet {
    pub width: f64,
    pub height: f64,
    pub placed_parts: Vec<PlacedPart>,
    pub kerf: f64,
    pub trim_margin: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackingResult {
    pub sheets: Vec<Sheet>,
    pub unplaced: Vec<Part>,
}

/// A clean, pure-Rust 2D bin packing algorithm (Shelf Packing approach)
/// Completely independent of any frontend framework, JS, or DOM APIs.
/// Can be compiled to WASM or Native Desktop seamlessly.
pub fn pack_parts(
    parts: &[Part], 
    sheet_width: f64, 
    sheet_height: f64, 
    kerf: f64, 
    trim_margin: f64
) -> PackingResult {
    let mut sheets = Vec::new();
    let mut unplaced = Vec::new();

    if parts.is_empty() {
        return PackingResult { sheets, unplaced };
    }

    let mut current_sheet = Sheet {
        width: sheet_width,
        height: sheet_height,
        placed_parts: Vec::new(),
        kerf,
        trim_margin,
    };

    let usable_width = sheet_width - (2.0 * trim_margin);
    let usable_height = sheet_height - (2.0 * trim_margin);

    let mut current_x = trim_margin;
    let mut current_y = trim_margin;
    let mut row_height = 0.0;

    for part in parts {
        let (p_w, p_h) = (part.width, part.height);

        // Check if it fits in the current row width-wise
        if current_x + p_w <= usable_width + trim_margin {
            // Fits in current row
            if current_y + p_h <= usable_height + trim_margin {
                current_sheet.placed_parts.push(PlacedPart {
                    id: part.id.clone(),
                    x: current_x,
                    y: current_y,
                    width: p_w,
                    height: p_h,
                    rotated: false,
                });
                current_x += p_w + kerf;
                if p_h > row_height {
                    row_height = p_h;
                }
            } else {
                // Part is too tall for this row and exceeds sheet height
                // Need a new sheet
                finalize_sheet_and_advance(
                    &mut current_sheet, &mut sheets, sheet_width, sheet_height, kerf, trim_margin,
                    &mut current_x, &mut current_y, &mut row_height, part, &mut unplaced, usable_width, usable_height
                );
            }
        } else {
            // Does not fit in current row width, advance to next row
            current_x = trim_margin;
            current_y += row_height + kerf;
            row_height = p_h;

            if current_y + p_h <= usable_height + trim_margin {
                // Fits in the new row
                if current_x + p_w <= usable_width + trim_margin {
                    current_sheet.placed_parts.push(PlacedPart {
                        id: part.id.clone(),
                        x: current_x,
                        y: current_y,
                        width: p_w,
                        height: p_h,
                        rotated: false,
                    });
                    current_x += p_w + kerf;
                } else {
                    unplaced.push(part.clone()); // Part is wider than the sheet
                }
            } else {
                // Doesn't fit in current sheet vertically, finalize sheet and create a new one
                finalize_sheet_and_advance(
                    &mut current_sheet, &mut sheets, sheet_width, sheet_height, kerf, trim_margin,
                    &mut current_x, &mut current_y, &mut row_height, part, &mut unplaced, usable_width, usable_height
                );
            }
        }
    }

    if !current_sheet.placed_parts.is_empty() {
        sheets.push(current_sheet);
    }

    PackingResult {
        sheets,
        unplaced,
    }
}

fn finalize_sheet_and_advance(
    current_sheet: &mut Sheet,
    sheets: &mut Vec<Sheet>,
    sheet_width: f64,
    sheet_height: f64,
    kerf: f64,
    trim_margin: f64,
    current_x: &mut f64,
    current_y: &mut f64,
    row_height: &mut f64,
    part: &Part,
    unplaced: &mut Vec<Part>,
    usable_width: f64,
    usable_height: f64,
) {
    sheets.push(current_sheet.clone());
    *current_sheet = Sheet {
        width: sheet_width,
        height: sheet_height,
        placed_parts: Vec::new(),
        kerf,
        trim_margin,
    };
    *current_x = trim_margin;
    *current_y = trim_margin;
    *row_height = part.height;

    if *current_x + part.width <= usable_width + trim_margin && *current_y + part.height <= usable_height + trim_margin {
        current_sheet.placed_parts.push(PlacedPart {
            id: part.id.clone(),
            x: *current_x,
            y: *current_y,
            width: part.width,
            height: part.height,
            rotated: false,
        });
        *current_x += part.width + kerf;
    } else {
        unplaced.push(part.clone());
    }
}
