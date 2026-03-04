"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useGameStore } from "@/lib/store";
import { MOOD_OPTIONS } from "@/lib/discover";

const DISCOVER_COLOR = "#00cfff";

const games = [
  {
    id: "pixel",
    num: "01",
    title: "Pixel Panic",
    subtitle: "Album Cover Challenge",
    desc: "An album cover from your library starts as a pixelated blur and sharpens over 12 seconds. Identify it before time runs out — speed is points.",
    colorHex: "#c8ff00",
    points: "100–500 pts",
    difficulty: "MEDIUM",
    premium: false,
  },
  {
    id: "slide",
    num: "02",
    title: "Cover Slide",
    subtitle: "Tile Puzzle Challenge",
    desc: "Slide album art tiles into place before the clock expires. Choose 3x3, 5x5, or 7x7 and race for the cleanest solve.",
    colorHex: "#ff9f1c",
    points: "100–3600 pts",
    difficulty: "SCALING",
    premium: false,
  },
  {
    id: "blind",
    num: "03",
    title: "Blind Taste Test",
    subtitle: "Anonymous Clip Challenge",
    desc: "A 10-second clip from your own library plays — no hints. Guess the artist and whether it's a top-10 track. It humbles everyone.",
    colorHex: "#f472b6",
    points: "50–450 pts",
    difficulty: "BRUTAL",
    premium: true,
  },
];

interface PersonalBests {
  pixel: number | null;
  slide: number | null;
  blind: number | null;
}

type DiscoverEntry = {
  id: string;
  oneLiner: string;
  moodTags: string[];
  upvotes: number;
  saves: number;
  hasVoted: boolean;
  hasSaved: boolean;
  playlist: {
    id: string;
    spotifyPlaylistId: string;
    url: string;
    title: string;
    image: string | null;
    ownerName: string;
    trackCount: number;
  };
  submitter: { name: string; image: string | null };
};

