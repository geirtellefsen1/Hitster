import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGame } from '../hooks/useGame';
import Confetti from '../components/Confetti';

export default function Results() {
  const navigate = useNavigate();
  const { socket, on } = useSocket();
  const game = useGame(socket, on);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const sortedScores = [...game.scores].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {showConfetti && <Confetti />}

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #FF2D78, transparent)' }} />
      </div>

      <div className="relative z-10 text-center">
        {game.winner ? (
          <>
            <h2 className="neon-cyan text-2xl mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              WINNER
            </h2>
            <h1
              className="text-7xl md:text-8xl neon-pink mb-8 animate-float"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {game.winner.name}
            </h1>
          </>
        ) : (
          <h1 className="text-5xl neon-pink mb-8" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            GAME OVER
          </h1>
        )}

        {/* Scoreboard */}
        <div className="glass-card p-6 w-full max-w-md mx-auto mb-8">
          <h3 className="neon-cyan text-2xl mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            FINAL SCORES
          </h3>
          <div className="space-y-3">
            {sortedScores.map((player, i) => (
              <div
                key={player.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                  i === 0
                    ? 'bg-[rgba(255,45,120,0.15)] border border-[rgba(255,45,120,0.3)]'
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${i === 0 ? 'neon-pink' : i === 1 ? 'neon-cyan' : 'text-gray-500'}`}
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    {i === 0 ? '🏆' : `#${i + 1}`}
                  </span>
                  <span className={`font-medium ${i === 0 ? 'text-lg' : ''}`}>
                    {player.name}
                  </span>
                </div>
                <span
                  className={`text-3xl ${i === 0 ? 'neon-pink' : 'neon-cyan'}`}
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {player.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button onClick={() => navigate('/')} className="btn-primary text-xl px-8 py-3">
            NEW GAME
          </button>
        </div>
      </div>
    </div>
  );
}
