import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './hooks/useSocket';
import { SpotifyProvider } from './hooks/useSpotify';
import Landing from './pages/Landing';
import HostSetup from './pages/HostSetup';
import HostLobby from './pages/HostLobby';
import HostGame from './pages/HostGame';
import JoinRoom from './pages/JoinRoom';
import PlayerGame from './pages/PlayerGame';
import Results from './pages/Results';

function App() {
  return (
    <SocketProvider>
      <SpotifyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/host" element={<HostSetup />} />
            <Route path="/callback" element={<HostSetup />} />
            <Route path="/host/lobby" element={<HostLobby />} />
            <Route path="/host/game" element={<HostGame />} />
            <Route path="/join" element={<JoinRoom />} />
            <Route path="/game" element={<PlayerGame />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </BrowserRouter>
      </SpotifyProvider>
    </SocketProvider>
  );
}

export default App;
