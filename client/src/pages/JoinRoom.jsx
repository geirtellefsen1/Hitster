import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';

export default function JoinRoom() {
  const navigate = useNavigate();
  const { emit, on } = useSocket();

  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const cleanups = [
      on('room:joined', ({ players: p }) => {
        setPlayers(p);
        if (!joined) setJoined(true);
      }),
      on('room:error', ({ message }) => {
        setError(message);
      }),
      on('round:start', () => {
        navigate(`/game?room=${roomCode.toUpperCase()}`);
      })
    ];
    return () => cleanups.forEach(c => c && c());
  }, [on, joined, roomCode, navigate]);

  const handleJoin = () => {
    if (!roomCode.trim() || !playerName.trim()) return;
    setError('');
    sessionStorage.setItem('playerName', playerName);
    sessionStorage.setItem('playerRoom', roomCode.toUpperCase());
    emit('room:join', { roomCode: roomCode.toUpperCase(), playerName });
  };

  if (joined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <h2 className="neon-cyan text-3xl mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            JOINED ROOM
          </h2>
          <div className="text-6xl neon-pink mb-6 tracking-[0.3em]"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {roomCode.toUpperCase()}
          </div>

          <div className="glass-card p-6 w-full max-w-sm mx-auto">
            <h3 className="neon-cyan text-xl mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              PLAYERS
            </h3>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg"
                  style={{ background: 'rgba(0, 240, 255, 0.05)' }}
                >
                  <span className="text-[var(--cyan)] font-bold">{i + 1}</span>
                  <span className="font-medium">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-6 animate-pulse">
            Waiting for host to start the game...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #00F0FF, transparent)' }} />
      </div>

      <div className="relative z-10 text-center">
        <h1 className="text-5xl neon-cyan mb-8" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          JOIN GAME
        </h1>

        <div className="glass-card p-8 w-full max-w-sm space-y-4">
          <div>
            <input
              type="text"
              placeholder="Room Code"
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-center text-3xl tracking-[0.3em] placeholder-gray-600 outline-none focus:border-[var(--cyan)] uppercase"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Your Name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={20}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-center placeholder-gray-600 outline-none focus:border-[var(--cyan)]"
            />
          </div>
          <button
            onClick={handleJoin}
            disabled={!roomCode.trim() || !playerName.trim()}
            className="btn-primary w-full text-2xl py-4"
          >
            JOIN
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <button
          onClick={() => navigate('/')}
          className="mt-6 text-gray-500 hover:text-white transition-colors text-sm"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
}
