export default function Scoreboard({ scores, placedPlayers = [] }) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <div className="glass-card p-4 w-full max-w-md">
      <h3 className="neon-cyan text-2xl mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        Scoreboard
      </h3>
      <div className="space-y-2">
        {sorted.map((player, i) => (
          <div
            key={player.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{
              background: i === 0 ? 'rgba(255, 45, 120, 0.1)' : 'rgba(255, 255, 255, 0.03)'
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm w-5">{i + 1}.</span>
              <span className="font-medium">{player.name}</span>
              {placedPlayers.includes(player.id) && (
                <span className="text-green-400 text-sm">✓</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, j) => (
                  <div
                    key={j}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: j < player.score
                        ? '#00F0FF'
                        : 'rgba(255,255,255,0.1)'
                    }}
                  />
                ))}
              </div>
              <span className="neon-cyan text-lg ml-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {player.score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
