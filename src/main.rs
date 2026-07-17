#![allow(non_snake_case)]
mod chat_system;
mod logic;

use dioxus::prelude::*;
use crate::chat_system::ChatComponent;
use crate::logic::{pack_parts, Part};

fn main() {
    // Initialize the logger for debugging
    tracing_subscriber::fmt::init();

    // Start the Dioxus Desktop Application
    dioxus::launch(App);
}

fn App(cx: Scope) -> Element {
    let mut parts_to_pack = use_state(cx, || vec![
        Part { id: "P1".to_string(), width: 400.0, height: 600.0, can_rotate: true },
        Part { id: "P2".to_string(), width: 300.0, height: 500.0, can_rotate: true },
        Part { id: "P3".to_string(), width: 800.0, height: 200.0, can_rotate: true },
    ]);
    
    let packing_result = pack_parts(
        &parts_to_pack.get(),
        2440.0, // Standard 8x4 Sheet width (mm)
        1220.0, // Standard 8x4 Sheet height (mm)
        3.2,    // Blade Kerf
        10.0,   // Trim Margin
    );

    cx.render(rsx! {
        div {
            class: "min-h-screen bg-slate-50 font-sans p-8 flex flex-col lg:flex-row gap-8",
            
            // Left Panel: Carpentry Logic
            div {
                class: "flex-1 flex flex-col gap-4",
                h1 { class: "text-3xl font-bold text-slate-800", "Shahirah Interior" }
                h2 { class: "text-xl text-slate-600", "Pure Rust Carpentry Optimizer" }

                div {
                    class: "bg-white p-6 rounded-xl shadow border border-slate-200",
                    h3 { class: "text-lg font-bold mb-4", "Optimization Results" }
                    
                    div {
                        class: "grid grid-cols-2 gap-4",
                        div {
                            class: "p-4 bg-indigo-50 text-indigo-900 rounded-lg",
                            "Sheets Required: {packing_result.sheets.len()}"
                        }
                        div {
                            class: "p-4 bg-red-50 text-red-900 rounded-lg",
                            "Unplaced Parts: {packing_result.unplaced.len()}"
                        }
                    }

                    // Render Sheets
                    div {
                        class: "mt-6",
                        for (i, sheet) in packing_result.sheets.iter().enumerate() {
                            div {
                                class: "mb-4",
                                h4 { class: "font-semibold text-slate-700", "Sheet {i + 1} Layout" }
                                div {
                                    class: "relative bg-amber-100 border-2 border-amber-800 rounded mt-2",
                                    style: "width: 100%; aspect-ratio: 2440 / 1220; max-width: 600px;",
                                    // Map placed parts proportionally (simplified CSS rendering)
                                    for part in sheet.placed_parts.iter() {
                                        div {
                                            class: "absolute bg-amber-300 border border-amber-900 flex items-center justify-center text-xs font-bold shadow-sm",
                                            style: format!(
                                                "left: {}%; top: {}%; width: {}%; height: {}%;",
                                                (part.x / 2440.0) * 100.0,
                                                (part.y / 1220.0) * 100.0,
                                                (part.width / 2440.0) * 100.0,
                                                (part.height / 1220.0) * 100.0
                                            ),
                                            "{part.id}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Right Panel: Matrix Live Chat
            div {
                class: "w-full lg:w-96 flex flex-col gap-4",
                ChatComponent {}
            }
        }
    })
}
