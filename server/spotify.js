function extractPlaylistId(input) {
  // Handle full URL: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  const urlMatch = input.match(/playlist\/([a-zA-Z0-9]+)/);
  if (urlMatch) return urlMatch[1];

  // Handle URI: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
  const uriMatch = input.match(/spotify:playlist:([a-zA-Z0-9]+)/);
  if (uriMatch) return uriMatch[1];

  // Maybe it's just the ID
  if (/^[a-zA-Z0-9]+$/.test(input)) return input;

  throw new Error('Invalid playlist URL or URI');
}

async function fetchPlaylistTracks(playlistUrl, accessToken) {
  const playlistId = extractPlaylistId(playlistUrl);

  // Spotify blocks access to editorial/algorithmic playlists for apps in
  // Development Mode (ids starting with 37i9dQZF). Detect and fail early
  // with a useful message.
  if (playlistId.startsWith('37i9dQZF')) {
    throw new Error(
      'Spotify blocks editorial/algorithmic playlists (Today\'s Top Hits, Daily Mix, etc.) for apps in Development Mode. Please use a user-created playlist instead.'
    );
  }

  const tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id,name,artists,album(release_date),uri)),next&limit=100`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.error?.message || `Spotify API error: ${res.status}`;

      if (res.status === 403) {
        throw new Error(
          `${msg} — Spotify now restricts editorial playlists for apps in Development Mode. Try a user-created playlist instead.`
        );
      }
      if (res.status === 404) {
        throw new Error('Playlist not found. Make sure the URL is correct and the playlist is public.');
      }
      throw new Error(msg);
    }

    const data = await res.json();

    for (const item of data.items) {
      if (!item.track || !item.track.id) continue;

      const releaseDate = item.track.album?.release_date || '';
      const year = parseInt(releaseDate.substring(0, 4), 10);

      if (!year || isNaN(year)) continue;

      tracks.push({
        trackId: item.track.id,
        title: item.track.name,
        artist: item.track.artists.map(a => a.name).join(', '),
        year,
        uri: item.track.uri
      });
    }

    url = data.next || null;
  }

  if (tracks.length === 0) {
    throw new Error('No playable tracks found in playlist');
  }

  return tracks;
}

module.exports = { fetchPlaylistTracks, extractPlaylistId };
