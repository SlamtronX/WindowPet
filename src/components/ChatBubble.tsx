import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBubble() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // Start visible for testing

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // For now, this will fail since we haven't added the Rust command yet
      const response = await invoke<string>('chat_with_ai', { 
        message: input 
      });
      
      const aiMessage = { role: 'assistant' as const, content: response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage = { 
        role: 'assistant' as const, 
        content: 'AI backend not connected yet. We will add this next!' 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '350px',
      background: 'rgba(0, 0, 0, 0.9)',
      border: '2px solid #333',
      borderRadius: '12px',
      overflow: 'hidden',
      zIndex: 1000,
      display: isVisible ? 'block' : 'none',
    }}>
      <div style={{
        padding: '10px',
        background: '#1a1a1a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white',
        fontWeight: 'bold',
      }}>
        <span>Chat with Pet 🐾</span>
        <button 
          onClick={() => setIsVisible(!isVisible)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{
        height: '300px',
        overflowY: 'auto',
        padding: '10px',
      }}>
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            style={{
              margin: '8px 0',
              padding: '8px 12px',
              borderRadius: '8px',
              maxWidth: '80%',
              wordWrap: 'break-word',
              background: msg.role === 'user' ? '#0066cc' : '#2a2a2a',
              color: 'white',
              marginLeft: msg.role === 'user' ? 'auto' : '0',
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            background: '#2a2a2a',
            color: 'white',
            maxWidth: '80%',
          }}>
            Thinking...
          </div>
        )}
      </div>
      
      <div style={{
        display: 'flex',
        padding: '10px',
        borderTop: '1px solid #333',
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me anything..."
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: '4px',
            background: '#2a2a2a',
            color: 'white',
          }}
        />
        <button 
          onClick={handleSend}
          style={{
            marginLeft: '8px',
            padding: '8px 16px',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}