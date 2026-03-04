"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const GAMES = [
  {
    id: "blind",
    num: "01",
    title: "Blind Taste Test",
    tagline: "No labels. Just sound.",
    desc: "A 10-second clip from your own library plays — no hints. Guess the artist and whether it's a top-10 track. It humbles everyone.",
    color: "#f472b6",
    premium: true,
  },
  {
    id: "discover",
    num: "02",
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
        .game-row-line { transform: scaleX(0); transform-origin: left; transition: transform 0.5s cubic-bezier(0.16,1,0.3,1); }
        .game-row:hover .game-row-line { transform: scaleX(1); }
        .game-title-text { transition: color 0.3s ease; }
        .game-arrow { transition: transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease; }
        .game-row:hover .game-arrow { transform: translateX(6px); }
        .game-num-text { transition: opacity 0.3s ease; }
        .game-row:hover .game-num-text { opacity: 1 !important; }
      `}</style>

      <main className="min-h-screen bg-bg text-white overflow-x-hidden selection:bg-accent/20 selection:text-accent">

        {/* ── NOISE GRAIN (inherited from globals.css body::before) ── */}

        {/* ── NAVIGATION ── */}
        <nav
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-8 md:px-12 py-5"
          style={{
            background: "linear-gradient(to bottom, rgba(8,8,10,0.98) 0%, rgba(8,8,10,0) 100%)",
            backdropFilter: "blur(0px)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-accent" />
            <span className="font-display text-lg tracking-[0.22em] text-accent">HOOKD</span>
          </div>
          {status !== "loading" && (
            <button
              onClick={() => signIn("spotify")}
              className="nav-connect font-mono text-xs tracking-[0.18em] text-white/35 flex items-center gap-2"
            >
              <span className="hidden sm:inline">CONNECT SPOTIFY</span>
              <span className="text-white/20">↗</span>
            </button>
          )}
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

            <div className="fu4 mt-14">
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
                  TWO WAYS<br />TO LISTEN.
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

          {/* Game rows */}
          <div className="pb-28">
            {GAMES.map((g) => (
              <div
                key={g.id}
                className="game-row group px-8 md:px-16 py-9 cursor-default relative"
                style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}
                onMouseEnter={() => setHoveredGame(g.id)}
                onMouseLeave={() => setHoveredGame(null)}
              >
                {/* Hover background tint */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(ellipse at left center, ${g.color}07 0%, transparent 60%)`,
                    opacity: hoveredGame === g.id ? 1 : 0,
                  }}
                />

                <div className="relative flex items-start md:items-center justify-between gap-8">
                  {/* Left: number + title + desc */}
                  <div className="flex items-start md:items-center gap-6 md:gap-10 flex-1 min-w-0">
                    {/* Number */}
                    <span
                      className="game-num-text font-display text-4xl md:text-6xl shrink-0 transition-opacity duration-300"
                      style={{ color: g.color, opacity: 0.22 }}
                    >
                      {g.num}
                    </span>

                    {/* Title + desc */}
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                        <h3
                          className="game-title-text font-display tracking-wider whitespace-nowrap"
                          style={{
                            fontSize: "clamp(28px, 4.5vw, 54px)",
                            color: hoveredGame === g.id ? g.color : "#fff",
                            transition: "color 0.35s ease",
                          }}
                        >
                          {g.title}
                        </h3>
                        <span
                          className="font-mono text-xs tracking-[0.18em] hidden sm:block"
                          style={{ color: `${g.color}55` }}
                        >
                          {g.tagline}
                        </span>
                      </div>
                      <p
                        className="font-body italic text-base leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.32)", maxWidth: "480px" }}
                      >
                        {g.desc}
                      </p>
                    </div>
                  </div>

                  {/* Right: premium badge + arrow */}
                  <div className="flex items-center gap-3 shrink-0">
                    {g.premium && (
                      <span
                        className="hidden sm:block font-mono text-xs tracking-[0.2em] px-2.5 py-1 rounded-full"
                        style={{
                          border: `1px solid ${g.color}35`,
                          color: `${g.color}90`,
                          background: `${g.color}08`,
                        }}
                      >
                        PREMIUM
                      </span>
                    )}
                    <div
                      className="game-arrow w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-mono text-sm"
                      style={{
                        border: `1px solid ${hoveredGame === g.id ? g.color + "50" : "rgba(255,255,255,0.1)"}`,
                        color: hoveredGame === g.id ? g.color : "rgba(255,255,255,0.25)",
                        background: hoveredGame === g.id ? `${g.color}08` : "transparent",
                        transition: "border-color 0.3s ease, color 0.3s ease, background 0.3s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)",
                      }}
                    >
                      →
                    </div>
                  </div>
                </div>

                {/* Animated bottom line on hover */}
                <div
                  className="absolute bottom-0 left-8 md:left-16 right-8 md:right-16 h-px"
                  style={{
                    background: `linear-gradient(to right, ${g.color}40, transparent)`,
                    transform: hoveredGame === g.id ? "scaleX(1)" : "scaleX(0)",
                    transformOrigin: "left",
                    transition: "transform 0.5s cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            ))}
            {/* Closing rule */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }} />
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
              "Your Spotify history is the exam.{" "}
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

function SpotifyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
