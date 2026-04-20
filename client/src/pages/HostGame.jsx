import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useSpotify } from '../hooks/useSpotify';
import { useGame } from '../hooks/useGame';
import SongCard from '../components/SongCard';
import Timer from '../components/Timer';
import Scoreboard from '../components/Scoreboard';
import HiddenPlayer from '../components/HiddenPlayer';

export default function HostGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { socket, emit, on } = useSocket();
  const { play, pause, initPlayer, ready } = useSpotify();
  const game = useGame(socket, on, emit);
  const roomCode = searchParams.get('room');
  const [timerRunning, setTimerRunning] = useState(false);
  const [accessToken] = useState(() => sessionStorage.getItem('hostToken'));

  // Request current game state on mount (may have missed round:start during navigation)
  useEffect(() => {
    if (roomCode && socket) {
      game.requestState(roomCode);
    }
  }, [roomCode, socket]);

  // Init Spotify player if not ready
  useEffect(() => {
    if (!ready && accessToken) {
      initPlayer(accessToken);
    }
  }, [accessToken, ready]);

  // Play track when round starts (wait for Spotify SDK to be ready)
  useEffect(() => {
    if (game.phase === 'playing' && game.currentTrackId && accessToken && ready) {
      play(game.currentTrackId, accessToken);
      setTimerRunning(true);
    }
  }, [game.phase, game.currentTrackId, accessToken, ready]);

  // Pause when reveal
  useEffect(() => {
    if (game.phase === 'reveal') {
      pause();
      setTimerRunning(false);
    }
  }, [game.phase]);

  // Navigate to results on game over
  useEffect(() => {
    if (game.phase === 'finished') {
      navigate(`/results?room=${roomCode}`);
    }
  }, [game.phase]);

  const handleTimeout = () => {
    setTimerRunning(false);
    emit('round:timeout', { roomCode });
  };

  const nextRound = () => {
    emit('round:next', { roomCode });
  };

  const placedCount = game.placedPlayers.length;
  const totalPlayers = game.players.length;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <HiddenPlayer />

      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-4xl mb-8">
        <div className="neon-cyan text-lg" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          ROOM: {roomCode}
        </div>
        <div className="neon-pink text-lg" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          ROUND {game.roundNumber} / {game.totalRounds}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
        {game.phase === 'playing' && (
          <>
            {/* Mystery card + Timer */}
            <div className="flex flex-col items-center gap-6">
              <SongCard revealed={false} size="large" />
              <Timer duration={20} onTimeout={handleTimeout} running={timerRunning} />
            </div>

            {/* Player status */}
            <div className="glass-card p-4 w-full max-w-md">
              <div className="text-center mb-3 neon-cyan" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {placedCount} OF {totalPlayers} PLAYERS PLACED
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {game.players.map(p => (
                  <div
                    key={p.id}
                    className={`px-3 py-1 rounded-full text-sm ${
                      game.placedPlayers.includes(p.id)
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}
                  >
                    {p.name} {game.placedPlayers.includes(p.id) && '✓'}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {game.phase === 'reveal' && game.revealData && (
          <>
            {/* Revealed card */}
            <div className="flex flex-col items-center gap-4">
              <SongCard
                revealed={true}
                title={game.revealData.title}
                artist={game.revealData.artist}
                year={game.revealData.year}
                size="large"
              />
            </div>

            {/* Results for this round */}
            <div className="glass-card p-4 w-full max-w-md">
              <div className="space-y-2">
                {game.revealData.results.map(r => (
                  <div
                    key={r.playerId}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      r.correct
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    <span>{r.playerName}</span>
                    <span className={r.correct ? 'text-green-400' : 'text-red-400'}>
                      {r.positionIndex === null ? 'No placement' : r.correct ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={nextRound} className="btn-primary text-xl px-8 py-3">
              NEXT SONG →
            </button>
          </>
        )}

        {/* Scoreboard (always visible during game) */}
        {game.scores.length > 0 && (
          <Scoreboard scores={game.scores} placedPlayers={game.phase === 'playing' ? game.placedPlayers : []} />
        )}
      </div>
    </div>
  );
}
