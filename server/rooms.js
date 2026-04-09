const rooms = {};

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms[code]);
  return code;
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createRoom(hostId, hostName, tracks) {
  const code = generateCode();
  const room = {
    code,
    hostId,
    hostName,
    players: [],
    playlist: shuffleArray(tracks),
    currentSong: null,
    phase: 'lobby',
    round: 0,
    placements: {}
  };
  rooms[code] = room;
  return room;
}

function joinRoom(code, playerId, playerName) {
  const room = rooms[code];
  if (!room) return null;
  const player = {
    id: playerId,
    name: playerName,
    timeline: [],
    score: 0
  };
  room.players.push(player);
  return player;
}

function getRoom(code) {
  return rooms[code] || null;
}

function removePlayer(code, playerId) {
  const room = rooms[code];
  if (!room) return;
  room.players = room.players.filter(p => p.id !== playerId);
  if (room.players.length === 0 && room.phase !== 'lobby') {
    delete rooms[code];
  }
}

function getRoomByPlayerId(playerId) {
  for (const code of Object.keys(rooms)) {
    const room = rooms[code];
    if (room.hostId === playerId) {
      return { room, isHost: true };
    }
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      return { room, isHost: false };
    }
  }
  return null;
}

function deleteRoom(code) {
  delete rooms[code];
}

module.exports = { createRoom, joinRoom, getRoom, removePlayer, getRoomByPlayerId, deleteRoom };
