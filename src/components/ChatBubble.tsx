import { useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBubble() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const chatRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, content: input };
    const messageContent = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Convert message history to the format expected by the backend
      const history: Array<[string, string]> = messages.map(msg => [msg.role, msg.content]);

      const response = await invoke<string>('chat_with_ai', {
        message: messageContent,
        history: history
      });

      const aiMessage = { role: 'assistant' as const, content: response };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!(e.target as HTMLElement).closest('input, button, .chat-content')) {
      setIsDragging(true);
      const rect = chatRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <>
      {/* Reopen button when chat is hidden */}
      {!isVisible && (
        <button
          data-chat-bubble="true"
          onClick={() => setIsVisible(true)}
          style={{
            position: 'fixed',
            top: '50%',
            right: '20px',
            transform: 'translateY(-50%)',
            width: '50px',
            height: '50px',
            background: '#0066cc',
            border: 'none',
            borderRadius: '50%',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#0052a3'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#0066cc'}
          title="Open chat"
        >
          💬
        </button>
      )}

      {/* Chat bubble on top - positioned in top right */}
      <div
        ref={chatRef}
        data-chat-bubble="true"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'fixed',
          top: `${position.y}px`,
          right: position.x === 0 ? '20px' : 'auto',
          left: position.x === 0 ? 'auto' : `${position.x}px`,
          width: '350px',
          background: 'rgba(0, 0, 0, 0.95)',
          border: '2px solid #444',
          borderRadius: '12px',
          overflow: 'hidden',
          zIndex: 10000,
          display: isVisible ? 'block' : 'none',
          pointerEvents: 'auto',
          userSelect: isDragging ? 'none' : 'auto',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}>
        <div style={{
          padding: '12px',
          background: '#1a1a1a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}>
          <span>💬 Chat with Pet</span>
          <button 
            onClick={() => setIsVisible(!isVisible)}
            style={{
              background: '#333',
              border: 'none',
              color: 'white',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            ×
          </button>
        </div>
        
        <div
          className="chat-content"
          style={{
            height: '300px',
            overflowY: 'auto',
            padding: '10px',
            background: '#0a0a0a',
          }}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                margin: '8px 0',
                padding: '10px 14px',
                borderRadius: '10px',
                maxWidth: '85%',
                wordWrap: 'break-word',
                background: msg.role === 'user' ? '#0066cc' : '#333333',
                color: msg.role === 'user' ? 'white' : '#e0e0e0',
                marginLeft: msg.role === 'user' ? 'auto' : '0',
                textAlign: msg.role === 'user' ? 'right' : 'left',
              }}
            >
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: '#2a2a2a',
              color: '#888',
              maxWidth: '85%',
            }}>
              Thinking...
            </div>
          )}
        </div>
        
        <div style={{
          display: 'flex',
          padding: '12px',
          borderTop: '1px solid #333',
          background: '#1a1a1a',
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: '10px',
              border: '1px solid #444',
              borderRadius: '6px',
              background: '#2a2a2a',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            style={{
              marginLeft: '10px',
              padding: '10px 20px',
              background: input.trim() ? '#0066cc' : '#444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: input.trim() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}