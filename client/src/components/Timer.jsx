import { useState, useEffect } from 'react';

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function Timer({ duration = 20, onTimeout, running = true }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (!running || timeLeft <= 0) {
      if (timeLeft <= 0 && onTimeout) onTimeout();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onTimeout) onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);

  const progress = timeLeft / duration;
  const offset = CIRCUMFERENCE * (1 - progress);
  const isUrgent = timeLeft <= 5;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="timer-ring">
        <circle
          cx="60" cy="60" r={RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        <circle
          cx="60" cy="60" r={RADIUS}
          fill="none"
          stroke={isUrgent ? '#FF2D78' : '#00F0FF'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{
            transition: 'stroke-dashoffset 1s linear, stroke 0.3s',
            filter: isUrgent ? 'drop-shadow(0 0 6px #FF2D78)' : 'drop-shadow(0 0 6px #00F0FF)'
          }}
        />
      </svg>
      <span
        className="absolute text-3xl font-bold"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          color: isUrgent ? '#FF2D78' : '#00F0FF',
          textShadow: isUrgent
            ? '0 0 10px #FF2D78'
            : '0 0 10px #00F0FF'
        }}
      >
        {timeLeft}
      </span>
    </div>
  );
}
