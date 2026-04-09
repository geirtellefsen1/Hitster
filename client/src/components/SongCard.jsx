export default function SongCard({ revealed, title, artist, year, size = 'normal' }) {
  const sizeClasses = size === 'large'
    ? 'w-48 h-64 text-6xl'
    : size === 'small'
      ? 'w-20 h-28 text-xs'
      : 'w-28 h-40 text-sm';

  return (
    <div className={`flip-card ${sizeClasses}`}>
      <div className={`flip-card-inner ${revealed ? 'flipped' : ''}`}>
        {/* Front - Mystery */}
        <div
          className="flip-card-front glass-card flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,45,120,0.15), rgba(0,240,255,0.15))',
            border: '2px solid rgba(255,45,120,0.3)'
          }}
        >
          <span className={`neon-pink ${size === 'large' ? 'text-7xl' : size === 'small' ? 'text-2xl' : 'text-4xl'}`}
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            ?
          </span>
        </div>

        {/* Back - Song Info */}
        <div
          className="flip-card-back glass-card flex flex-col items-center justify-center p-3 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(255,45,120,0.15))',
            border: '2px solid rgba(0,240,255,0.3)'
          }}
        >
          <div className="neon-cyan text-2xl mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {year}
          </div>
          <div className="text-white font-bold leading-tight" style={{ fontSize: size === 'small' ? '0.6rem' : '0.8rem' }}>
            {title}
          </div>
          <div className="text-gray-400 mt-1" style={{ fontSize: size === 'small' ? '0.5rem' : '0.7rem' }}>
            {artist}
          </div>
        </div>
      </div>
    </div>
  );
}
