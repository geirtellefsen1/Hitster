import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Background gradient effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #FF2D78, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00F0FF, transparent)' }} />
      </div>

      <div className="relative z-10 text-center">
        {/* Logo */}
        <h1 className="text-8xl md:text-9xl neon-pink mb-2 animate-float"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          HITSTER
        </h1>
        <p className="neon-cyan text-xl md:text-2xl mb-12 tracking-widest"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          The Music Timeline Game
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button
            onClick={() => navigate('/host')}
            className="btn-primary text-2xl px-10 py-4 w-64"
          >
            HOST A GAME
          </button>
          <button
            onClick={() => navigate('/join')}
            className="btn-secondary text-2xl px-10 py-4 w-64"
          >
            JOIN A GAME
          </button>
        </div>

        <p className="text-gray-500 text-sm mt-12">
          Spotify Premium required for host · Players just need a browser
        </p>
      </div>
    </div>
  );
}
