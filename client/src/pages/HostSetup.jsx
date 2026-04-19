import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpotify } from '../hooks/useSpotify';
import { useSocket } from '../hooks/useSocket';
import HiddenPlayer from '../components/HiddenPlayer';

export default function HostSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, userName, login, loginError, handleCallback, initPlayer, ready } = useSpotify();
  const { emit, on } = useSocket();

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spotifyReady, setSpotifyReady] = useState(false);
  const [accessToken, setAccessToken] = useState(null);

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && !token) {
      handleCallback(code).then(async (tkn) => {
        setAccessToken(tkn);
        window.history.replaceState({}, '', '/host');
        await initPlayer(tkn);
        setSpotifyReady(true);
      }).catch(err => {
        setError('Spotify login failed: ' + err.message);
      });
    }
  }, [searchParams]);

  // Load categories on mount
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories || []))
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  // Listen for room created
  useEffect(() => {
    const cleanup = on('room:created', ({ roomCode }) => {
      sessionStorage.setItem('hostRoomCode', roomCode);
      sessionStorage.setItem('hostToken', accessToken);
      navigate(`/host/lobby?room=${roomCode}`);
    });
    return cleanup;
  }, [on, navigate, accessToken]);

  // Listen for room errors
  useEffect(() => {
    const cleanup = on('room:error', ({ message }) => {
      setError(message);
      setLoading(false);
    });
    return cleanup;
  }, [on]);

  const createRoom = () => {
    if (!selectedCategory || !spotifyReady) return;
    setLoading(true);
    setError('');
    emit('room:create', {
      hostName: userName || 'Host',
      categoryId: selectedCategory
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 pb-20">
      <HiddenPlayer />

      <h1 className="text-5xl neon-pink mb-8 mt-6" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        HOST SETUP
      </h1>

      <div className="glass-card p-8 w-full max-w-2xl space-y-6">
        {/* Step 1: Spotify Login */}
        <div>
          <h3 className="neon-cyan text-xl mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Step 1: Spotify Login
          </h3>
          {!spotifyReady ? (
            <button onClick={login} className="btn-primary w-full flex items-center justify-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              LOGIN WITH SPOTIFY
            </button>
          ) : (
            <div className="flex items-center gap-2 text-green-400">
              <span className="text-xl">✓</span>
              <span>Logged in as <strong>{userName}</strong></span>
            </div>
          )}
        </div>

        {/* Step 2: Pick a Category */}
        <div className={!spotifyReady ? 'opacity-40 pointer-events-none' : ''}>
          <h3 className="neon-cyan text-xl mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Step 2: Pick a Category
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`
                  text-left p-4 rounded-lg border-2 transition-all duration-200
                  ${selectedCategory === cat.id
                    ? 'border-[var(--pink)] bg-[rgba(255,45,120,0.1)] glow-pink'
                    : 'border-white/10 bg-white/5 hover:border-[var(--cyan)]'
                  }
                `}
              >
                <div className="flex items-baseline justify-between">
                  <div
                    className="text-lg text-white"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    {cat.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {cat.songCount} songs
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {cat.description}
                </div>
              </button>
            ))}
          </div>
          {categories.length === 0 && (
            <p className="text-gray-500 text-sm italic">Loading categories...</p>
          )}
        </div>

        {/* Step 3: Create Room */}
        <div className={!selectedCategory ? 'opacity-40 pointer-events-none' : ''}>
          <h3 className="neon-cyan text-xl mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Step 3: Create Room
          </h3>
          <button
            onClick={createRoom}
            disabled={!selectedCategory || !spotifyReady || loading}
            className="btn-primary w-full text-2xl py-4"
          >
            {loading ? 'CREATING...' : 'CREATE ROOM'}
          </button>
        </div>

        {(error || loginError) && (
          <div className="text-red-400 text-sm text-center">{error || loginError}</div>
        )}
      </div>

      <button
        onClick={() => navigate('/')}
        className="mt-6 text-gray-500 hover:text-white transition-colors text-sm"
      >
        ← Back to Home
      </button>
    </div>
  );
}
