import React, { useState, useRef, useEffect } from 'react';
import '../designs/chatbot.css';

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      content: 'Hi! Welcome to FIST GYM! 🥋 I\'m your AI assistant. I can help you with booking classes, membership info, pricing, and anything about our martial arts programs!',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage }),
      });

      const data = await response.json();

      if (data.success) {
        const botMessage = {
          type: 'bot',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMessage = {
          type: 'bot',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = {
        type: 'bot',
        content: 'Sorry, I\'m having trouble connecting. Please try again later.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        type: 'bot',
        content: 'Hi! Welcome to FIST GYM! 🥋 I\'m your AI assistant. I can help you with booking classes, membership info, pricing, and anything about our martial arts programs!',
        timestamp: new Date()
      }
    ]);
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="ai-chatbot">
      {/* Chat Bubble */}
      <div 
        className={`chat-bubble ${isOpen ? 'chat-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {!isOpen ? (
          <div className="chat-icon">
            💬
          </div>
        ) : (
          <div className="chat-close">
            ✕
          </div>
        )}
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-header-info">
              <h3>SenJitsu AI Assistant</h3>
              <p>Martial Arts Expert</p>
            </div>
            <button onClick={clearChat} className="clear-chat-btn" title="Clear Chat">
              🗑️
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.type}`}>
                <div className="message-content">
                  <p>{message.content}</p>
                  <span className="message-time">
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message bot">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about martial arts..."
              rows="2"
              disabled={isLoading}
            />
            <button 
              onClick={sendMessage} 
              disabled={!inputMessage.trim() || isLoading}
              className="send-btn"
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>

          <div className="chat-suggestions">
            <button onClick={() => setInputMessage("Who are the coaches at FIST GYM?")}>
              Our Coaches
            </button>
            <button onClick={() => setInputMessage("What martial arts classes do you offer?")}>
              Classes Available
            </button>
            <button onClick={() => setInputMessage("How do I book a class?")}>
              How to Book
            </button>
            <button onClick={() => setInputMessage("What are your membership benefits?")}>
              Membership Info
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatbot; 