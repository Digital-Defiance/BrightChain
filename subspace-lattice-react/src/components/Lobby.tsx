import React, { useState } from 'react';
import './Lobby.css';

interface LobbyProps {
  onCreateRoom: (name: string, password?: string) => void;
  onJoinRoom: (roomCode: string, password?: string, asObserver?: boolean) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onCreateRoom, onJoinRoom }) => {
  const [isCreating, setIsCreating] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [password, setPassword] = useState('');
  const [asObserver, setAsObserver] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      if (roomName.trim()) onCreateRoom(roomName, password);
    } else {
      if (roomCode.trim()) onJoinRoom(roomCode, password, asObserver);
    }
  };

  return (
    <div className="subspace-lobby">
      <div className="lobby-tabs">
        <button 
          className={`tab-btn ${isCreating ? 'active' : ''}`}
          onClick={() => setIsCreating(true)}
        >
          Create Room
        </button>
        <button 
          className={`tab-btn ${!isCreating ? 'active' : ''}`}
          onClick={() => setIsCreating(false)}
        >
          Join Room
        </button>
      </div>

      <form className="lobby-form" onSubmit={handleSubmit}>
        {isCreating ? (
          <>
            <div className="form-group">
              <label>Room Name</label>
              <input 
                type="text" 
                value={roomName} 
                onChange={e => setRoomName(e.target.value)} 
                required 
                placeholder="e.g. Ten-Forward"
              />
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Room Code (5 chars)</label>
              <input 
                type="text" 
                value={roomCode} 
                onChange={e => setRoomCode(e.target.value.toUpperCase())} 
                maxLength={5}
                required 
                placeholder="ABC12"
              />
            </div>
            <div className="form-group checkbox">
              <label>
                <input 
                  type="checkbox" 
                  checked={asObserver} 
                  onChange={e => setAsObserver(e.target.checked)} 
                />
                Join as Observer
              </label>
            </div>
          </>
        )}

        <div className="form-group">
          <label>Password (Optional)</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="Leave blank for public"
          />
        </div>

        <button type="submit" className="submit-btn">
          {isCreating ? 'Initialize Lattice' : 'Engage'}
        </button>
      </form>
    </div>
  );
};
