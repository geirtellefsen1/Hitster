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

  const tracks = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?fields=items(track(id,name,artists,album(release_date),uri)),next&limit=100`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Spotify API error: ${res.status}`);
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
