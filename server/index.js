require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { createRoom, joinRoom, getRoom, removePlayer, getRoomByPlayerId } = require('./rooms');
const { fetchPlaylistTracks } = require('./spotify');
const { isPlacementCorrect } = require('./gameLogic');
const { getCategoryList, getCategoryTracks } = require('./library');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// API endpoint to list built-in categories
app.get('/api/categories', (req, res) => {
  res.json({ categories: getCategoryList() });
});

// API endpoint to fetch playlist tracks (kept as fallback for user playlists)
app.post('/api/playlist', async (req, res) => {
  const { playlistUrl, accessToken } = req.body;
  try {
    const tracks = await fetchPlaylistTracks(playlistUrl, accessToken);
    res.json({ tracks });
  } catch (err) {
    console.error('Playlist fetch error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// SPA fallback — serve index.html for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

io.on('connection', (socket) => {
  console.log('Connected:', socket.id);

  socket.on('room:create', ({ hostName, tracks, categoryId }) => {
    let finalTracks = tracks;

    // If a categoryId is given, load tracks from the built-in library
    if (categoryId) {
      finalTracks = getCategoryTracks(categoryId);
      if (!finalTracks || finalTracks.length === 0) {
        socket.emit('room:error', { message: `Category not found or empty: ${categoryId}` });
        return;
      }
    }

    if (!finalTracks || finalTracks.length === 0) {
      socket.emit('room:error', { message: 'No tracks provided' });
      return;
    }

    const room = createRoom(socket.id, hostName, finalTracks);
    socket.join(room.code);
    socket.emit('room:created', {
      roomCode: room.code,
      songs: room.playlist.length
    });
    console.log(`Room ${room.code} created by ${hostName} (${finalTracks.length} tracks)`);
  });

  socket.on('room:join', ({ roomCode, playerName }) => {
    const code = roomCode.toUpperCase();
    const room = getRoom(code);

    if (!room) {
      socket.emit('room:error', { message: 'Room not found' });
      return;
    }
    if (room.phase !== 'lobby') {
      socket.emit('room:error', { message: 'Game already in progress' });
      return;
    }
    if (room.players.length >= 10) {
      socket.emit('room:error', { message: 'Room is full (max 10 players)' });
      return;
    }

    const player = joinRoom(code, socket.id, playerName);
    socket.join(code);

    io.to(code).emit('room:joined', {
      players: room.players.map(p => ({ id: p.id, name: p.name }))
    });
    console.log(`${playerName} joined room ${code}`);
  });

  socket.on('game:start', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (room.players.length < 2) return;

    room.phase = 'playing';
    room.round = 0;
    room.placements = {};

    // Reset player timelines
    room.players.forEach(p => {
      p.timeline = [];
      p.score = 0;
    });

    const song = room.playlist[room.round];
    room.currentSong = song;

    io.to(roomCode).emit('round:start', {
      trackId: song.trackId,
      roundNumber: room.round + 1,
      totalRounds: room.playlist.length
    });
    console.log(`Game started in room ${roomCode}, round 1`);
  });

  socket.on('player:place', ({ roomCode, positionIndex }) => {
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'playing') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Don't allow double placement
    if (room.placements[socket.id] !== undefined) return;

    room.placements[socket.id] = positionIndex;

    // Notify host that this player has placed
    io.to(room.hostId).emit('player:placed', { playerId: socket.id });

    // Check if all players have placed
    const allPlaced = room.players.every(p => room.placements[p.id] !== undefined);

    if (allPlaced) {
      resolveRound(roomCode);
    }
  });

  socket.on('round:timeout', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== socket.id) return;
    if (room.phase !== 'playing') return;

    resolveRound(roomCode);
  });

  socket.on('round:next', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== socket.id) return;

    room.round++;
    room.placements = {};

    if (room.round >= room.playlist.length) {
      // Out of songs — end game, highest score wins
      const winner = room.players.reduce((a, b) => a.score > b.score ? a : b);
      room.phase = 'finished';
      io.to(roomCode).emit('game:over', {
        winnerId: winner.id,
        winnerName: winner.name,
        finalScores: room.players.map(p => ({
          id: p.id,
          name: p.name,
          score: p.score
        }))
      });
      return;
    }

    room.phase = 'playing';
    const song = room.playlist[room.round];
    room.currentSong = song;

    io.to(roomCode).emit('round:start', {
      trackId: song.trackId,
      roundNumber: room.round + 1,
      totalRounds: room.playlist.length
    });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
    const roomInfo = getRoomByPlayerId(socket.id);
    if (roomInfo) {
      const { room, isHost } = roomInfo;
      if (isHost) {
        io.to(room.code).emit('host:disconnected');
      } else {
        removePlayer(room.code, socket.id);
        io.to(room.code).emit('room:joined', {
          players: room.players.map(p => ({ id: p.id, name: p.name }))
        });
      }
    }
  });

  socket.on('game:requestState', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return;

    const state = {
      phase: room.phase,
      players: room.players.map(p => ({ id: p.id, name: p.name })),
      roundNumber: room.round + 1,
      totalRounds: room.playlist.length,
      scores: room.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        timeline: p.timeline
      }))
    };

    if (room.phase === 'playing' && room.currentSong) {
      state.trackId = room.currentSong.trackId;
      state.placedPlayers = Object.keys(room.placements);
    }

    if (room.phase === 'reveal' && room.currentSong) {
      state.revealData = {
        year: room.currentSong.year,
        title: room.currentSong.title,
        artist: room.currentSong.artist
      };
    }

    socket.emit('game:state', state);
  });
});

function resolveRound(roomCode) {
  const room = getRoom(roomCode);
  if (!room || room.phase !== 'playing') return;

  room.phase = 'reveal';
  const song = room.currentSong;
  const results = [];

  room.players.forEach(player => {
    const positionIndex = room.placements[player.id];
    let correct = false;

    if (positionIndex !== undefined) {
      correct = isPlacementCorrect(player.timeline, positionIndex, song.year);
      if (correct) {
        player.timeline.splice(positionIndex, 0, {
          title: song.title,
          artist: song.artist,
          year: song.year,
          trackId: song.trackId
        });
        player.score++;
      }
    }

    results.push({
      playerId: player.id,
      playerName: player.name,
      positionIndex: positionIndex !== undefined ? positionIndex : null,
      correct
    });
  });

  // Check win condition
  const winner = room.players.find(p => p.score >= 10);

  io.to(roomCode).emit('round:reveal', {
    year: song.year,
    title: song.title,
    artist: song.artist,
    results
  });

  io.to(roomCode).emit('scores:update', {
    scores: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      timeline: p.timeline
    }))
  });

  if (winner) {
    room.phase = 'finished';
    io.to(roomCode).emit('game:over', {
      winnerId: winner.id,
      winnerName: winner.name,
      finalScores: room.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score
      }))
    });
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
