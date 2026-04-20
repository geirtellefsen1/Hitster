import { useEffect, useState, useCallback, useContext, createContext } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3001';

const SocketContext = createContext(null);

// Single shared socket for the entire app.
// Without this, every page created its own Socket.io connection, which meant:
//   - The host's socket dropped on route change → server still thought the
//     old socket was the host → room:joined broadcasts never reached the
//     host's new socket (not in the Socket.io room).
//   - Same problem for players navigating from /join to /game.
export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  const socket = ctx?.socket || null;
  const connected = ctx?.connected || false;

  const emit = useCallback((event, data) => {
    socket?.emit(event, data);
  }, [socket]);

  const on = useCallback((event, handler) => {
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket]);

  const off = useCallback((event, handler) => {
    socket?.off(event, handler);
  }, [socket]);

  return { socket, emit, on, off, connected };
}
