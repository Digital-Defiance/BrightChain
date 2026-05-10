import React, { useState } from 'react';
import { IChatMessage } from 'subspace-lattice';
import './Chat.css';

interface ChatProps {
  messages?: IChatMessage[];
  onSendMessage: (text: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage }) => {
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className="subspace-chat">
      <div className="chat-messages">
        {(messages ?? []).map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.isSystemMessage ? 'system' : ''}`}>
            {!msg.isSystemMessage && <span className="sender">{msg.senderId}: </span>}
            <span className="text">{msg.text}</span>
            <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message..."
          className="chat-input"
        />
        <button type="submit" className="chat-send-btn">Send</button>
      </form>
    </div>
  );
};
