use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct Stock {
    pub length: f64,
    pub width: f64,
}

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
pub enum Grain {
    #[serde(rename = "L")]
    Vertical,   // लंबाई (Length) के साथ
    #[serde(rename = "W")]
    Horizontal, // चौड़ाई (Width) के साथ
    #[serde(rename = "N")]
    Any,        // कोई पाबंदी नहीं (Rotation allowed)
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Part {
    pub id: String,
    pub name: String,
    pub length: f64,
    pub width: f64,
    pub quantity: u32,
    #[serde(default)]
    pub grain: Option<Grain>,
    #[serde(rename = "allowRot", default)]
    pub allow_rot: Option<bool>,
}

#[derive(Serialize, Deserialize)]
pub struct Settings {
    pub kerf: f64,
    pub algo: String,
    #[serde(rename = "respectGrain", default)]
    pub respect_grain: Option<bool>,
}

#[derive(Serialize, Deserialize)]
pub struct InputData {
    pub stock: Stock,
    pub parts: Vec<Part>,
    pub settings: Settings,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct PackedPart {
    pub id: String,
    pub name: String,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub is_rotated: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Layout {
    pub sheet_index: u32,
    pub width: f64,
    pub height: f64,
    pub parts: Vec<PackedPart>,
    pub waste_rects: Vec<WasteRect>,
    pub used_area: f64,
    pub total_area: f64,
    pub waste_percent: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct WasteRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

#[derive(Serialize, Deserialize)]
pub struct OutputData {
    pub status: String,
    pub layouts: Vec<Layout>,
    pub unplaced_parts: Vec<Part>,
    pub waste_percentage: f64,
    pub error: Option<String>,
}

pub struct InternalFreeRect {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

#[wasm_bindgen]
pub fn run_optimizer(val: JsValue) -> JsValue {
    let input: InputData = match serde_wasm_bindgen::from_value(val) {
        Ok(data) => data,
        Err(e) => {
            let res = OutputData {
                status: "error".to_string(),
                layouts: vec![],
                unplaced_parts: vec![],
                waste_percentage: 0.0,
                error: Some(format!("Invalid input: {}", e)),
            };
            return serde_wasm_bindgen::to_value(&res).unwrap();
        }
    };

    let mut layouts = Vec::new();
    let mut sheet_index = 1;
    let mut remaining_parts = Vec::new();
    
    for p in &input.parts {
        for i in 0..p.quantity {
            remaining_parts.push(Part {
                id: format!("{}_{}", p.id, i),
                name: p.name.clone(),
                length: p.length,
                width: p.width,
                quantity: 1,
                grain: p.grain.clone(),
                allow_rot: p.allow_rot,
            });
        }
    }

// Sort parts by area descending
    remaining_parts.sort_by(|a, b| (b.length * b.width).partial_cmp(&(a.length * a.width)).unwrap());

    while !remaining_parts.is_empty() && sheet_index <= 100 {
        let mut packed_on_this_sheet = Vec::new();
        let mut free_rects = vec![InternalFreeRect { x: 0.0, y: 0.0, w: input.stock.length, h: input.stock.width }];
        let mut still_to_pack = Vec::new();

        let current_parts = std::mem::take(&mut remaining_parts);

        for part in current_parts {
            let mut best_rect_index: i32 = -1;
            let mut best_score1 = f64::INFINITY;
            let mut best_score2 = f64::INFINITY;
            let mut best_is_rotated = false;
            let mut final_w = 0.0;
            let mut final_h = 0.0;
            let mut final_x = 0.0;
            let mut final_y = 0.0;

            let rect_w = part.length + input.settings.kerf;
            let rect_h = part.width + input.settings.kerf;
            let mut orientations = Vec::new();
            
            let strictly_respect = input.settings.respect_grain.unwrap_or(true);
            let grain = part.grain.clone().unwrap_or(Grain::Any);
            let allow_rot = part.allow_rot.unwrap_or(true);

            if strictly_respect {
                match grain {
                    Grain::Vertical => {
                        orientations.push((rect_w, rect_h, false));
                    }
                    Grain::Horizontal => {
                        orientations.push((rect_h, rect_w, true));
                    }
                    Grain::Any => {
                        orientations.push((rect_w, rect_h, false));
                        if allow_rot {
                            orientations.push((rect_h, rect_w, true));
                        }
                    }
                }
            } else {
                orientations.push((rect_w, rect_h, false));
                if allow_rot {
                    orientations.push((rect_h, rect_w, true));
                }
            }

            for (r_idx, f) in free_rects.iter().enumerate() {
                for (pw, ph, rot) in &orientations {
                    if *pw <= f.w + 1e-5 && *ph <= f.h + 1e-5 {
                        let leftover_w = f.w - pw;
                        let leftover_h = f.h - ph;
                        let score1 = leftover_w.min(leftover_h); // BSSF
                        let score2 = leftover_w.max(leftover_h);
                        
                        if score1 < best_score1 || (score1 == best_score1 && score2 < best_score2) {
                            best_score1 = score1;
                            best_score2 = score2;
                            best_rect_index = r_idx as i32;
                            best_is_rotated = *rot;
                            final_w = *pw;
                            final_h = *ph;
                            final_x = f.x;
                            final_y = f.y;
                        }
                    }
                }
            }

            if best_rect_index != -1 {
                packed_on_this_sheet.push(PackedPart {
                    id: part.id.clone(),
                    name: part.name.clone(),
                    x: final_x,
                    y: final_y,
                    w: final_w,
                    h: final_h,
                    is_rotated: best_is_rotated,
                });

                // MaxRects update: split all free rects that intersect the new part
                let mut new_free_rects = Vec::new();
                for f in &free_rects {
                    if final_x < f.x + f.w - 1e-5 && final_x + final_w > f.x + 1e-5 &&
                       final_y < f.y + f.h - 1e-5 && final_y + final_h > f.y + 1e-5 {
                        // Top
                        if final_y > f.y {
                            new_free_rects.push(InternalFreeRect { x: f.x, y: f.y, w: f.w, h: final_y - f.y });
                        }
                        // Bottom
                        if final_y + final_h < f.y + f.h {
                            new_free_rects.push(InternalFreeRect { x: f.x, y: final_y + final_h, w: f.w, h: (f.y + f.h) - (final_y + final_h) });
                        }
                        // Left
                        if final_x > f.x {
                            new_free_rects.push(InternalFreeRect { x: f.x, y: f.y, w: final_x - f.x, h: f.h });
                        }
                        // Right
                        if final_x + final_w < f.x + f.w {
                            new_free_rects.push(InternalFreeRect { x: final_x + final_w, y: f.y, w: (f.x + f.w) - (final_x + final_w), h: f.h });
                        }
                    } else {
                        new_free_rects.push(InternalFreeRect { x: f.x, y: f.y, w: f.w, h: f.h });
                    }
                }

                // Filter out fully contained free rects
                let mut filtered_rects = Vec::new();
                for (i, r1) in new_free_rects.iter().enumerate() {
                    let mut is_contained = false;
                    for (j, r2) in new_free_rects.iter().enumerate() {
                        if i != j {
                            if r1.x >= r2.x - 1e-5 && r1.y >= r2.y - 1e-5 &&
                               r1.x + r1.w <= r2.x + r2.w + 1e-5 &&
                               r1.y + r1.h <= r2.y + r2.h + 1e-5 {
                                is_contained = true;
                                break;
                            }
                        }
                    }
                    if !is_contained {
                        filtered_rects.push(InternalFreeRect { x: r1.x, y: r1.y, w: r1.w, h: r1.h });
                    }
                }
                free_rects = filtered_rects;
            } else {
                still_to_pack.push(part);
            }
        }

        if packed_on_this_sheet.is_empty() {
            break;
        }

        let mut used_area = 0.0;
        for p in &packed_on_this_sheet {
            used_area += p.w * p.h;
        }

        let total_area = input.stock.length * input.stock.width;
        layouts.push(Layout {
            sheet_index,
            width: input.stock.length,
            height: input.stock.width,
            parts: packed_on_this_sheet.clone(),
            waste_rects: compute_waste_rects(input.stock.length, input.stock.width, &packed_on_this_sheet),
            used_area,
            total_area,
            waste_percent: (total_area - used_area) / total_area * 100.0,
        });

        remaining_parts = still_to_pack;
        sheet_index += 1;
    }

    let mut total_used_area = 0.0;
    let mut total_raw_area = 0.0;
    for l in &layouts {
        total_used_area += l.used_area;
        total_raw_area += l.total_area;
    }

    let res = OutputData {
        status: "success".to_string(),
        layouts,
        unplaced_parts: remaining_parts,
        waste_percentage: if total_raw_area > 0.0 { (total_raw_area - total_used_area) / total_raw_area * 100.0 } else { 0.0 },
        error: None,
    };

    serde_wasm_bindgen::to_value(&res).unwrap()
}

fn compute_waste_rects(bin_w: f64, bin_h: f64, parts: &[PackedPart]) -> Vec<WasteRect> {
    let tolerance = 0.1;
    let mut unique_x = vec![0.0, bin_w];
    for p in parts {
        unique_x.push(p.x);
        unique_x.push(p.x + p.w);
    }
    unique_x.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let mut xs = Vec::new();
    for x in unique_x {
        if xs.is_empty() || x - xs.last().unwrap() > tolerance {
            xs.push(x);
        }
    }

    let mut unique_y = vec![0.0, bin_h];
    for p in parts {
        unique_y.push(p.y);
        unique_y.push(p.y + p.h);
    }
    unique_y.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let mut ys = Vec::new();
    for y in unique_y {
        if ys.is_empty() || y - ys.last().unwrap() > tolerance {
            ys.push(y);
        }
    }

    let num_x = xs.len() - 1;
    let num_y = ys.len() - 1;
    if num_x == 0 || num_y == 0 { return vec![]; }

    let mut covered = vec![vec![false; num_y]; num_x];
    for i in 0..num_x {
        for j in 0..num_y {
            let center_x = (xs[i] + xs[i+1]) / 2.0;
            let center_y = (ys[j] + ys[j+1]) / 2.0;
            for p in parts {
                if center_x >= p.x - tolerance && center_x <= p.x + p.w + tolerance &&
                   center_y >= p.y - tolerance && center_y <= p.y + p.h + tolerance {
                    covered[i][j] = true;
                    break;
                }
            }
        }
    }

    let mut waste = Vec::new();
    for i in 0..num_x {
        for j in 0..num_y {
            if covered[i][j] { continue; }
            let mut best_area = 0.0;
            let mut best_di = 1;
            let mut best_dj = 1;

            for di in 1..=(num_x - i) {
                for dj in 1..=(num_y - j) {
                    let mut all_empty = true;
                    for c in i..(i+di) {
                        for r in j..(j+dj) {
                            if covered[c][r] { all_empty = false; break; }
                        }
                        if !all_empty { break; }
                    }
                    if all_empty {
                        let w = xs[i+di] - xs[i];
                        let h = ys[j+dj] - ys[j];
                        let area = w * h;
                        if area > best_area {
                            best_area = area;
                            best_di = di;
                            best_dj = dj;
                        }
                    } else {
                        break;
                    }
                }
            }

            for c in i..(i+best_di) {
                for r in j..(j+best_dj) {
                    covered[c][r] = true;
                }
            }

            waste.push(WasteRect {
                x: xs[i],
                y: ys[j],
                w: xs[i+best_di] - xs[i],
                h: ys[j+best_dj] - ys[j],
            });
        }
    }
    waste
}