export default function GameLobby() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { score, streak, resetScore } = useGameStore();
  const [bests, setBests] = useState<PersonalBests>({ pixel: null, slide: null, blind: null });
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.allSettled([
      fetch("/api/leaderboard?gameType=pixel").then((r) => r.json()),
      fetch("/api/leaderboard?gameType=slide").then((r) => r.json()),
      fetch("/api/leaderboard?gameType=blind").then((r) => r.json()),
    ]).then(([pixelRes, slideRes, blindRes]) => {
      setBests({
        pixel: pixelRes.status === "fulfilled" ? (pixelRes.value.myEntry?.score ?? null) : null,
        slide: slideRes.status === "fulfilled" ? (slideRes.value.myEntry?.score ?? null) : null,
        blind: blindRes.status === "fulfilled" ? (blindRes.value.myEntry?.score ?? null) : null,
      });
    });
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <span className="font-mono text-xs text-textdim tracking-[0.3em] animate-pulse">LOADING...</span>
      </div>
    );
  }

  const user = session?.user;

  return (
    <>
      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0) rotate(-15deg); }
          33% { transform: translate(60px, -40px) rotate(-20deg); }
          66% { transform: translate(-30px, 20px) rotate(-10deg); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0) rotate(20deg); }
          40% { transform: translate(-80px, 60px) rotate(15deg); }
          70% { transform: translate(40px, -20px) rotate(25deg); }
        }
        @keyframes drift3 {
          0%, 100% { transform: translate(0, 0) rotate(5deg); }
          50% { transform: translate(50px, 40px) rotate(0deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fu1 { animation: fadeUp 0.7s ease forwards; opacity: 0; }
        .fu2 { animation: fadeUp 0.7s 0.1s ease forwards; opacity: 0; }
        .fu3 { animation: fadeUp 0.7s 0.2s ease forwards; opacity: 0; }
        .card-in-1 { animation: cardIn 0.6s 0.2s ease forwards; opacity: 0; }
        .card-in-2 { animation: cardIn 0.6s 0.3s ease forwards; opacity: 0; }
        .card-in-3 { animation: cardIn 0.6s 0.4s ease forwards; opacity: 0; }
      `}</style>

      <main className="min-h-screen flex flex-col relative bg-bg overflow-x-hidden">

        {/* Ambient concert spotlights */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute w-[600px] h-[800px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(ellipse, #c8ff00 0%, transparent 70%)", top: "-200px", left: "-100px", animation: "drift1 18s ease-in-out infinite" }} />
          <div className="absolute w-[500px] h-[700px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(ellipse, #f472b6 0%, transparent 70%)", top: "-150px", right: "-80px", animation: "drift2 22s ease-in-out infinite" }} />
          <div className="absolute w-[700px] h-[500px] rounded-full opacity-[0.025]" style={{ background: "radial-gradient(ellipse, #9b59ff 0%, transparent 70%)", bottom: "0", left: "50%", transform: "translateX(-50%)", animation: "drift3 26s ease-in-out infinite" }} />
        </div>

        {/* Fixed nav */}
        <header
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5"
          style={{ background: "linear-gradient(to bottom, rgba(8,8,10,0.95) 0%, rgba(8,8,10,0.6) 70%, transparent 100%)" }}
        >
          <button onClick={() => router.push("/")} className="flex items-center gap-3 group">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse-accent" />
            <span className="font-display text-2xl text-accent tracking-widest group-hover:opacity-70 transition-opacity">HOOKD</span>
          </button>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 font-mono text-xs">
              <div className="flex flex-col items-end">
                <span className="text-textdim tracking-[0.2em] text-xs">SCORE</span>
                <span className="text-accent text-base leading-tight">{score.toLocaleString()}</span>
              </div>
              {streak > 1 && (
                <div className="flex flex-col items-end">
                  <span className="text-textdim tracking-[0.2em] text-xs">STREAK</span>
                  <span className="text-accent2 text-base leading-tight">×{streak}</span>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-border" />
            <button onClick={() => router.push("/leaderboard")} className="font-mono text-xs text-textdim hover:text-accent tracking-[0.2em] uppercase transition-colors">
              Leaderboard ↗
            </button>
            <div className="w-px h-6 bg-border" />

            <div className="flex items-center gap-3">
              {user?.image && (
                <button onClick={() => router.push("/profile")}>
                  <img src={user.image} alt={user.name || ""} className="w-7 h-7 rounded-full grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all" />
                </button>
              )}
              <div className="hidden md:flex flex-col">
                <button onClick={() => router.push("/profile")} className="font-mono text-xs text-textmid leading-tight hover:text-accent transition-colors text-left">
                  {user?.name}
                </button>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="font-mono text-xs text-textdim hover:text-accent2 text-left transition-colors">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="relative z-10 flex-1 pt-36 pb-24 px-6 max-w-7xl mx-auto w-full">

          {/* Section header */}
          <div className="mb-20 text-center">
            <div className="fu1 font-mono text-xs text-textdim tracking-[0.5em] uppercase mb-4">Choose your game</div>
            <h1 className="fu2 font-display leading-none tracking-wider text-white" style={{ fontSize: "clamp(52px, 8vw, 96px)" }}>
              WHAT ARE WE PLAYING?
            </h1>
            <p className="fu3 font-body italic text-textmid mt-4" style={{ fontSize: "clamp(15px, 1.8vw, 19px)" }}>
              Every game pulls from your personal Spotify listening history.
            </p>
          </div>

          {/* Game cards — 3 games */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto w-full">
            {games.map((g, i) => (
              <GameCard
                key={g.id}
                game={g}
                personalBest={bests[g.id as keyof PersonalBests]}
                hovered={hoveredGame === g.id}
                onHover={(id) => setHoveredGame(id)}
                onClick={() => router.push(`/game/${g.id}`)}
                animClass={`card-in-${i + 1}`}
              />
            ))}
          </div>

          {/* Reset score */}
          {score > 0 && (
            <div className="mt-12 text-center">
              <button onClick={resetScore} className="font-mono text-xs text-textdim hover:text-accent2 tracking-[0.3em] uppercase transition-colors">
                Reset score
              </button>
            </div>
          )}

          {/* Discover section divider */}
          <div className="mt-24 mb-12" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

          {/* Discover feed */}
          <DiscoverSection authenticated={status === "authenticated"} />
        </div>

        {/* Bottom gradient fade */}
        <div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(8,8,10,1) 0%, transparent 100%)", zIndex: 5 }} />
      </main>
    </>
  );
}

function GameCard({
  game,
  personalBest,
  hovered,
  onHover,
  onClick,
  animClass,
}: {
  game: (typeof games)[0];
  personalBest: number | null | undefined;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  animClass: string;
}) {
  const hex = game.colorHex;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(game.id)}
      onMouseLeave={() => onHover(null)}
      className={`group relative flex flex-col text-left p-8 overflow-hidden transition-all duration-500 ${animClass}`}
      style={{
        background: hovered ? `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)` : `rgba(16,16,21,0.6)`,
        border: `1px solid ${hovered ? hex + "40" : "rgba(37,37,48,0.8)"}`,
        backdropFilter: "blur(12px)",
        boxShadow: hovered ? `0 0 40px ${hex}18, 0 0 80px ${hex}08, inset 0 1px 0 rgba(255,255,255,0.06)` : `inset 0 1px 0 rgba(255,255,255,0.03)`,
        minHeight: "300px",
      }}
    >
      {/* Ambient glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none transition-opacity duration-500" style={{ background: `radial-gradient(circle, ${hex} 0%, transparent 70%)`, opacity: hovered ? 0.08 : 0.03, filter: "blur(20px)" }} />

      {/* Background number */}
      <span className="absolute -bottom-4 -right-2 font-display leading-none pointer-events-none select-none transition-opacity duration-500" style={{ fontSize: "clamp(100px, 12vw, 160px)", color: hex, opacity: hovered ? 0.12 : 0.05 }}>
        {game.num}
      </span>

      {/* Premium badge */}
      {game.premium && (
        <div className="absolute top-6 left-8 font-mono text-xs tracking-[0.25em] px-2 py-0.5 border" style={{ color: hex, borderColor: hex + "60", background: hex + "12" }}>
          PREMIUM
        </div>
      )}

      {/* Arrow */}
      <div className="absolute top-6 right-6 font-mono text-sm transition-all duration-300" style={{ color: hex, opacity: hovered ? 1 : 0, transform: hovered ? "translate(0,0)" : "translate(-6px, 0)" }}>
        →
      </div>

      {/* Content */}
      <div className={`flex-1 flex flex-col ${game.premium ? "mt-8" : ""}`}>
        <span className="font-mono text-xs tracking-[0.3em] mb-3 transition-opacity duration-300" style={{ color: hex, opacity: hovered ? 0.8 : 0.4 }}>
          {game.num} / 03
        </span>
        <h3 className="font-display tracking-wider leading-none mb-1 transition-all duration-300" style={{ color: hex, fontSize: "clamp(28px, 3.5vw, 40px)", textShadow: hovered ? `0 0 30px ${hex}60` : "none" }}>
          {game.title}
        </h3>
        <p className="font-mono text-xs text-textdim tracking-[0.25em] uppercase mb-5">{game.subtitle}</p>
        <p className="font-body italic text-textmid leading-relaxed flex-1" style={{ fontSize: "clamp(14px, 1.4vw, 16px)" }}>
          {game.desc}
        </p>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-5 flex items-end justify-between transition-colors duration-300" style={{ borderTop: `1px solid ${hovered ? hex + "30" : "rgba(37,37,48,0.6)"}` }}>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs text-textdim tracking-[0.25em]">POINTS</span>
          <span className="font-mono text-xs" style={{ color: hex }}>{game.points}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-xs text-textdim tracking-[0.25em]">
            {personalBest != null ? "BEST" : "DIFFICULTY"}
          </span>
          <span className="font-mono text-xs" style={{ color: hex }}>
            {personalBest != null ? personalBest.toLocaleString() : game.difficulty}
          </span>
        </div>
      </div>
    </button>
  );
}

function DiscoverSection({ authenticated }: { authenticated: boolean }) {
  const [tab, setTab] = useState<"trending" | "new">("trending");
  const [selectedMood, setSelectedMood] = useState("");
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<DiscoverEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [oneLinerInput, setOneLinerInput] = useState("");
  const [moodSelection, setMoodSelection] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (selectedMood) params.set("mood", selectedMood);
      if (query.trim()) params.set("q", query.trim());
      const res = await fetch(`/api/discover/feed?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load feed");
      setEntries(data.entries ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load discover feed");
    } finally {
      setLoading(false);
    }
  }, [tab, selectedMood, query]);

  useEffect(() => {
    if (authenticated) void fetchFeed();
  }, [authenticated, tab, selectedMood]);

  const handleVote = async (id: string) => {
    await fetch("/api/discover/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: id }) });
    void fetchFeed();
  };
  const handleSave = async (id: string) => {
    await fetch("/api/discover/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: id }) });
    void fetchFeed();
  };
  const handleOpen = async (id: string) => {
    await fetch("/api/discover/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: id }) });
  };
  const handleReport = async (id: string) => {
    await fetch("/api/discover/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: id, reason: "spam" }) });
  };

  const toggleMood = (mood: string) => {
    setMoodSelection((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : prev.length >= 3 ? prev : [...prev, mood]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/discover/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput, oneLiner: oneLinerInput, moodTags: moodSelection }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setUrlInput("");
      setOneLinerInput("");
      setMoodSelection([]);
      setShowSubmit(false);
      void fetchFeed();
    } catch (err: any) {
      setError(err.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      {/* Section header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="font-mono text-xs text-textdim tracking-[0.5em] uppercase mb-3">Community</div>
          <h2 className="font-display tracking-wider leading-none" style={{ fontSize: "clamp(40px, 6vw, 72px)", color: DISCOVER_COLOR }}>
            DISCOVER
          </h2>
          <p className="font-body italic mt-2" style={{ fontSize: "clamp(14px, 1.5vw, 17px)", color: "rgba(255,255,255,0.35)" }}>
            Community-curated playlists for any mood.
          </p>
        </div>
        <button
          onClick={() => setShowSubmit((s) => !s)}
          className="shrink-0 font-mono text-xs tracking-[0.18em] px-4 py-2.5 border transition-colors"
          style={{ borderColor: showSubmit ? `${DISCOVER_COLOR}80` : `${DISCOVER_COLOR}40`, color: DISCOVER_COLOR, background: showSubmit ? `${DISCOVER_COLOR}10` : "transparent" }}
        >
          {showSubmit ? "✕ CLOSE" : "+ SUBMIT PLAYLIST"}
        </button>
      </div>

      {/* Submit form */}
      {showSubmit && (
        <div className="mb-8 border border-border bg-bg2 p-6" style={{ borderColor: `${DISCOVER_COLOR}25` }}>
          <h3 className="font-display text-2xl leading-none mb-1" style={{ color: DISCOVER_COLOR }}>Submit a Playlist</h3>
          <p className="font-mono text-xs text-textdim mb-5">Add a Spotify playlist URL with up to 3 moods.</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="font-mono text-xs text-textdim tracking-[0.15em] uppercase">Spotify URL</label>
                <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} required className="mt-1.5 w-full px-3 py-2 bg-bg border border-border font-mono text-xs text-textmid placeholder:text-textdim focus:outline-none focus:border-accent/40" placeholder="https://open.spotify.com/playlist/..." />
              </div>
              <div>
                <label className="font-mono text-xs text-textdim tracking-[0.15em] uppercase">One-liner (20–100 chars)</label>
                <textarea value={oneLinerInput} onChange={(e) => setOneLinerInput(e.target.value)} minLength={20} maxLength={100} required rows={3} className="mt-1.5 w-full px-3 py-2 bg-bg border border-border font-body italic text-sm text-textmid placeholder:text-textdim focus:outline-none focus:border-accent/40" placeholder="Late-night synth wave for long city drives." />
              </div>
            </div>
            <div>
              <label className="font-mono text-xs text-textdim tracking-[0.15em] uppercase">Moods (max 3)</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((mood) => {
                  const selected = moodSelection.includes(mood);
                  return (
                    <button key={mood} type="button" onClick={() => toggleMood(mood)} className="px-2.5 py-1.5 border font-mono text-xs tracking-[0.13em] uppercase transition-colors" style={{ borderColor: selected ? DISCOVER_COLOR : "#252530", color: selected ? DISCOVER_COLOR : "#666", background: selected ? `${DISCOVER_COLOR}10` : "transparent" }}>
                      {mood.replace("-", " ")}
                    </button>
                  );
                })}
              </div>
              <button type="submit" disabled={submitting || moodSelection.length < 1} className="mt-4 w-full px-3 py-2.5 border font-mono text-xs tracking-[0.2em] disabled:opacity-40 transition-colors" style={{ borderColor: DISCOVER_COLOR, color: DISCOVER_COLOR }}>
                {submitting ? "SUBMITTING..." : "SUBMIT"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border shrink-0">
          {(["trending", "new"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="px-4 py-2 border-b-2 -mb-px font-mono text-xs tracking-[0.2em] uppercase transition-colors" style={{ borderBottomColor: tab === t ? DISCOVER_COLOR : "transparent", color: tab === t ? DISCOVER_COLOR : "#555" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Mood pills */}
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setSelectedMood("")} className="px-3 py-1.5 border font-mono text-xs tracking-[0.14em] uppercase transition-colors" style={{ borderColor: !selectedMood ? `${DISCOVER_COLOR}70` : "#252530", color: !selectedMood ? DISCOVER_COLOR : "#555" }}>
            All
          </button>
          {MOOD_OPTIONS.map((mood) => (
            <button key={mood} onClick={() => setSelectedMood(mood)} className="px-3 py-1.5 border font-mono text-xs tracking-[0.14em] uppercase transition-colors" style={{ borderColor: selectedMood === mood ? `${DISCOVER_COLOR}70` : "#252530", color: selectedMood === mood ? DISCOVER_COLOR : "#555" }}>
              {mood.replace("-", " ")}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 md:ml-auto">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void fetchFeed()} placeholder="Search playlists..." className="px-3 py-1.5 bg-bg2 border border-border font-mono text-xs text-textmid placeholder:text-textdim focus:outline-none focus:border-accent/40" />
          <button onClick={() => void fetchFeed()} className="px-3 py-1.5 border font-mono text-xs tracking-[0.18em] transition-colors" style={{ borderColor: `${DISCOVER_COLOR}50`, color: DISCOVER_COLOR }}>
            GO
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="border border-accent2/40 bg-accent2/10 p-3 font-mono text-xs text-accent2 mb-4">{error}</div>}

      {/* Feed */}
      {loading ? (
        <div className="py-16 text-center font-mono text-xs text-textdim tracking-[0.25em] animate-pulse">LOADING FEED...</div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center border border-border bg-bg2">
          <p className="font-display text-2xl text-textdim mb-2">NO PLAYLISTS YET</p>
          <p className="font-body italic text-textmid text-sm">Submit the first playlist for this mood.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <article key={entry.id} className="border border-border bg-bg2 p-4 md:p-5 transition-colors" style={{ borderColor: "rgba(37,37,48,0.8)" }}>
              <div className="flex items-start gap-4">
                <img
                  src={entry.playlist.image ?? "https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8228"}
                  alt={entry.playlist.title}
                  className="w-16 h-16 md:w-20 md:h-20 object-cover bg-bg3 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2 mb-1">
                    <h3 className="font-display text-2xl md:text-3xl leading-none truncate">{entry.playlist.title}</h3>
                    <span className="font-mono text-xs text-textdim tracking-[0.15em]">{entry.playlist.trackCount} tracks</span>
                  </div>
                  <p className="font-body italic text-sm text-textmid mb-1">"{entry.oneLiner}"</p>
                  <p className="font-mono text-xs text-textdim mb-3">
                    by {entry.playlist.ownerName} · shared by {entry.submitter.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {entry.moodTags.map((tag) => (
                      <span key={tag} className="px-2 py-1 border border-border font-mono text-xs tracking-[0.12em] uppercase text-textdim">
                        {tag.replace("-", " ")}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={entry.playlist.url} target="_blank" rel="noreferrer" onClick={() => void handleOpen(entry.id)} className="px-3 py-1.5 border font-mono text-xs tracking-[0.14em] transition-colors" style={{ borderColor: `${DISCOVER_COLOR}50`, color: DISCOVER_COLOR }}>
                      OPEN IN SPOTIFY ↗
                    </a>
                    <button onClick={() => void handleSave(entry.id)} className="px-3 py-1.5 border border-border font-mono text-xs text-textmid tracking-[0.14em] hover:border-border/80 transition-colors">
                      {entry.hasSaved ? "SAVED" : "SAVE"} ({entry.saves})
                    </button>
                    <button onClick={() => void handleVote(entry.id)} className="px-3 py-1.5 border border-border font-mono text-xs text-textmid tracking-[0.14em] hover:border-border/80 transition-colors">
                      {entry.hasVoted ? "LIKED" : "LIKE"} ({entry.upvotes})
                    </button>
                    <button onClick={() => void handleReport(entry.id)} className="px-3 py-1.5 border border-border font-mono text-xs text-textdim tracking-[0.14em] hover:border-border/80 transition-colors">
                      REPORT
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
