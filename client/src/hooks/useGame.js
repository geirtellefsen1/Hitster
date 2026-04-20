import { useState, useCallback, useEffect } from 'react';

export function useGame(socket, on, emit) {
  const [phase, setPhase] = useState('lobby');
  const [players, setPlayers] = useState([]);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [revealData, setRevealData] = useState(null);
  const [scores, setScores] = useState([]);
  const [winner, setWinner] = useState(null);
  const [placedPlayers, setPlacedPlayers] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [hasPlaced, setHasPlaced] = useState(false);

  useEffect(() => {
    if (!on) return;

    const cleanups = [
      on('room:joined', ({ players: p }) => {
        setPlayers(p);
      }),

      on('round:start', ({ trackId, roundNumber: rn, totalRounds: tr }) => {
        setPhase('playing');
        setCurrentTrackId(trackId);
        setRoundNumber(rn);
        setTotalRounds(tr);
        setRevealData(null);
        setPlacedPlayers([]);
        setHasPlaced(false);
      }),

      on('player:placed', ({ playerId }) => {
        setPlacedPlayers(prev => [...prev, playerId]);
      }),

      on('round:reveal', (data) => {
        setPhase('reveal');
        setRevealData(data);
      }),

      on('scores:update', ({ scores: s }) => {
        setScores(s);
        if (socket?.id) {
          const me = s.find(sc => sc.id === socket.id);
          if (me) {
            setTimeline(me.timeline || []);
          }
        }
      }),

      on('game:over', ({ winnerId, winnerName, finalScores }) => {
        setPhase('finished');
        setWinner({ id: winnerId, name: winnerName });
        setScores(finalScores);
      }),

      on('host:disconnected', () => {
        setPhase('host_disconnected');
      }),

      on('game:state', (state) => {
        setPhase(state.phase);
        setPlayers(state.players || []);
        setRoundNumber(state.roundNumber || 0);
        setTotalRounds(state.totalRounds || 0);
        setScores(state.scores || []);

        if (state.trackId) {
          setCurrentTrackId(state.trackId);
        }
        if (state.placedPlayers) {
          setPlacedPlayers(state.placedPlayers);
        }
        if (state.revealData) {
          setRevealData(state.revealData);
        }

        if (socket?.id && state.scores) {
          const me = state.scores.find(sc => sc.id === socket.id);
          if (me) {
            setTimeline(me.timeline || []);
          }
        }
      })
    ];

    return () => cleanups.forEach(cleanup => cleanup && cleanup());
  }, [on, socket]);

  const requestState = useCallback((roomCode) => {
    if (emit && roomCode) {
      emit('game:requestState', { roomCode });
    }
  }, [emit]);

  const reset = useCallback(() => {
    setPhase('lobby');
    setPlayers([]);
    setCurrentTrackId(null);
    setRoundNumber(0);
    setTotalRounds(0);
    setRevealData(null);
    setScores([]);
    setWinner(null);
    setPlacedPlayers([]);
    setTimeline([]);
    setHasPlaced(false);
  }, []);

  return {
    phase, setPhase,
    players, setPlayers,
    currentTrackId,
    roundNumber,
    totalRounds,
    revealData,
    scores,
    winner,
    placedPlayers,
    timeline,
    hasPlaced, setHasPlaced,
    requestState,
    reset
  };
}
