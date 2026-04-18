import { useState, useCallback, useRef } from 'react';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || 'dcb32d7980ea45269f16ec8c83318f51';
const REDIRECT_URI = `${window.location.origin}/callback`;
const SCOPES = 'streaming user-read-email user-read-private user-modify-playback-state playlist-read-private playlist-read-collaborative';

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// crypto.subtle is only available in secure contexts (HTTPS / localhost).
// On plain HTTP we fall back to the "plain" PKCE method.
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
  // Fallback: plain PKCE (challenge === verifier)
  return { challenge: verifier, method: 'plain' };
}

export function useSpotify() {
  const [token, setToken] = useState(null);
  const [player, setPlayer] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('');
  const playerRef = useRef(null);

  const [loginError, setLoginError] = useState(null);

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

    setToken(data.access_token);
    sessionStorage.removeItem('spotify_verifier');

    // Fetch user profile
    const profile = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${data.access_token}` }
    }).then(r => r.json());

    setUserName(profile.display_name || profile.id);

    return data.access_token;
  }, []);

  const initPlayer = useCallback((accessToken) => {
    return new Promise((resolve) => {
      if (!window.Spotify) {
        // Load the SDK script
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
          createPlayer(accessToken, resolve);
        };
      } else {
        createPlayer(accessToken, resolve);
      }
    });

    function createPlayer(accessToken, resolve) {
      const p = new window.Spotify.Player({
        name: 'Hitster Online',
        getOAuthToken: cb => cb(accessToken),
        volume: 0.8
      });

      p.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id);
        setReady(true);
        playerRef.current = p;
        setPlayer(p);
        resolve(device_id);
      });

      p.addListener('initialization_error', ({ message }) => {
        console.error('Init error:', message);
      });

      p.addListener('authentication_error', ({ message }) => {
        console.error('Auth error:', message);
      });

      p.connect();
    }
  }, []);

  const play = useCallback(async (trackId, accessToken) => {
    const tkn = accessToken || token;
    if (!deviceId || !tkn) return;

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
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
  }, [token, deviceId]);

  const pause = useCallback(async () => {
    if (playerRef.current) {
      await playerRef.current.pause();
    }
  }, []);

  return {
    token,
    player,
    deviceId,
    ready,
    userName,
    login,
    loginError,
    handleCallback,
    initPlayer,
    play,
    pause,
    setToken
  };
}
