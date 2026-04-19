#!/usr/bin/env node
// Populate spotifyId for every song in data/categories/*.json
// Uses Spotify Client Credentials flow + Search API (both work in Dev Mode).
//
// Usage:
//   node scripts/lookup-spotify-ids.js
//
// Reads SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET from .env.
// Saves progress back to each JSON file after every lookup so interruptions
// don't lose work. Skips any song that already has a spotifyId.

const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) process.env[match[1]] = match[2];
  });
}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env');
  process.exit(1);
}

const CATEGORY_DIR = path.join(__dirname, '..', 'data', 'categories');
const DELAY_MS = 150;

async function getAccessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

function normalize(str) {
  return String(str || '').toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreMatch(track, target) {
  const tTitle = normalize(track.name);
  const tArtist = normalize(track.artists.map(a => a.name).join(' '));
  const queryTitle = normalize(target.title);
  const queryArtist = normalize(target.artist);

  let score = 0;
  if (tTitle === queryTitle) score += 100;
  else if (tTitle.includes(queryTitle) || queryTitle.includes(tTitle)) score += 50;
  if (tArtist.includes(queryArtist) || queryArtist.includes(tArtist)) score += 50;

  // Year proximity
  const releaseYear = parseInt((track.album?.release_date || '').substring(0, 4), 10);
  if (!isNaN(releaseYear)) {
    const diff = Math.abs(releaseYear - target.year);
    if (diff === 0) score += 30;
    else if (diff === 1) score += 20;
    else if (diff <= 3) score += 10;
    else if (diff > 10) score -= 20;
  }

  // Prefer non-live, non-karaoke versions
  const lowerName = track.name.toLowerCase();
  if (lowerName.includes('karaoke')) score -= 80;
  if (lowerName.includes('live')) score -= 30;
  if (lowerName.includes('tribute')) score -= 50;
  if (lowerName.includes('cover')) score -= 40;

  // Prefer more popular tracks
  score += (track.popularity || 0) / 5;

  return score;
}

async function searchTrack(token, target) {
  const q = `track:${target.title} artist:${target.artist}`;
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5`;

  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '10', 10);
    console.log(`  Rate limited — waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return searchTrack(token, target);
  }

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  const data = await res.json();
  const items = data.tracks?.items || [];
  if (items.length === 0) return null;

  // Rank by score
  const ranked = items
    .map(t => ({ track: t, score: scoreMatch(t, target) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (best.score < 50) return null;
  return best.track;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('Getting Spotify access token...');
  let token = await getAccessToken();
  let tokenIssuedAt = Date.now();

  const files = fs.readdirSync(CATEGORY_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  const notFound = [];
  let totalSongs = 0;
  let found = 0;
  let alreadyDone = 0;

  for (const file of files) {
    const filePath = path.join(CATEGORY_DIR, file);
    const category = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`\n=== ${category.name} (${category.songs.length} songs) ===`);

    for (let i = 0; i < category.songs.length; i++) {
      totalSongs++;
      const song = category.songs[i];

      if (song.spotifyId) {
        alreadyDone++;
        continue;
      }

      // Refresh token every 50 minutes
      if (Date.now() - tokenIssuedAt > 50 * 60 * 1000) {
        console.log('Refreshing token...');
        token = await getAccessToken();
        tokenIssuedAt = Date.now();
      }

      try {
        const track = await searchTrack(token, song);
        if (track) {
          song.spotifyId = track.id;
          found++;
          const releaseYear = (track.album?.release_date || '').substring(0, 4);
          console.log(`  ✓ [${i + 1}/${category.songs.length}] ${song.title} — ${song.artist} (${song.year}) → ${track.id} (${track.name}, ${releaseYear})`);
        } else {
          song.spotifyId = 'NOT_FOUND';
          notFound.push(`${category.name}: ${song.title} — ${song.artist} (${song.year})`);
          console.log(`  ✗ [${i + 1}/${category.songs.length}] ${song.title} — ${song.artist} (${song.year}) NOT FOUND`);
        }
      } catch (err) {
        console.log(`  ! [${i + 1}/${category.songs.length}] ${song.title} — ${song.artist}: ${err.message}`);
      }

      // Save progress after every lookup
      fs.writeFileSync(filePath, JSON.stringify(category, null, 2) + '\n');

      await sleep(DELAY_MS);
    }
  }

  console.log('\n==============================');
  console.log(`Total songs:     ${totalSongs}`);
  console.log(`Already had ID:  ${alreadyDone}`);
  console.log(`Newly found:     ${found}`);
  console.log(`Not found:       ${notFound.length}`);
  console.log('==============================');

  if (notFound.length > 0) {
    console.log('\nSongs that could not be found:');
    notFound.forEach(s => console.log(`  - ${s}`));

    const notFoundPath = path.join(__dirname, '..', 'data', 'not-found.txt');
    fs.writeFileSync(notFoundPath, notFound.join('\n') + '\n');
    console.log(`\nSaved not-found list to: ${notFoundPath}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
