"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const GAME_META: Record<string, { label: string; color: string }> = {
  album: { label: "Cover ID", color: "#c8ff00" },
  snippet: { label: "Sound Check", color: "#ff4060" },
  artist: { label: "Who's That?", color: "#9b59ff" },
  match: { label: "Match Up", color: "#00cfff" },
  blind: { label: "Blind Taste", color: "#f472b6" },
};

const GAME_ORDER = ["album", "snippet", "artist", "match", "blind"];

type RecentSession = {
  gameType: string;
  score: number;
  roundsPlayed: number;
  correctAnswers: number;
  maxStreak: number;
  createdAt: string;
};

type SavedPlaylist = {
  submissionId: string;
  oneLiner: string;
  moodTags: string[];
  savedAt: string;
  playlist: {
    spotifyPlaylistId: string;
    url: string;
    title: string;
    image: string | null;
    ownerName: string;
    trackCount: number;
  };
};

type ProfileData = {
  user: { name: string | null; image: string | null };
  bestScores: Record<string, number>;
  recentSessions: RecentSession[];
  savedPlaylists: SavedPlaylist[];
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((err) => setError(err.message ?? "Failed to load profile"))
      .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <span className="font-mono text-xs text-textdim tracking-[0.25em] animate-pulse">LOADING...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="font-mono text-xs text-accent2">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const totalBest = Object.values(data.bestScores).reduce((sum, s) => sum + s, 0);

  return (
    <main className="min-h-screen bg-bg text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={() => router.push("/game")}
            className="font-mono text-xs text-textdim hover:text-white tracking-[0.2em]"
          >
            ← BACK
          </button>
          <div className="w-px h-4 bg-border" />
          <div>
            <p className="font-mono text-[10px] text-textdim tracking-[0.22em]">ACCOUNT</p>
            <h1 className="font-display text-4xl leading-none text-accent">PROFILE</h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* User card */}
        <section className="flex items-center gap-5">
          {data.user.image ? (
            <img
              src={data.user.image}
              alt={data.user.name ?? "User"}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-bg2 border border-border flex items-center justify-center font-display text-3xl text-textdim">
              {(data.user.name ?? "?")[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="font-display text-5xl leading-none">{data.user.name ?? "Anonymous"}</h2>
            <p className="font-mono text-[11px] text-textdim tracking-[0.18em] mt-1">
              TOTAL SCORE: <span className="text-accent">{totalBest.toLocaleString()}</span>
            </p>
          </div>
        </section>

        {/* Best scores per game */}
        <section>
          <h3 className="font-mono text-[11px] text-textdim tracking-[0.22em] uppercase mb-4">Best Scores</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {GAME_ORDER.map((gt) => {
              const meta = GAME_META[gt];
              const best = data.bestScores[gt];
              return (
                <div key={gt} className="border border-border bg-bg2 p-4">
                  <p className="font-mono text-[9px] tracking-[0.18em] uppercase mb-1" style={{ color: meta.color }}>
                    {meta.label}
                  </p>
                  <p className="font-display text-3xl leading-none" style={{ color: best ? meta.color : undefined }}>
                    {best !== undefined ? best.toLocaleString() : <span className="text-textdim text-xl">—</span>}
                  </p>
                  {best !== undefined && (
                    <p className="font-mono text-[9px] text-textdim mt-1 tracking-[0.12em]">PTS</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Saved playlists */}
          <section>
            <h3 className="font-mono text-[11px] text-textdim tracking-[0.22em] uppercase mb-4">
              Saved Playlists ({data.savedPlaylists.length})
            </h3>
            {data.savedPlaylists.length === 0 ? (
              <div className="border border-border bg-bg2 p-8 text-center">
                <p className="font-display text-3xl text-textdim mb-1">NOTHING SAVED</p>
                <p className="font-body italic text-sm text-textmid">
                  Save playlists from the Discover hub to see them here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.savedPlaylists.map((item) => (
                  <article key={item.submissionId} className="border border-border bg-bg2 p-4 flex items-start gap-4">
                    <img
                      src={
                        item.playlist.image ??
                        "https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8228"
                      }
                      alt={item.playlist.title}
                      className="w-16 h-16 object-cover bg-bg3 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display text-2xl leading-none truncate">{item.playlist.title}</h4>
                        <span className="font-mono text-[9px] text-textdim tracking-[0.15em]">
                          {item.playlist.trackCount} tracks
                        </span>
                      </div>
                      <p className="font-body italic text-sm text-textmid mb-2">"{item.oneLiner}"</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.moodTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 border border-border font-mono text-[9px] tracking-[0.12em] uppercase text-textdim"
                          >
                            {tag.replace("-", " ")}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={item.playlist.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] tracking-[0.16em] text-accent hover:text-white"
                        >
                          OPEN IN SPOTIFY ↗
                        </a>
                        <span className="font-mono text-[9px] text-textdim">{timeAgo(item.savedAt)}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Recent sessions */}
          <section>
            <h3 className="font-mono text-[11px] text-textdim tracking-[0.22em] uppercase mb-4">Recent Sessions</h3>
            {data.recentSessions.length === 0 ? (
              <div className="border border-border bg-bg2 p-6 text-center">
                <p className="font-display text-2xl text-textdim">NO SESSIONS YET</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentSessions.map((s, i) => {
                  const meta = GAME_META[s.gameType] ?? { label: s.gameType, color: "#888" };
                  const acc =
                    s.roundsPlayed > 0
                      ? Math.round((s.correctAnswers / s.roundsPlayed) * 100)
                      : 0;
                  return (
                    <div key={i} className="border border-border bg-bg2 px-4 py-3 flex items-center gap-3">
                      <div
                        className="w-1.5 h-10 rounded-full flex-shrink-0"
                        style={{ background: meta.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className="font-mono text-[10px] tracking-[0.14em] uppercase"
                            style={{ color: meta.color }}
                          >
                            {meta.label}
                          </p>
                          <span className="font-mono text-[9px] text-textdim">{timeAgo(s.createdAt)}</span>
                        </div>
                        <div className="flex items-baseline gap-3 mt-0.5">
                          <span className="font-display text-2xl leading-none">{s.score.toLocaleString()}</span>
                          <span className="font-mono text-[9px] text-textdim">
                            {acc}% · ×{s.maxStreak} streak
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
