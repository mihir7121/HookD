"use client";

interface Props {
  points: number;
  color?: string;
}

export default function ScorePopup({ points, color = "#c8ff00" }: Props) {
  return (
    <div
      className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-streak"
      style={{ color }}
    >
      <div
        className="font-display text-7xl md:text-9xl leading-none select-none"
        style={{
          textShadow: `0 0 40px ${color}60, 0 0 80px ${color}30`,
        }}
      >
        +{points}
      </div>
    </div>
  );
}
