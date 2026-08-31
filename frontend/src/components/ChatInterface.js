import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { createInteraction, fetchInteractions, setFormMode } from '../store/interactionsSlice';
import { showNotification } from '../store/uiSlice';
import api from '../api/api';

export default function ChatInterface() {
  const dispatch = useDispatch();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const sessionIdRef = useRef(`chat_${Date.now()}`);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/agent/chat', {
        message: text,
        session_id: sessionIdRef.current,
        conversation_history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      });

      const data = res.data.data || res.data;
      const assistantMsg = {
        role: 'assistant',
        content: data.response || data.message || 'No response received.',
        timestamp: new Date().toISOString(),
        hasAutofill: !!data.autofill,
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (data.autofill && data.data) {
        dispatch(showNotification({ message: 'AI extracted interaction data. Click "Autofill Form" to apply.', type: 'info' }));
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered an error connecting to the AI service. Please make sure GROQ_API_KEY is configured on the backend.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="card-header">
        <span className="card-title">AI Assistant</span>
        <span className="ai-badge">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          Powered by Groq
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div className="empty-state" style={{ flex: 1, justifyContent: 'center' }}>
            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <h3>Ask the AI Assistant</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', maxWidth: 260 }}>
              I can help you log interactions, draft summaries, analyze sentiment, or answer questions about your HCPs.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble chat-bubble-${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="chat-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
              </div>
            )}
            <div className="chat-message">
              <div className="chat-text">{msg.content}</div>
              <div className="chat-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble chat-bubble-assistant">
            <div className="chat-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            </div>
            <div className="chat-message">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
        />
        <button className="btn btn-primary chat-send" onClick={sendMessage} disabled={loading || !input.trim()}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
