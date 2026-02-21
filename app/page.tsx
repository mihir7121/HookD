"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push("/game");
  }, [session, router]);

  const games = [
    {
      id: "album",
      num: "01",
      title: "Cover ID",
      desc: "An album cover appears. Name it before the clock runs out.",
      color: "accent",
      colorHex: "#c8ff00",
    },
    {
      id: "snippet",
      num: "02",
      title: "Sound Check",
      desc: "30 seconds. A snippet plays. Guess the track.",
      color: "accent2",
      colorHex: "#ff4060",
    },
    {
      id: "artist",
      num: "03",
      title: "Who's That?",
      desc: "A blurred artist photo slowly reveals itself. Name them.",
      color: "accent3",
      colorHex: "#9b59ff",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#c8ff00 1px, transparent 1px), linear-gradient(90deg, #c8ff00 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow center */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5"
          style={{
            background:
              "radial-gradient(circle, #c8ff00 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse-accent" />
          <span className="font-display text-2xl text-accent tracking-widest">
            EARWORM
          </span>
        </div>
        <span className="font-mono text-xs text-textdim tracking-widest uppercase">
          Music Trivia
        </span>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-20 text-center">
        <div className="mb-4 font-mono text-xs tracking-[0.4em] text-textdim uppercase animate-reveal">
          Three games. One obsession.
        </div>

        <h1
          className="font-display text-[clamp(72px,14vw,180px)] leading-none text-white tracking-wider animate-reveal"
          style={{ animationDelay: "0.1s", opacity: 0 }}
        >
          EARWORM
        </h1>

        <p
          className="font-body italic text-xl text-textmid max-w-md mt-4 animate-reveal"
          style={{ animationDelay: "0.2s", opacity: 0 }}
        >
          Test your musical knowledge through album art, song snippets, and
          artist silhouettes.
        </p>

        <div
          className="mt-12 animate-reveal"
          style={{ animationDelay: "0.35s", opacity: 0 }}
        >
          {status === "loading" ? (
            <div className="font-mono text-xs text-textdim tracking-widest animate-pulse">
              LOADING...
            </div>
          ) : (
            <button
              onClick={() => signIn("spotify")}
              className="group relative flex items-center gap-4 px-8 py-4 border border-accent bg-transparent text-accent font-mono text-sm tracking-widest uppercase transition-all hover:bg-accent hover:text-bg"
            >
              <SpotifyIcon />
              Connect with Spotify
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-accent/10" />
            </button>
          )}
        </div>

        <p
          className="mt-6 font-mono text-xs text-textdim animate-reveal"
          style={{ animationDelay: "0.45s", opacity: 0 }}
        >
          Uses your Spotify listening history for personalised games.
        </p>
      </section>

      {/* Games preview */}
      <section className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-px border-t border-border bg-border">
        {games.map((g) => (
          <div
            key={g.id}
            className="bg-bg p-8 flex flex-col gap-3 group hover:bg-bg2 transition-colors"
          >
            <div className="flex items-start justify-between">
              <span
                className="font-display text-5xl leading-none"
                style={{ color: g.colorHex }}
              >
                {g.num}
              </span>
              <span
                className="font-mono text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: g.colorHex }}
              >
                Available
              </span>
            </div>
            <h3
              className="font-display text-2xl tracking-wider"
              style={{ color: g.colorHex }}
            >
              {g.title}
            </h3>
            <p className="font-body italic text-textdim text-base leading-relaxed">
              {g.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-8 py-4 flex items-center justify-between">
        <span className="font-mono text-xs text-textdim">
          Powered by Spotify Web API
        </span>
        <span className="font-mono text-xs text-textdim">
          Your data stays yours.
        </span>
      </footer>
    </main>
  );
}

function SpotifyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
