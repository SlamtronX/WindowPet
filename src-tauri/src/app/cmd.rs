use log::{error, info};
use mouse_position::mouse_position::Mouse;
use serde_json::json;
use crate::app::ai::{AIManager, AIConfig, Message};
use crate::app::conf::combine_config_path;

#[tauri::command]
pub fn get_mouse_position() -> serde_json::Value {
    /*
     * because we set the window to ignore cursor events, we cannot use 
     * javascript to get the mouse position, so we use get mouse position manually
     */
    let position = Mouse::get_mouse_position();
    match position {
        Mouse::Position { x, y } => {
            json!({
                "clientX": x,
                "clientY": y
            })
        }
        Mouse::Error => {
            error!("Error getting mouse position");
            println!("Error getting mouse position");
            json!(null)
        }
    }
}

#[tauri::command]
pub fn open_folder(path: &str) {
    match open::that(path) {
        Ok(()) => info!("Open folder: {}", path),
        Err(err) => error!("An error occurred when opening '{}': {}", path, err),
    }
}

#[tauri::command]
pub async fn chat_with_ai(
    message: String,
    _history: Vec<(String, String)>,
) -> Result<String, String> {
    // Load AI configuration from settings
    let setting_path = combine_config_path("settings.json")
        .ok_or_else(|| "Failed to get settings path".to_string())?;

    let settings_content = std::fs::read_to_string(&setting_path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    let json: serde_json::Value = serde_json::from_str(&settings_content)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    let ai_config = AIConfig::from_json(&json["ai"])
        .map_err(|e| format!("Invalid AI configuration: {}", e))?;

    if !ai_config.enabled {
        return Err("AI is disabled in settings.".to_string());
    }

    if ai_config.api_key.is_empty() {
        return Err("API key is not configured. Please set your API key in settings.".to_string());
    }

    // Create AI manager and send message
    let ai_manager = AIManager::new(ai_config);

    // Convert message history to AI messages (with current message as user message)
    let mut messages = Vec::new();
    for (role, content) in _history {
        messages.push(Message {
            role,
            content,
        });
    }
    // Add the current message
    messages.push(Message {
        role: "user".to_string(),
        content: message,
    });

    // Get response from AI
    ai_manager.chat(messages).await
}
