import re

with open('packing_engine/src/lib.rs', 'r') as f:
    content = f.read()

# The current algorithm is inside run_optimizer
# It starts at `let mut remaining_parts = Vec::new();`
# We'll replace the loop.

new_code = """
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
            let orientations = vec![(rect_w, rect_h, false), (rect_h, rect_w, true)];

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
"""

start_str = "    // Sort parts by area descending"
end_str = "        sheet_index += 1;\n    }"
start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_code.strip() + content[end_idx:]
    with open('packing_engine/src/lib.rs', 'w') as f:
        f.write(new_content)
    print("Replaced algorithm successfully.")
else:
    print("Could not find block.")
