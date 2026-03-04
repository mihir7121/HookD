"use client";
import { useGameStore } from "@/lib/store";

interface Props {
  title: string;
  color: string;
  onBack: () => void;
  children: React.ReactNode;
  stats?: { round: number; correct: number; total: number };
}

export default function GameLayout({ title, color, onBack, children, stats }: Props) {
  const { score, streak } = useGameStore();

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Radial glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-5"
          style={{
            background: `radial-gradient(ellipse, ${color} 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-border bg-bg/90 backdrop-blur-sm sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="font-mono text-xs text-textdim hover:text-text transition-colors tracking-widest"
          >
            ← BACK
          </button>
          <div className="w-px h-4 bg-border" />
          <span
            className="font-display text-xl tracking-widest"
            style={{ color }}
          >
            {title.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs">
          {stats && (
            <div className="hidden sm:flex items-center gap-4 text-textdim">
              <span>
                Round{" "}
                <span className="text-text">{stats.round}</span>
              </span>
              <span>
                {stats.correct}/{stats.total} correct
              </span>
              {stats.total > 0 && (
                <span>
                  <span className="text-text">
                    {Math.round((stats.correct / stats.total) * 100)}%
                  </span>{" "}
                  ACC
                </span>
              )}
            </div>
          )}
          <div className="w-px h-4 bg-border hidden sm:block" />
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-textdim text-xs tracking-widest">SCORE</span>
              <span className="text-accent leading-tight">{score.toLocaleString()}</span>
            </div>
            {streak > 1 && (
              <div className="flex flex-col items-end">
                <span className="text-textdim text-xs tracking-widest">STREAK</span>
                <span className="text-accent2 leading-tight">×{streak}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Game content */}
      <main className="relative z-10 flex-1 max-w-2xl mx-auto w-full px-6">
        {children}
      </main>
    </div>
  );
}
