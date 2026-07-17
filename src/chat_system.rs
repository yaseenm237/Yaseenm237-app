#![allow(non_snake_case)]
use dioxus::prelude::*;
use matrix_sdk::{Client, config::SyncSettings, ruma::events::room::message::RoomMessageEventContent};
use std::sync::Arc;
use tokio::sync::Mutex;

// Element X jaisa Matrix Client state
#[derive(Clone)]
struct ChatState {
    client: Option<Client>,
    messages: Vec<String>,
}

pub fn ChatComponent(cx: Scope) -> Element {
    let chat_state = use_ref(cx, || ChatState {
        client: None,
        messages: Vec::new(),
    });
    
    let username = use_state(cx, || String::new());
    let password = use_state(cx, || String::new());
    let input_msg = use_state(cx, || String::new());

    // Login Function (Element X Logic)
    let login_task = {
        let chat_state = chat_state.clone();
        let username = username.get().clone();
        let password = password.get().clone();
        
        move |_| {
            let chat_state = chat_state.clone();
            let u = username.clone();
            let p = password.clone();
            
            cx.spawn(async move {
                // Connect to a Matrix Home Server (e.g., matrix.org or your own server)
                if let Ok(client) = Client::builder().server_name("matrix.org").build().await {
                    if let Ok(_) = client.login_username(&u, &p).send().await {
                        // Login successful
                        chat_state.write().client = Some(client);
                    }
                }
            });
        }
    };

    // A/V Call Function placeholder
    let start_video_call = move |_| {
        // Element X uses WebRTC (LiveKit integration). 
        // In a pure Rust desktop app, you would initialize webrtc-rs here
        // and open a new Dioxus window for the video feed.
        println!("Starting Video Call using WebRTC-rs / LiveKit logic...");
    };

    cx.render(rsx! {
        div {
            class: "chat-container p-4 bg-slate-900 text-white rounded-lg",
            h2 { "Live Chat & Audio/Video (Element X Core)" }

            if chat_state.read().client.is_none() {
                // Login Form
                div {
                    class: "flex flex-col gap-2 mt-4 max-w-sm",
                    input {
                        placeholder: "Matrix Username",
                        class: "p-2 text-black rounded",
                        value: "{username}",
                        oninput: move |e| username.set(e.value.clone())
                    }
                    input {
                        type: "password",
                        placeholder: "Password",
                        class: "p-2 text-black rounded",
                        value: "{password}",
                        oninput: move |e| password.set(e.value.clone())
                    }
                    button {
                        class: "bg-indigo-600 p-2 rounded text-white font-bold",
                        onclick: login_task,
                        "Login to Matrix Server"
                    }
                }
            } else {
                // Chat Interface
                div {
                    class: "flex flex-col gap-2 mt-4",
                    div {
                        class: "flex gap-2 mb-2",
                        button {
                            class: "bg-green-600 p-2 rounded flex-1",
                            onclick: move |_| println!("Audio Call Started"),
                            "🎙️ Audio Call"
                        }
                        button {
                            class: "bg-blue-600 p-2 rounded flex-1",
                            onclick: start_video_call,
                            "📹 Video Call"
                        }
                    }

                    div {
                        class: "h-64 overflow-y-auto bg-slate-800 p-2 rounded border border-slate-700",
                        for msg in chat_state.read().messages.iter() {
                            div { class: "mb-1 text-sm", "{msg}" }
                        }
                    }

                    div {
                        class: "flex gap-2 mt-2",
                        input {
                            class: "flex-1 p-2 text-black rounded",
                            placeholder: "Type a message...",
                            value: "{input_msg}",
                            oninput: move |e| input_msg.set(e.value.clone())
                        }
                        button {
                            class: "bg-indigo-600 px-4 py-2 rounded font-bold",
                            onclick: move |_| {
                                chat_state.write().messages.push(input_msg.get().clone());
                                input_msg.set(String::new());
                            },
                            "Send"
                        }
                    }
                }
            }
        }
    })
}
