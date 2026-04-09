import DropZone from './DropZone';

export default function Timeline({ cards, onPlace, disabled, result }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-4 px-2 min-h-[140px]">
      {/* Drop zone before first card */}
      <DropZone
        index={0}
        onPlace={onPlace}
        disabled={disabled}
        highlight={result?.positionIndex === 0}
        correct={result?.positionIndex === 0 ? result.correct : null}
      />

      {cards.map((card, i) => (
        <div key={`${card.trackId}-${i}`} className="flex items-center gap-1">
          {/* Card */}
          <div
            className={`glass-card flex flex-col items-center justify-center p-2 min-w-[80px] h-[100px] text-center shrink-0
              ${card.justAdded && result?.correct ? 'animate-correct' : ''}
            `}
            style={{
              background: card.justAdded && result?.correct
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(0, 240, 255, 0.08)',
              borderColor: card.justAdded && result?.correct
                ? 'rgba(34, 197, 94, 0.5)'
                : 'rgba(0, 240, 255, 0.2)'
            }}
          >
            <div className="neon-cyan text-xl" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              {card.year}
            </div>
            <div className="text-white text-[0.65rem] font-medium leading-tight mt-1 line-clamp-2">
              {card.title}
            </div>
            <div className="text-gray-400 text-[0.55rem] mt-0.5 line-clamp-1">
              {card.artist}
            </div>
          </div>

          {/* Drop zone after each card */}
          <DropZone
            index={i + 1}
            onPlace={onPlace}
            disabled={disabled}
            highlight={result?.positionIndex === i + 1}
            correct={result?.positionIndex === i + 1 ? result.correct : null}
          />
        </div>
      ))}

      {cards.length === 0 && (
        <div className="text-gray-500 text-sm italic ml-4">
          Your timeline is empty — place your first song!
        </div>
      )}
    </div>
  );
}
