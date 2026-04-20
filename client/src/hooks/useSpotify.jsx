import { useState, useCallback, useRef, useContext, createContext } from 'react';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'dcb32d7980ea45269f16ec8c83318f51';
const REDIRECT_URI = `${window.location.origin}/callback`;
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state playlist-read-private playlist-read-collaborative';

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// crypto.subtle is only available in secure contexts. On plain HTTP we fall
// back to the "plain" PKCE method.
async function generateCodeChallenge(verifier) {
  if (window.crypto?.subtle) {
    const data = new TextEncoder().encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return {
      challenge: btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
      method: 'S256'
    };
  }
  return { challenge: verifier, method: 'plain' };
}

const SpotifyContext = createContext(null);

// Single Spotify SDK Player for the entire app.
// Without this, each page created its own Player instance → multiple "Hitster
// Online" devices registered at Spotify, and play() fired before a given
// instance was ready, so audio never started.
export function SpotifyProvider({ children }) {
  const [token, setToken] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('');
  const [loginError, setLoginError] = useState(null);
  const playerRef = useRef(null);
  const tokenRef = useRef(null);

  const login = useCallback(async () => {
    try {
      const verifier = generateCodeVerifier();
      sessionStorage.setItem('spotify_verifier', verifier);
      const { challenge, method } = await generateCodeChallenge(verifier);

      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        code_challenge_method: method,
        code_challenge: challenge
      });

      window.location.href = `https://accounts.spotify.com/authorize?${params}`;
    } catch (err) {
      console.error('Spotify login error:', err);
      setLoginError(err.message);
    }
  }, []);

  const handleCallback = useCallback(async (code) => {
    const verifier = sessionStorage.getItem('spotify_verifier');
    if (!verifier) throw new Error('No code verifier found');

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);

    tokenRef.current = data.access_token;
    setToken(data.access_token);
    sessionStorage.removeItem('spotify_verifier');
    sessionStorage.setItem('hostToken', data.access_token);

    const profile = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${data.access_token}` }
    }).then(r => r.json());

    setUserName(profile.display_name || profile.id);

    return data.access_token;
  }, []);

  const initPlayer = useCallback((accessToken) => {
    // Only init once — if already connected, reuse the existing Player.
    if (playerRef.current) {
      tokenRef.current = accessToken;
      return Promise.resolve(deviceId);
    }

    tokenRef.current = accessToken;
    console.log('Initializing Spotify Player...');

    return new Promise((resolve) => {
      const createPlayer = () => {
        console.log('Creating Spotify.Player instance');
        const p = new window.Spotify.Player({
          name: 'Hitster Online',
          getOAuthToken: cb => cb(tokenRef.current),
          volume: 0.8
        });

        p.addListener('ready', ({ device_id }) => {
          console.log('Spotify SDK ready — device:', device_id);
          setDeviceId(device_id);
          setReady(true);
          playerRef.current = p;
          resolve(device_id);
        });

        p.addListener('not_ready', ({ device_id }) => {
          console.log('Spotify SDK not ready:', device_id);
        });

        p.addListener('initialization_error', ({ message }) => {
          console.error('Spotify init error:', message);
        });

        p.addListener('authentication_error', ({ message }) => {
          console.error('Spotify auth error:', message);
        });

        p.addListener('account_error', ({ message }) => {
          console.error('Spotify account error (Premium required?):', message);
          alert('Spotify Premium is required to play music. Please check your account.');
        });

        p.addListener('playback_error', ({ message }) => {
          console.error('Spotify playback error:', message);
        });

        p.addListener('player_state_changed', state => {
          if (state) {
            console.log('Playback state:', state.paused ? 'paused' : 'playing', '—', state.track_window?.current_track?.name);
          }
        });

        p.connect().then(success => {
          console.log('Spotify player.connect() →', success);
        });
      };

      if (!window.Spotify) {
        console.log('Loading Spotify SDK script...');
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
        window.onSpotifyWebPlaybackSDKReady = () => {
          console.log('Spotify SDK script loaded');
          createPlayer();
        };
      } else {
        createPlayer();
      }
    });
  }, [deviceId]);

  // Must be called synchronously from a user gesture (click/tap) to enable
  // audio playback on mobile browsers. Without this, play() calls succeed
  // at the API level but no audio comes out.
  const activateElement = useCallback(async () => {
    if (playerRef.current?.activateElement) {
      try {
        await playerRef.current.activateElement();
        console.log('Spotify audio element activated');
      } catch (err) {
        console.error('activateElement failed:', err);
      }
    }
  }, []);

  const play = useCallback(async (trackId, accessToken) => {
    const tkn = accessToken || tokenRef.current || token;
    if (!deviceId || !tkn) {
      console.warn('Cannot play — deviceId:', deviceId, 'token:', !!tkn);
      return;
    }

    console.log('Playing track:', trackId, 'on device:', deviceId);

    try {
      // First transfer playback to our device so it becomes active.
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tkn}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ device_ids: [deviceId], play: false })
      });

      // Then play the track.
      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tkn}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: [`spotify:track:${trackId}`],
          position_ms: 0
        })
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('Play request failed:', res.status, err);
      } else {
        console.log('Play request succeeded');
      }
    } catch (err) {
      console.error('Play error:', err);
    }
  }, [token, deviceId]);

  const pause = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.pause();
    }
  }, []);

  return (
    <SpotifyContext.Provider value={{
      token, deviceId, ready, userName, loginError,
      login, handleCallback, initPlayer, activateElement, play, pause, setToken
    }}>
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify() {
  const ctx = useContext(SpotifyContext);
  if (!ctx) {
    throw new Error('useSpotify must be used within SpotifyProvider');
  }
  return ctx;
}
