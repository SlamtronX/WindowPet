pub mod anthropic;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIConfig {
    pub enabled: bool,
    pub provider: String,
    pub api_key: String,
    pub model: String,
    pub temperature: f32,
    pub max_tokens: u32,
    pub system_prompt: String,
}

impl AIConfig {
    pub fn from_json(json: &serde_json::Value) -> Result<Self, String> {
        Ok(AIConfig {
            enabled: json["enabled"]
                .as_bool()
                .ok_or("Missing 'enabled' field")?,
            provider: json["provider"]
                .as_str()
                .ok_or("Missing 'provider' field")?
                .to_string(),
            api_key: json["apiKey"]
                .as_str()
                .unwrap_or("")
                .to_string(),
            model: json["model"]
                .as_str()
                .ok_or("Missing 'model' field")?
                .to_string(),
            temperature: json["temperature"]
                .as_f64()
                .unwrap_or(0.7) as f32,
            max_tokens: json["maxTokens"]
                .as_u64()
                .unwrap_or(1024) as u32,
            system_prompt: json["systemPrompt"]
                .as_str()
                .unwrap_or("You are a helpful assistant.")
                .to_string(),
        })
    }
}

pub struct AIManager {
    config: AIConfig,
    client: Option<anthropic::AnthropicClient>,
}

impl AIManager {
    pub fn new(config: AIConfig) -> Self {
        let client = if config.enabled && config.provider == "anthropic" && !config.api_key.is_empty() {
            Some(anthropic::AnthropicClient::new(
                config.api_key.clone(),
                config.model.clone(),
                config.system_prompt.clone(),
                config.max_tokens,
            ))
        } else {
            None
        };

        AIManager { config, client }
    }

    pub async fn chat(&self, messages: Vec<Message>) -> Result<String, String> {
        if !self.config.enabled {
            return Err("AI is disabled in settings.".to_string());
        }

        let client = self
            .client
            .as_ref()
            .ok_or("AI client not initialized. Please configure your API key.")?;

        client.send_message(messages).await
    }
}
