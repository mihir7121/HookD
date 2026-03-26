"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { DiscoverFeed } from "@/components/DiscoverFeed";
import { TrendingCarousel } from "@/components/TrendingCarousel";

const GAMES = [
  {
    id: "pixel",
    num: "01",
    title: "Pixel Panic",
    tagline: "Album Cover Challenge.",
    desc: "An album cover from your library starts as a pixelated blur and sharpens over 12 seconds. Identify it before time runs out — speed is points.",
    color: "#c8ff00",
  },
  {
    id: "slide",
    num: "02",
    title: "Cover Slide",
    tagline: "Tile Puzzle Challenge.",
    desc: "Slide album art tiles into place before the clock expires. Choose 3×3, 5×5, or 7×7 and race for the cleanest solve.",
    color: "#ff9f1c",
  },
  {
    id: "blind",
    num: "03",
    title: "Blind Taste Test",
    tagline: "No labels. Just sound.",
    desc: "A 10-second clip from your own library plays — no hints. Guess the artist and whether it's a top-10 track. It humbles everyone.",
    color: "#f472b6",
    premium: true,
  },
  {
    id: "discover",
    num: "04",
    title: "Discover",
    tagline: "Community-curated playlists.",
    desc: "Browse and save playlists shared by the community. Filter by mood, vote on favourites, and find your next obsession.",
    color: "#00cfff",
  },
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  useEffect(() => {
    if (session) router.push("/game");
  }, [session, router]);

  return (
    <>
      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33%       { transform: translate(50px, -40px) scale(1.08); }
          66%       { transform: translate(-30px, 25px) scale(0.96); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(-50%, 0px) scale(1); }
          40%       { transform: translate(calc(-50% - 60px), 35px) scale(1.06); }
          70%       { transform: translate(calc(-50% + 40px), -25px) scale(1.1); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50%       { transform: translate(25px, 50px) scale(1.07); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scrollBounce {
          0%, 100% { transform: translateY(0) translateX(-50%); opacity: 0.4; }
          50%       { transform: translateY(6px) translateX(-50%); opacity: 0.8; }
        }
        @keyframes lineDraw {
          from { transform: scaleX(0); transform-origin: left; }
          to   { transform: scaleX(1); transform-origin: left; }
        }
        .fu1 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .fu2 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
        .fu3 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.30s both; }
        .fu4 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.44s both; }
        .fu5 { animation: fadeUp 0.9s cubic-bezier(0.16,1,0.3,1) 0.56s both; }
        .scroll-hint { animation: scrollBounce 2.4s ease-in-out infinite; }
        .cta-glow { transition: box-shadow 0.4s ease, background 0.3s ease; }
        .cta-glow:hover {
          box-shadow: 0 0 50px rgba(200,255,0,0.2), 0 0 100px rgba(200,255,0,0.07);
          background: rgba(200,255,0,0.08);
        }
        .nav-connect { transition: color 0.25s ease, opacity 0.25s ease; }
        .nav-connect:hover { color: #fff; }
        .game-card { transition: border-color 0.35s ease, background 0.35s ease, box-shadow 0.35s ease; }
        .game-card:hover { box-shadow: 0 0 60px rgba(0,0,0,0.4), inset 0 0 40px rgba(255,255,255,0.01); }
        .game-title-text { transition: color 0.35s ease; }
        .game-arrow { transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease, color 0.3s ease, background 0.3s ease; }
        .game-card:hover .game-arrow { transform: translateX(4px); }
        @keyframes pixelBlur {
          0%, 15%  { filter: blur(9px) brightness(0.55); }
          72%, 87% { filter: blur(0px) brightness(1); }
          100%     { filter: blur(9px) brightness(0.55); }
        }
        @keyframes waveBar1 { 0%,100%{height:6px}  50%{height:28px} }
        @keyframes waveBar2 { 0%,100%{height:22px} 50%{height:7px}  }
        @keyframes waveBar3 { 0%,100%{height:12px} 50%{height:34px} }
        @keyframes waveBar4 { 0%,100%{height:30px} 50%{height:10px} }
        @keyframes waveBar5 { 0%,100%{height:9px}  50%{height:24px} }
        @keyframes tileSlide {
          0%, 18%  { transform: translateY(0); }
          48%, 72% { transform: translateY(-37px); }
          88%,100% { transform: translateY(0); }
        }
        @keyframes discoverItem {
          0%,30%  { background: rgba(0,207,255,0.08); border-color: rgba(0,207,255,0.28); }
          36%,100%{ background: rgba(255,255,255,0.025); border-color: rgba(0,207,255,0.09); }
        }
      `}</style>

      <main className="min-h-screen bg-bg text-white overflow-x-hidden selection:bg-accent/20 selection:text-accent">

        {/* ── NOISE GRAIN (inherited from globals.css body::before) ── */}

        {/* ── NAVIGATION ── */}
        <nav
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 md:px-12 py-5"
          style={{
            background: "linear-gradient(to bottom, rgba(8,8,10,0.98) 0%, rgba(8,8,10,0) 100%)",
            backdropFilter: "blur(0px)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-accent" />
            <span className="font-display text-lg tracking-[0.22em] text-accent">HOOKD</span>
          </div>
          <div className="flex items-center gap-4 md:gap-7">
            <button
              onClick={() => router.push("/about")}
              className="nav-connect font-mono text-xs tracking-[0.18em] text-white/30 flex items-center gap-1.5"
            >
              <span>CREATED BY</span>
              <span className="text-white/15">↗</span>
            </button>
            {status !== "loading" && (
              <button
                onClick={() => signIn("spotify")}
                className="nav-connect font-mono text-xs tracking-[0.18em] text-white/35 flex items-center gap-2"
              >
                <span className="hidden sm:inline">CONNECT SPOTIFY</span>
                <span className="sm:hidden text-white/30">↗</span>
                <span className="hidden sm:inline text-white/20">↗</span>
              </button>
            )}
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">

          {/* Stage spotlights */}
          <div className="absolute inset-0 pointer-events-none">
            <div style={{
              position: "absolute", top: "-15%", left: "8%",
              width: "650px", height: "750px",
              background: "radial-gradient(ellipse, rgba(200,255,0,0.07) 0%, transparent 60%)",
              animation: "drift1 13s ease-in-out infinite",
              filter: "blur(24px)",
            }} />
            <div style={{
              position: "absolute", top: "15%", left: "50%",
              width: "700px", height: "600px",
              background: "radial-gradient(ellipse, rgba(155,89,255,0.06) 0%, transparent 60%)",
              animation: "drift2 17s ease-in-out infinite",
              filter: "blur(32px)",
            }} />
            <div style={{
              position: "absolute", top: "-8%", right: "5%",
              width: "550px", height: "650px",
              background: "radial-gradient(ellipse, rgba(255,64,96,0.05) 0%, transparent 60%)",
              animation: "drift3 15s ease-in-out infinite",
              filter: "blur(28px)",
            }} />
            {/* Floor fade */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "35%",
              background: "linear-gradient(to top, #08080a 0%, transparent 100%)",
            }} />
            {/* Top fade */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "20%",
              background: "linear-gradient(to bottom, #08080a 0%, transparent 100%)",
            }} />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            <p className="fu1 font-mono text-xs tracking-[0.5em] uppercase mb-10"
              style={{ color: "rgba(255,255,255,0.22)" }}>
              Spotify · Your Music · Your History
            </p>

            <h1
              className="fu2 font-display leading-none text-white"
              style={{
                fontSize: "clamp(88px, 17vw, 210px)",
                letterSpacing: "0.09em",
                textShadow: "0 0 140px rgba(200,255,0,0.07), 0 0 60px rgba(200,255,0,0.04)",
              }}
            >
              HOOKD
            </h1>

            <p
              className="fu3 font-body italic mt-5 max-w-xs md:max-w-sm leading-relaxed"
              style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "rgba(255,255,255,0.38)" }}
            >
              Your Spotify history. Your music knowledge. Find out what you actually know.
            </p>

            <div className="fu4 mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {status === "loading" ? (
                <div className="font-mono text-xs tracking-widest animate-pulse" style={{ color: "rgba(255,255,255,0.2)" }}>
                  LOADING...
                </div>
              ) : (
                <button
                  onClick={() => signIn("spotify")}
                  className="cta-glow group flex items-center gap-4 px-10 py-4 font-mono text-xs tracking-[0.2em] uppercase text-accent"
                  style={{
                    border: "1px solid rgba(200,255,0,0.28)",
                    background: "rgba(200,255,0,0.04)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 0 30px rgba(200,255,0,0.09), inset 0 0 30px rgba(200,255,0,0.02)",
                  }}
                >
                  <SpotifyIcon />
                  Connect with Spotify
                  <span
                    className="transition-transform duration-300 group-hover:translate-x-1"
                    style={{ color: "rgba(200,255,0,0.4)" }}
                  >
                    →
                  </span>
                </button>
              )}
              <a
                href="#discover"
                className="cta-glow group flex items-center gap-4 px-10 py-4 font-mono text-xs tracking-[0.2em] uppercase"
                style={{
                  border: "1px solid rgba(0,207,255,0.28)",
                  background: "rgba(0,207,255,0.04)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 0 30px rgba(0,207,255,0.09), inset 0 0 30px rgba(0,207,255,0.02)",
                  color: "#00cfff",
                }}
              >
                Browse community playlists
                <span
                  className="transition-transform duration-300 group-hover:translate-y-1"
                  style={{ color: "rgba(0,207,255,0.4)" }}
                >
                  ↓
                </span>
              </a>
            </div>

            <p className="fu5 mt-5 font-mono text-xs tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.18)" }}>
              Uses your Spotify listening history · No data stored without consent
            </p>
          </div>

          {/* Scroll cue */}
          <div
            className="scroll-hint absolute bottom-10 left-1/2 flex flex-col items-center gap-2"
            style={{ transform: "translateX(-50%)" }}
          >
            <div
              className="w-px h-8"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.18))" }}
            />
            <span className="font-mono text-xs tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.18)" }}>
              SCROLL
            </span>
          </div>
        </section>

        {/* ── TRENDING ── */}
        <TrendingCarousel />

        {/* ── DISCOVER ── */}
        <section
          id="discover"
          className="relative px-8 md:px-16 pb-24"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="pt-24 max-w-7xl mx-auto">
            <DiscoverFeed authenticated={!!session} />
          </div>
        </section>

        {/* ── GAMES ── */}
        <section className="relative">
          {/* Section header */}
          <div
            className="px-8 md:px-16 pt-28 pb-16"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p
                  className="font-mono text-xs tracking-[0.45em] mb-4 uppercase"
                  style={{ color: "rgba(255,255,255,0.22)" }}
                >
                  The Games
                </p>
                <h2
                  className="font-display leading-none text-white"
                  style={{ fontSize: "clamp(48px, 8vw, 96px)", letterSpacing: "0.06em" }}
                >
                  FOUR WAYS<br />TO LISTEN.
                </h2>
              </div>
              <p
                className="hidden md:block font-body italic text-lg leading-relaxed max-w-[280px] text-right"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                Each game draws from your top Spotify tracks. Nothing generic. Everything personal.
              </p>
            </div>
          </div>

          {/* Game cards */}
          <div className="px-8 md:px-16 pb-28 grid grid-cols-1 md:grid-cols-2 gap-5">
            {GAMES.map((g) => (
              <div
                key={g.id}
                className="game-card relative flex flex-col cursor-default overflow-hidden"
                style={{
                  border: `1px solid ${hoveredGame === g.id ? g.color + "30" : "rgba(255,255,255,0.07)"}`,
                  background: hoveredGame === g.id ? `${g.color}06` : "rgba(255,255,255,0.015)",
                  minHeight: "380px",
                }}
                onMouseEnter={() => setHoveredGame(g.id)}
                onMouseLeave={() => setHoveredGame(null)}
              >
                {/* Ambient glow */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(ellipse at top left, ${g.color}0a 0%, transparent 65%)`,
                    opacity: hoveredGame === g.id ? 1 : 0,
                  }}
                />

                {/* Animated preview */}
                <GamePreview id={g.id} color={g.color} />

                {/* Card content */}
                <div className="relative flex flex-col flex-1 p-7">
                  {/* Top row: number + premium badge */}
                  <div className="flex items-start justify-between mb-5">
                    <span
                      className="font-display text-5xl md:text-6xl transition-opacity duration-300"
                      style={{ color: g.color, opacity: hoveredGame === g.id ? 0.55 : 0.2 }}
                    >
                      {g.num}
                    </span>
                    {g.premium && (
                      <span
                        className="font-mono text-xs tracking-[0.2em] px-2.5 py-1 rounded-full"
                        style={{
                          border: `1px solid ${g.color}35`,
                          color: `${g.color}90`,
                          background: `${g.color}08`,
                        }}
                      >
                        PREMIUM
                      </span>
                    )}
                  </div>

                  {/* Title + tagline + desc */}
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <h3
                        className="game-title-text font-display tracking-wider"
                        style={{
                          fontSize: "clamp(26px, 3vw, 40px)",
                          color: hoveredGame === g.id ? g.color : "#fff",
                        }}
                      >
                        {g.title}
                      </h3>
                      <span
                        className="font-mono text-xs tracking-[0.18em]"
                        style={{ color: `${g.color}60` }}
                      >
                        {g.tagline}
                      </span>
                    </div>
                    <p
                      className="font-body italic text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.32)" }}
                    >
                      {g.desc}
                    </p>
                  </div>

                  {/* Bottom: arrow */}
                  <div className="flex justify-end mt-6">
                    <div
                      className="game-arrow w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm"
                      style={{
                        border: `1px solid ${hoveredGame === g.id ? g.color + "50" : "rgba(255,255,255,0.1)"}`,
                        color: hoveredGame === g.id ? g.color : "rgba(255,255,255,0.25)",
                        background: hoveredGame === g.id ? `${g.color}08` : "transparent",
                      }}
                    >
                      →
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── STATEMENT ── */}
        <section className="relative py-36 px-8 md:px-16 overflow-hidden">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 60%, rgba(200,255,0,0.04) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <p
              className="font-mono text-xs tracking-[0.5em] uppercase mb-10"
              style={{ color: "rgba(255,255,255,0.2)" }}
            >
              The Philosophy
            </p>
            <blockquote
              className="font-body italic leading-tight"
              style={{
                fontSize: "clamp(28px, 5.5vw, 64px)",
                color: "rgba(255,255,255,0.78)",
              }}
            >
              "Your Spotify history is the syllabus.{" "}
              <span style={{ color: "#c8ff00" }}>HookD</span> is the test."
            </blockquote>
            <div
              className="mx-auto mt-10 h-px max-w-xs"
              style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent)" }}
            />
            <p
              className="mt-10 font-mono text-xs tracking-[0.22em] leading-loose max-w-sm mx-auto"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              Every game is built around the music you actually listen to.
              No stock playlists. No generic questions.
            </p>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="relative py-40 px-8 text-center overflow-hidden">
          {/* Up-light glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 100%, rgba(200,255,0,0.06) 0%, transparent 55%)",
            }}
          />
          <div className="relative z-10 flex flex-col items-center gap-10">
            <h2
              className="font-display text-white leading-none"
              style={{
                fontSize: "clamp(64px, 13vw, 160px)",
                letterSpacing: "0.1em",
                textShadow: "0 0 120px rgba(200,255,0,0.06)",
              }}
            >
              READY?
            </h2>
            <p className="font-body italic text-xl" style={{ color: "rgba(255,255,255,0.3)" }}>
              Your listening history awaits.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {status !== "loading" && (
                <button
                  onClick={() => signIn("spotify")}
                  className="cta-glow group flex items-center gap-4 px-12 py-5 font-mono text-sm tracking-[0.2em] uppercase text-accent"
                  style={{
                    border: "1px solid rgba(200,255,0,0.28)",
                    background: "rgba(200,255,0,0.04)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 0 40px rgba(200,255,0,0.1), inset 0 0 30px rgba(200,255,0,0.02)",
                  }}
                >
                  <SpotifyIcon />
                  Connect with Spotify
                  <span
                    className="transition-transform duration-300 group-hover:translate-x-1"
                    style={{ color: "rgba(200,255,0,0.4)" }}
                  >
                    →
                  </span>
                </button>
              )}
              <a
                href="#discover"
                className="cta-glow group flex items-center gap-4 px-12 py-5 font-mono text-sm tracking-[0.2em] uppercase"
                style={{
                  border: "1px solid rgba(0,207,255,0.28)",
                  background: "rgba(0,207,255,0.04)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 0 40px rgba(0,207,255,0.1), inset 0 0 30px rgba(0,207,255,0.02)",
                  color: "#00cfff",
                }}
              >
                Browse community playlists
                <span
                  className="transition-transform duration-300 group-hover:translate-y-1"
                  style={{ color: "rgba(0,207,255,0.4)" }}
                >
                  ↓
                </span>
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer
          className="px-8 md:px-16 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-accent opacity-60" />
            <span className="font-display text-sm tracking-[0.2em] text-accent opacity-60">HOOKD</span>
          </div>
          <div
            className="flex items-center gap-6 font-mono text-xs tracking-[0.18em]"
            style={{ color: "rgba(255,255,255,0.18)" }}
          >
            <span>Powered by Spotify Web API</span>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
            <span>Your data stays yours</span>
          </div>
        </footer>
      </main>
    </>
  );
}

function GamePreview({ id, color }: { id: string; color: string }) {
  const wrap: React.CSSProperties = {
    width: "100%",
    height: "140px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    background: "rgba(0,0,0,0.22)",
  };

  if (id === "pixel") {
    const blocks = [
      "#1a3010","#5a8a35","#c8ff00","#2d4a1e",
      "#3d6b28","#a5d63c","#8bc34a","#1f3a14",
      "#c8ff00","#1a2e0f","#4e7a23","#6aa831",
      "#2d4a1e","#8bc34a","#1f3a14","#5a8a35",
    ];
    return (
      <div style={wrap}>
        <div style={{ animation: "pixelBlur 4s ease-in-out infinite" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 22px)", gridTemplateRows: "repeat(4, 22px)", gap: "3px" }}>
            {blocks.map((c, i) => <div key={i} style={{ background: c, borderRadius: "2px" }} />)}
          </div>
        </div>
        <span style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "monospace", fontSize: "8px", letterSpacing: "0.22em", color: `${color}50` }}>
          SHARPENING...
        </span>
      </div>
    );
  }

  if (id === "slide") {
    const tiles: (number | null)[] = [1, 2, null, 4, 5, 6, 7, 8, 3];
    return (
      <div style={wrap}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 34px)", gridTemplateRows: "repeat(3, 34px)", gap: "3px" }}>
          {tiles.map((t, i) =>
            t === null ? (
              <div key={i} style={{ borderRadius: "3px", border: `1px dashed ${color}20`, background: "transparent" }} />
            ) : (
              <div key={i} style={{
                borderRadius: "3px",
                background: i === 5 ? `${color}22` : "rgba(255,255,255,0.06)",
                border: `1px solid ${i === 5 ? color + "45" : "rgba(255,255,255,0.1)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "monospace", fontSize: "11px",
                color: i === 5 ? color : "rgba(255,255,255,0.28)",
                animation: i === 5 ? "tileSlide 3.5s ease-in-out infinite" : "none",
                position: "relative", zIndex: i === 5 ? 2 : 1,
              }}>
                {t}
              </div>
            )
          )}
        </div>
        <span style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "monospace", fontSize: "8px", letterSpacing: "0.22em", color: `${color}50` }}>
          SLIDE TO SOLVE
        </span>
      </div>
    );
  }

  if (id === "blind") {
    const bars = [
      { w: "waveBar1", d: "0s" }, { w: "waveBar3", d: "0.1s" }, { w: "waveBar5", d: "0.2s" },
      { w: "waveBar2", d: "0.05s" }, { w: "waveBar4", d: "0.3s" }, { w: "waveBar1", d: "0.15s" },
      { w: "waveBar3", d: "0.25s" }, { w: "waveBar5", d: "0.4s" }, { w: "waveBar2", d: "0.1s" },
      { w: "waveBar4", d: "0.35s" }, { w: "waveBar1", d: "0.05s" }, { w: "waveBar3", d: "0.2s" },
    ];
    return (
      <div style={wrap}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height: "50px" }}>
          {bars.map((b, i) => (
            <div key={i} style={{
              width: "4px", height: "10px",
              background: color, opacity: 0.5, borderRadius: "2px",
              animation: `${b.w} ${1.1 + (i % 3) * 0.2}s ease-in-out ${b.d} infinite`,
            }} />
          ))}
        </div>
        <span style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "monospace", fontSize: "8px", letterSpacing: "0.22em", color: `${color}50` }}>
          10s CLIP
        </span>
      </div>
    );
  }

  // discover
  const items = [
    { label: "Late Night Vibes", sub: "94 saves", delay: "0s" },
    { label: "Indie Essentials", sub: "218 saves", delay: "-6s" },
    { label: "Focus Mode",       sub: "156 saves", delay: "-3s" },
  ];
  return (
    <div style={wrap}>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "190px" }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "6px 10px", borderRadius: "3px",
            border: `1px solid ${color}09`,
            animation: `discoverItem 9s linear ${item.delay} infinite`,
          }}>
            <span style={{ fontFamily: "monospace", fontSize: "9px", letterSpacing: "0.05em", color: "rgba(255,255,255,0.38)" }}>
              {item.label}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "8px", letterSpacing: "0.1em", color: `${color}60` }}>
              {item.sub}
            </span>
          </div>
        ))}
      </div>
      <span style={{ position: "absolute", bottom: 8, right: 10, fontFamily: "monospace", fontSize: "8px", letterSpacing: "0.22em", color: `${color}50` }}>
        COMMUNITY
      </span>
    </div>
  );
}

function SpotifyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
