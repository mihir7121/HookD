"use client";

import { useEffect, useState } from "react";

export interface DiscoveryItem {
  id: string;
  name: string;
  subtitle: string;
  imageUrl: string;
  spotifyUrl: string;
}

interface Props {
  items: DiscoveryItem[];
  label: string;
  color: string;
  onNext: () => void;
  autoAdvanceSec?: number;
  extraContent?: React.ReactNode;
}

export default function DiscoveryPanel({
  items,
  label,
  color,
  onNext,
  autoAdvanceSec = 30,
  extraContent,
}: Props) {
  const [timeLeft, setTimeLeft] = useState(autoAdvanceSec);

  useEffect(() => {
    setTimeLeft(autoAdvanceSec);
  }, [autoAdvanceSec]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onNext();
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, onNext]);

  const placeholders = items.length === 0 ? [0, 1, 2] : [];

  return (
    <div className="w-full max-w-lg animate-reveal">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="font-mono text-xs tracking-widest uppercase"
          style={{ color }}
        >
          {label}
        </span>
        <button
          onClick={onNext}
          className="font-mono text-xs text-textdim hover:text-textmid transition-colors flex items-center gap-1"
        >
          NEXT <span style={{ color }}>{timeLeft}s</span> →
        </button>
      </div>

      {/* Countdown bar */}
      <div className="h-px bg-border w-full mb-4">
        <div
          className="h-px transition-all duration-1000"
          style={{
            width: `${(timeLeft / autoAdvanceSec) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-3">
        {items.length > 0
          ? items.map((item) => (
              <DiscoveryCard key={item.id} item={item} color={color} />
            ))
          : placeholders.map((i) => <SkeletonCard key={i} color={color} />)}
      </div>

      {/* Extra content slot (e.g. top tracks) */}
      {extraContent && (
        <div className="mt-4 border-t border-border pt-4">{extraContent}</div>
      )}
    </div>
  );
}

function DiscoveryCard({ item, color }: { item: DiscoveryItem; color: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full aspect-square overflow-hidden bg-bg3">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-bg3" />
        )}
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span
          className="font-mono text-xs leading-tight line-clamp-2"
          style={{ color: "#ccc" }}
        >
          {item.name}
        </span>
        {item.subtitle && (
          <span className="font-mono text-xs text-textdim truncate">
            {item.subtitle}
          </span>
        )}
        <a
          href={item.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs mt-0.5 hover:underline transition-opacity opacity-70 hover:opacity-100"
          style={{ color }}
          onClick={(e) => e.stopPropagation()}
        >
          Open ↗
        </a>
      </div>
    </div>
  );
}

function SkeletonCard({ color }: { color: string }) {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      <div className="w-full aspect-square bg-bg3" />
      <div className="h-2 bg-bg3 rounded w-4/5" />
      <div className="h-2 bg-bg3 rounded w-3/5" />
      <div
        className="h-2 rounded w-2/5"
        style={{ backgroundColor: `${color}20` }}
      />
    </div>
  );
}
