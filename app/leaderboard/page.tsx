"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type GameType = "overall" | "blind";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  name: string;
  image: string | null;
  score: number;
  rounds_played: number;
  correct_answers: number;
  max_streak: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  myRank: number | null;
  myEntry: LeaderboardEntry | null;
}

const TABS: { key: GameType; label: string; color: string }[] = [
  { key: "overall", label: "Overall", color: "#c8ff00" },
  { key: "blind", label: "Blind Taste", color: "#f472b6" },
];

export default function LeaderboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<GameType>("overall");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    setData(null);
    fetch(`/api/leaderboard?gameType=${activeTab}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTab, status]);

  const activeColor = TABS.find((t) => t.key === activeTab)?.color ?? "#c8ff00";

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-mono text-xs text-textdim tracking-widest animate-pulse">
          LOADING...
        </span>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#9b59ff 1px, transparent 1px), linear-gradient(90deg, #9b59ff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Radial glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-5 transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse, ${activeColor} 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border bg-bg/80 backdrop-blur-sm sticky top-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/game")}
            className="font-mono text-xs text-textdim hover:text-text transition-colors tracking-widest"
          >
            ← BACK
          </button>
          <div className="w-px h-4 bg-border" />
          <span className="font-display text-xl tracking-widest" style={{ color: activeColor }}>
            LEADERBOARD
          </span>
        </div>
      </header>

      <div className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        {/* Tabs */}
        <div className="flex gap-1 mb-10 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-5 py-3 font-mono text-xs tracking-widest uppercase transition-all duration-200 border-b-2 -mb-px"
              style={{
                color: activeTab === tab.key ? tab.color : "#666",
                borderBottomColor: activeTab === tab.key ? tab.color : "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex flex-col items-center py-24 gap-4">
            <div
              className="w-12 h-12 border border-t-2 rounded-full animate-spin"
              style={{ borderColor: `${activeColor}30`, borderTopColor: activeColor }}
            />
            <span className="font-mono text-xs text-textdim tracking-widest">LOADING...</span>
          </div>
        )}

        {!loading && data && (
          <>
            {data.entries.length === 0 ? (
              <div className="text-center py-24">
                <p className="font-display text-3xl text-textdim mb-3">NO SCORES YET</p>
                <p className="font-body italic text-textmid">
                  Be the first to play and claim the top spot.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {data.entries.map((entry) => (
                  <Row
                    key={entry.user_id}
                    entry={entry}
                    color={activeColor}
                    isMe={data.myEntry?.user_id === entry.user_id}
                  />
                ))}

                {/* Show the user's own entry if they're outside top 20 */}
                {data.myEntry &&
                  !data.entries.some((e) => e.user_id === data.myEntry!.user_id) && (
                    <>
                      <div className="flex items-center gap-3 my-2">
                        <div className="flex-1 h-px border-t border-dashed border-border" />
                        <span className="font-mono text-[10px] text-textdim tracking-widest">
                          YOUR RANK
                        </span>
                        <div className="flex-1 h-px border-t border-dashed border-border" />
                      </div>
                      <Row
                        entry={data.myEntry}
                        color={activeColor}
                        isMe
                      />
                    </>
                  )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Row({
  entry,
  color,
  isMe,
}: {
  entry: LeaderboardEntry;
  color: string;
  isMe: boolean;
}) {
  const medal =
    entry.rank === 1 ? "01" : entry.rank === 2 ? "02" : entry.rank === 3 ? "03" : null;

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 border transition-all duration-200"
      style={{
        borderColor: isMe ? color + "60" : "#252530",
        backgroundColor: isMe ? color + "08" : "transparent",
      }}
    >
      {/* Rank */}
      <span
        className="font-display text-2xl w-8 text-right shrink-0"
        style={{ color: entry.rank <= 3 ? color : "#444" }}
      >
        {medal ?? entry.rank}
      </span>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-bg3 border border-border">
        {entry.image ? (
          <img
            src={entry.image}
            alt={entry.name}
            className="w-full h-full object-cover grayscale opacity-80"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-textdim">
            {entry.name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-text truncate">{entry.name}</span>
          {isMe && (
            <span
              className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border"
              style={{ color, borderColor: color + "60" }}
            >
              YOU
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-textdim">
          {entry.correct_answers}/{entry.rounds_played} correct · ×{entry.max_streak} streak
        </span>
      </div>

      {/* Accuracy */}
      <div className="hidden sm:flex flex-col items-end shrink-0">
        <span className="font-mono text-[10px] text-textdim tracking-widest">ACC</span>
        <span className="font-mono text-sm" style={{ color: isMe ? color : "#ccc" }}>
          {entry.rounds_played > 0
            ? `${Math.round((entry.correct_answers / entry.rounds_played) * 100)}%`
            : "—"}
        </span>
      </div>

      {/* Score */}
      <span
        className="font-display text-xl shrink-0"
        style={{ color: isMe ? color : "#ccc" }}
      >
        {entry.score.toLocaleString()}
      </span>
    </div>
  );
}
