import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useGame } from '../hooks/useGame';
import SongCard from '../components/SongCard';
import Timer from '../components/Timer';
import Timeline from '../components/Timeline';

export default function PlayerGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { socket, emit, on } = useSocket();
  const game = useGame(socket, on, emit);
  const roomCode = searchParams.get('room');
  const [timerRunning, setTimerRunning] = useState(false);
  const [myResult, setMyResult] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Request current game state on mount (may have missed round:start during navigation)
  useEffect(() => {
    if (roomCode && socket) {
      game.requestState(roomCode);
    }
  }, [roomCode, socket]);

  useEffect(() => {
    if (game.phase === 'playing') {
      setTimerRunning(true);
      setMyResult(null);
      setShowFeedback(false);
    }
  }, [game.phase, game.roundNumber]);

  // Find my result from reveal data
  useEffect(() => {
    if (game.phase === 'reveal' && game.revealData && socket) {
      setTimerRunning(false);
      const result = game.revealData.results.find(r => r.playerId === socket.id);
      setMyResult(result || null);
      setShowFeedback(true);

      // Hide feedback after a delay
      const timer = setTimeout(() => setShowFeedback(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [game.phase, game.revealData, socket]);

  // Navigate to results
  useEffect(() => {
    if (game.phase === 'finished') {
      navigate(`/results?room=${roomCode}`);
    }
  }, [game.phase]);

  const handlePlace = (positionIndex) => {
    if (game.hasPlaced) return;
    game.setHasPlaced(true);
    emit('player:place', { roomCode, positionIndex });
  };

  const handleTimeout = () => {
    setTimerRunning(false);
  };

  if (game.phase === 'host_disconnected') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="neon-pink text-4xl mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          HOST DISCONNECTED
        </h2>
        <p className="text-gray-400 mb-6">The host has left the game.</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          BACK TO HOME
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="neon-cyan text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          ROOM: {roomCode}
        </div>
        <div className="neon-pink text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          ROUND {game.roundNumber}
        </div>
        <div className="text-sm text-gray-400">
          Score: <span className="neon-cyan">{game.scores.find(s => s.id === socket?.id)?.score || 0}</span>
        </div>
      </div>

      {/* Current Song Area */}
      <div className="flex flex-col items-center gap-4 mb-6">
        {game.phase === 'playing' && (
          <>
            <SongCard revealed={false} size="normal" />
            <Timer duration={20} onTimeout={handleTimeout} running={timerRunning} />
            {game.hasPlaced ? (
              <p className="text-gray-400 text-sm animate-pulse">Waiting for other players...</p>
            ) : (
              <p className="neon-cyan text-sm" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                TAP WHERE THIS SONG BELONGS
              </p>
            )}
          </>
        )}

        {game.phase === 'reveal' && game.revealData && (
          <>
            <SongCard
              revealed={true}
              title={game.revealData.title}
              artist={game.revealData.artist}
              year={game.revealData.year}
              size="normal"
            />
            {showFeedback && myResult && (
              <div className={`text-lg font-bold ${myResult.correct ? 'text-green-400' : 'text-red-400'}`}
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {myResult.positionIndex === null
                  ? 'NO PLACEMENT'
                  : myResult.correct
                    ? '✓ CORRECT!'
                    : '✗ WRONG!'}
              </div>
            )}
            <p className="text-gray-500 text-sm">Waiting for next round...</p>
          </>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1">
        <h3 className="neon-cyan text-lg mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          YOUR TIMELINE
        </h3>
        <div className="glass-card p-3 overflow-x-auto">
          <Timeline
            cards={game.timeline.map((card, i) => ({
              ...card,
              justAdded: game.phase === 'reveal' && myResult?.correct &&
                myResult.positionIndex === i
            }))}
            onPlace={handlePlace}
            disabled={game.hasPlaced || game.phase !== 'playing'}
            result={showFeedback ? myResult : null}
          />
        </div>
      </div>

      {/* Mini scoreboard */}
      {game.scores.length > 0 && (
        <div className="mt-4 glass-card p-3">
          <div className="flex flex-wrap gap-3 justify-center">
            {[...game.scores].sort((a, b) => b.score - a.score).map(s => (
              <div key={s.id} className="text-xs text-gray-400">
                <span className={s.id === socket?.id ? 'neon-cyan' : ''}>{s.name}</span>
                <span className="ml-1 font-bold">{s.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
