import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGame } from '../hooks/useGame';

export default function HostLobby() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { socket, emit, on } = useSocket();
  const { players } = useGame(socket, on);
  const roomCode = searchParams.get('room') || sessionStorage.getItem('hostRoomCode');

  useEffect(() => {
    if (!roomCode) {
      navigate('/host');
    }
  }, [roomCode]);

  useEffect(() => {
    const cleanup = on('round:start', () => {
      navigate(`/host/game?room=${roomCode}`);
    });
    return cleanup;
  }, [on, navigate, roomCode]);

  const startGame = () => {
    emit('game:start', { roomCode });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #FF2D78, transparent)' }} />
      </div>

      <div className="relative z-10 text-center">
        <h2 className="neon-cyan text-2xl mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          ROOM CODE
        </h2>
        <div
          className="text-8xl md:text-9xl neon-pink mb-8 tracking-[0.3em]"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {roomCode}
        </div>

        <p className="text-gray-400 mb-8 text-sm">
          Share this code with players · Make sure your volume is up — music plays from this device
        </p>

        {/* Player list */}
        <div className="glass-card p-6 w-full max-w-sm mx-auto mb-8">
          <h3 className="neon-cyan text-xl mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            PLAYERS ({players.length}/10)
          </h3>
          {players.length === 0 ? (
            <p className="text-gray-500 text-sm italic">Waiting for players to join...</p>
          ) : (
            <div className="space-y-2">
              {players.map((player, i) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg"
                  style={{ background: 'rgba(0, 240, 255, 0.05)' }}
                >
                  <span className="text-[var(--cyan)] font-bold">{i + 1}</span>
                  <span className="font-medium">{player.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={startGame}
          disabled={players.length < 2}
          className="btn-primary text-3xl px-12 py-5"
        >
          START GAME
        </button>
        {players.length < 2 && (
          <p className="text-gray-500 text-xs mt-3">Need at least 2 players to start</p>
        )}
      </div>
    </div>
  );
}
