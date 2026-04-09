import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function Confetti() {
  useEffect(() => {
    const duration = 4000;
    const end = Date.now() + duration;

    const colors = ['#FF2D78', '#00F0FF', '#FFD700', '#FF6B9D'];

    function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }

    frame();
  }, []);

  return null;
}
