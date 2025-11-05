use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::app::ai::Message;

#[derive(Debug, Serialize, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AnthropicMessage {
    id: String,
    #[serde(rename = "type")]
    message_type: String,
    role: String,
    content: Vec<ContentBlock>,
    model: String,
    stop_reason: Option<String>,
    stop_sequence: Option<String>,
    usage: UsageInfo,
}

#[derive(Debug, Serialize, Deserialize)]
struct UsageInfo {
    input_tokens: u32,
    output_tokens: u32,
}

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    system: String,
    messages: Vec<AnthropicMessageInput>,
}

#[derive(Debug, Serialize)]
struct AnthropicMessageInput {
    role: String,
    content: String,
}

pub struct AnthropicClient {
    api_key: String,
    model: String,
    system_prompt: String,
    max_tokens: u32,
}

impl AnthropicClient {
    pub fn new(api_key: String, model: String, system_prompt: String, max_tokens: u32) -> Self {
        Self {
            api_key,
            model,
            system_prompt,
            max_tokens,
        }
    }

    pub async fn send_message(
        &self,
        messages: Vec<Message>,
    ) -> Result<String, String> {
        if self.api_key.is_empty() {
            return Err("API key not configured. Please set your Anthropic API key in settings.".to_string());
        }

        let client = Client::new();

        // Convert messages to Anthropic format
        let anthropic_messages: Vec<AnthropicMessageInput> = messages
            .iter()
            .map(|m| AnthropicMessageInput {
                role: m.role.clone(),
                content: m.content.clone(),
            })
            .collect();

        let request = AnthropicRequest {
            model: self.model.clone(),
            max_tokens: self.max_tokens,
            system: self.system_prompt.clone(),
            messages: anthropic_messages,
        };

        let response = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(format!("API error {}: {}", status, body));
        }

        let anthropic_response: AnthropicMessage = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        // Extract text from the response
        anthropic_response
            .content
            .iter()
            .find(|block| block.content_type == "text")
            .and_then(|block| block.text.clone())
            .ok_or_else(|| "No text content in response".to_string())
    }
}
