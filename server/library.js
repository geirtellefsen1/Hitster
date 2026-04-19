const fs = require('fs');
const path = require('path');

const CATEGORY_DIR = path.join(__dirname, '..', 'data', 'categories');

let _cache = null;

function loadCategories() {
  if (_cache) return _cache;

  const files = fs.readdirSync(CATEGORY_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  const categories = files.map(file => {
    const data = JSON.parse(fs.readFileSync(path.join(CATEGORY_DIR, file), 'utf8'));
    // Only include songs that have a valid Spotify ID (not null, not NOT_FOUND)
    const playableSongs = (data.songs || []).filter(
      s => s.spotifyId && s.spotifyId !== 'NOT_FOUND'
    );
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      songCount: playableSongs.length,
      songs: playableSongs
    };
  });

  _cache = categories;
  return categories;
}

function getCategoryList() {
  // Public list (without songs)
  return loadCategories().map(c => ({
    id: c.id,
    name: c.name,
    description: c.description,
    songCount: c.songCount
  }));
}

function getCategoryTracks(categoryId) {
  const cat = loadCategories().find(c => c.id === categoryId);
  if (!cat) return null;

  // Map to the shape the game expects
  return cat.songs.map(s => ({
    trackId: s.spotifyId,
    title: s.title,
    artist: s.artist,
    year: s.year,
    uri: `spotify:track:${s.spotifyId}`
  }));
}

function reloadCategories() {
  _cache = null;
}

module.exports = { getCategoryList, getCategoryTracks, reloadCategories };
