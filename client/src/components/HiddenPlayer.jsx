// This component holds the hidden Spotify Web Playback SDK div
// Audio plays from the host's browser but no UI is shown
export default function HiddenPlayer() {
  return (
    <div
      id="spotify-player-container"
      style={{ display: 'none', position: 'absolute', width: 0, height: 0 }}
    />
  );
}
