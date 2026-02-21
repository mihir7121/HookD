"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/store";

const games = [
  {
    id: "album",
    num: "01",
    title: "Cover ID",
    subtitle: "Album Art Recognition",
    desc: "An album cover flashes on screen. Type the album name before time runs out. Faster answers = more points.",
    colorHex: "#c8ff00",
    glowClass: "glow-accent",
    points: "100–500 pts",
    difficulty: "MEDIUM",
  },
  {
    id: "snippet",
    num: "02",
    title: "Sound Check",
    subtitle: "Song Snippet Guessing",
    desc: "A 30-second clip from one of your top tracks plays. Identify the song title and artist. Streak multipliers apply.",
    colorHex: "#ff4060",
    glowClass: "glow-red",
    points: "150–600 pts",
    difficulty: "HARD",
  },
  {
    id: "artist",
    num: "03",
    title: "Who's That?",
    subtitle: "Artist Silhouette",
    desc: "An artist photo is heavily blurred and reveals itself over 10 seconds. The faster you guess, the more you score.",
    colorHex: "#9b59ff",
    glowClass: "glow-purple",
    points: "200–800 pts",
    difficulty: "HARD",
  },
  {
    id: "match",
    num: "04",
    title: "Match Up",
    subtitle: "Song-Artist Pairing",
    desc: "Five songs, five artists — all shuffled. Pair every song to its artist before the clock hits zero. Speed earns bonus points.",
    colorHex: "#ff8c00",
    glowClass: "glow-orange",
    points: "40–200 pts",
    difficulty: "EASY",
  },
  {
    id: "blind",
    num: "05",
    title: "Blind Taste Test",
    subtitle: "Anonymous Clip Challenge",
    desc: "A 10-second clip from your own library plays — no hints. Guess the artist, the era, and whether it's a top-10 track. It humbles everyone.",
    colorHex: "#f472b6",
    glowClass: "glow-pink",
    points: "50–350 pts",
    difficulty: "BRUTAL",
  },
];

interface PersonalBests {
  album: number | null;
  snippet: number | null;
  artist: number | null;
  match: number | null;
  blind: number | null;
}

export default function GameLobby() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { score, streak, resetScore } = useGameStore();
  const [bests, setBests] = useState<PersonalBests>({ album: null, snippet: null, artist: null, match: null, blind: null });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // Load personal bests once signed in
  useEffect(() => {
    if (status !== "authenticated") return;
    const gameTypes = ["album", "snippet", "artist", "match", "blind"] as const;
    Promise.all(
      gameTypes.map((gt) =>
        fetch(`/api/leaderboard?gameType=${gt}`)
          .then((r) => r.json())
          .then((data) => ({ gt, score: data.myEntry?.score ?? null }))
          .catch(() => ({ gt, score: null }))
      )
    ).then((results) => {
      const next: PersonalBests = { album: null, snippet: null, artist: null };
      for (const { gt, score } of results) next[gt] = score;
      setBests(next);
    });
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-mono text-xs text-textdim tracking-widest animate-pulse">
          LOADING...
        </span>
      </div>
    );
  }

  const user = session?.user;

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Background */}
      <div
        className="fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#9b59ff 1px, transparent 1px), linear-gradient(90deg, #9b59ff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border bg-bg/80 backdrop-blur-sm sticky top-0">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-3 group"
        >
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-accent" />
          <span className="font-display text-2xl text-accent tracking-widest group-hover:opacity-70 transition-opacity">
            EARWORM
          </span>
        </button>

        <div className="flex items-center gap-6">
          {/* Score display */}
          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="flex flex-col items-end">
              <span className="text-textdim tracking-widest">SCORE</span>
              <span className="text-accent text-lg leading-tight">
                {score.toLocaleString()}
              </span>
            </div>
            {streak > 1 && (
              <div className="flex flex-col items-end">
                <span className="text-textdim tracking-widest">STREAK</span>
                <span className="text-accent2 text-lg leading-tight">
                  ×{streak}
                </span>
              </div>
            )}
          </div>

          <div className="w-px h-8 bg-border" />

          {/* Leaderboard link */}
          <button
            onClick={() => router.push("/leaderboard")}
            className="font-mono text-xs text-textdim hover:text-accent tracking-widest uppercase transition-colors"
          >
            Leaderboard →
          </button>

          <div className="w-px h-8 bg-border" />

          {/* User */}
          <div className="flex items-center gap-3">
            {user?.image && (
              <img
                src={user.image}
                alt={user.name || ""}
                className="w-8 h-8 rounded-full grayscale opacity-70"
              />
            )}
            <div className="hidden md:flex flex-col">
              <span className="font-mono text-xs text-text leading-tight">
                {user?.name}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="font-mono text-[10px] text-textdim hover:text-accent2 text-left transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 px-6 py-16 max-w-6xl mx-auto w-full">
        <div className="mb-16 text-center">
          <div className="font-mono text-xs text-textdim tracking-[0.4em] uppercase mb-3">
            Choose your game
          </div>
          <h2 className="font-display text-6xl text-white tracking-wider">
            WHAT ARE WE PLAYING?
          </h2>
          <p className="font-body italic text-textmid mt-3 text-lg">
            All games pull from your personal Spotify listening history.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {games.map((g) => (
            <GameCard
              key={g.id}
              game={g}
              personalBest={bests[g.id as keyof PersonalBests]}
              onClick={() => router.push(`/game/${g.id}`)}
            />
          ))}
        </div>

        {score > 0 && (
          <div className="mt-12 text-center">
            <button
              onClick={resetScore}
              className="font-mono text-xs text-textdim hover:text-accent2 tracking-widest uppercase transition-colors"
            >
              Reset Score
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function GameCard({
  game,
  personalBest,
  onClick,
}: {
  game: (typeof games)[0];
  personalBest: number | null;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col text-left p-8 border border-border bg-bg2 hover:bg-bg3 transition-all duration-300 hover:border-opacity-60"
      style={
        {
          "--hover-color": game.colorHex,
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = game.colorHex + "40";
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${game.colorHex}10`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      {/* Number */}
      <span
        className="font-display text-7xl leading-none opacity-20 group-hover:opacity-40 transition-opacity"
        style={{ color: game.colorHex }}
      >
        {game.num}
      </span>

      <div className="mt-4 flex-1">
        <h3
          className="font-display text-3xl tracking-wider"
          style={{ color: game.colorHex }}
        >
          {game.title}
        </h3>
        <p className="font-mono text-[10px] text-textdim tracking-widest uppercase mt-1 mb-4">
          {game.subtitle}
        </p>
        <p className="font-body italic text-textmid text-base leading-relaxed">
          {game.desc}
        </p>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] text-textdim tracking-widest">
            POINTS
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: game.colorHex }}
          >
            {game.points}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-[10px] text-textdim tracking-widest">
            {personalBest !== null ? "BEST" : "DIFFICULTY"}
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: game.colorHex }}
          >
            {personalBest !== null ? personalBest.toLocaleString() : game.difficulty}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div
        className="absolute top-6 right-6 font-mono text-lg opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 duration-300"
        style={{ color: game.colorHex }}
      >
        →
      </div>
    </button>
  );
}
