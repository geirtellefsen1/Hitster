import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSpotify } from '../hooks/useSpotify';
import { useSocket } from '../hooks/useSocket';
import HiddenPlayer from '../components/HiddenPlayer';

export default function HostSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, userName, login, handleCallback, initPlayer, ready } = useSpotify();
  const { emit, on } = useSocket();

  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [tracks, setTracks] = useState([]);
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
        // Remove code from URL
        window.history.replaceState({}, '', '/host');
        // Init player
        await initPlayer(tkn);
        setSpotifyReady(true);
      }).catch(err => {
        setError('Spotify login failed: ' + err.message);
      });
    }
  }, [searchParams]);

  // Listen for room created
  useEffect(() => {
    const cleanup = on('room:created', ({ roomCode }) => {
      // Store host info for the lobby
      sessionStorage.setItem('hostRoomCode', roomCode);
      sessionStorage.setItem('hostToken', accessToken);
      navigate(`/host/lobby?room=${roomCode}`);
    });
    return cleanup;
  }, [on, navigate, accessToken]);

  const fetchPlaylist = async () => {
    if (!playlistUrl.trim() || !accessToken) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl, accessToken })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch playlist');

      setTracks(data.tracks);
      setPlaylistInfo({ count: data.tracks.length });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createRoom = () => {
    emit('room:create', {
      hostName: userName || 'Host',
      tracks
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <HiddenPlayer />

      <h1 className="text-5xl neon-pink mb-8" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        HOST SETUP
      </h1>

      <div className="glass-card p-8 w-full max-w-md space-y-6">
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

        {/* Step 2: Playlist */}
        <div className={!spotifyReady ? 'opacity-40 pointer-events-none' : ''}>
          <h3 className="neon-cyan text-xl mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Step 2: Playlist
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste Spotify playlist URL..."
              value={playlistUrl}
              onChange={e => setPlaylistUrl(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 outline-none focus:border-[var(--cyan)]"
            />
            <button
              onClick={fetchPlaylist}
              disabled={loading || !playlistUrl.trim()}
              className="btn-secondary px-4 py-2 text-base"
            >
              {loading ? '...' : 'LOAD'}
            </button>
          </div>
          {playlistInfo && (
            <div className="mt-2 text-green-400 text-sm">
              ✓ {playlistInfo.count} tracks loaded
            </div>
          )}
        </div>

        {/* Step 3: Create Room */}
        <div className={!playlistInfo ? 'opacity-40 pointer-events-none' : ''}>
          <h3 className="neon-cyan text-xl mb-3" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Step 3: Create Room
          </h3>
          <button
            onClick={createRoom}
            disabled={!playlistInfo || !spotifyReady}
            className="btn-primary w-full text-2xl py-4"
          >
            CREATE ROOM
          </button>
        </div>

        {error && (
          <div className="text-red-400 text-sm text-center">{error}</div>
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
