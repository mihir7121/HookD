"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MOOD_OPTIONS } from "@/lib/discover";

type DiscoverTab = "trending" | "new";

type DiscoverEntry = {
  id: string;
  oneLiner: string;
  moodTags: string[];
  createdAt: string;
  upvotes: number;
  saves: number;
  opens: number;
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
  submitter: {
    name: string;
    image: string | null;
  };
};

const TAB_OPTIONS: { key: DiscoverTab; label: string; color: string }[] = [
  { key: "trending", label: "Trending", color: "#c8ff00" },
  { key: "new", label: "New", color: "#00cfff" },
];

export default function DiscoverPage() {
  const { status } = useSession();
  const router = useRouter();

  const [tab, setTab] = useState<DiscoverTab>("trending");
  const [selectedMood, setSelectedMood] = useState<string>("");
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<DiscoverEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [oneLinerInput, setOneLinerInput] = useState("");
  const [moodSelection, setMoodSelection] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const activeColor = useMemo(
    () => TAB_OPTIONS.find((option) => option.key === tab)?.color ?? "#c8ff00",
    [tab]
  );

  const fetchFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("tab", tab);
      if (selectedMood) params.set("mood", selectedMood);
      if (query.trim()) params.set("q", query.trim());
      const response = await fetch(`/api/discover/feed?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load feed");
      }
      setEntries(data.entries ?? []);
    } catch (err: any) {
      setError(err.message ?? "Failed to load discover feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      void fetchFeed();
    }
  }, [status, tab, selectedMood]);

  const handleSubmitPlaylist = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    setSubmitting(true);
    try {
      const response = await fetch("/api/discover/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlInput,
          oneLiner: oneLinerInput,
          moodTags: moodSelection,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Submission failed");
      }

      setUrlInput("");
      setOneLinerInput("");
      setMoodSelection([]);
      await fetchFeed();
    } catch (err: any) {
      setError(err.message ?? "Failed to submit playlist");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (submissionId: string) => {
    await fetch("/api/discover/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
    await fetchFeed();
  };

  const handleSave = async (submissionId: string) => {
    await fetch("/api/discover/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
    await fetchFeed();
  };

  const handleOpen = async (submissionId: string) => {
    await fetch("/api/discover/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
  };

  const handleReport = async (submissionId: string) => {
    await fetch("/api/discover/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, reason: "spam" }),
    });
  };

  const toggleMoodSelection = (mood: string) => {
    setMoodSelection((previous) => {
      if (previous.includes(mood)) {
        return previous.filter((item) => item !== mood);
      }
      if (previous.length >= 3) {
        return previous;
      }
      return [...previous, mood];
    });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <span className="font-mono text-xs text-textdim tracking-[0.25em] animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-bg text-white">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/game")}
              className="font-mono text-xs text-textdim hover:text-white tracking-[0.2em]"
            >
              ← BACK
            </button>
            <div className="w-px h-4 bg-border" />
            <div>
              <p className="font-mono text-[10px] text-textdim tracking-[0.22em]">COMMUNITY</p>
              <h1 className="font-display text-4xl leading-none" style={{ color: activeColor }}>
                DISCOVER
              </h1>
            </div>
          </div>
          <button
            onClick={() => router.push("/game/blind")}
            className="font-mono text-[11px] text-textdim hover:text-accent2 tracking-[0.2em] uppercase"
          >
            Blind Taste ↗
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex items-center gap-2 border-b border-border">
              {TAB_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setTab(option.key)}
                  className="px-4 py-2 border-b-2 -mb-px font-mono text-xs tracking-[0.2em] uppercase"
                  style={{
                    borderBottomColor: tab === option.key ? option.color : "transparent",
                    color: tab === option.key ? option.color : "#666",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search playlist or vibe"
                className="px-3 py-2 bg-bg2 border border-border text-sm font-mono text-textmid placeholder:text-textdim focus:outline-none focus:border-accent/40"
              />
              <button
                onClick={() => void fetchFeed()}
                className="px-3 py-2 border font-mono text-xs tracking-[0.18em]"
                style={{ borderColor: `${activeColor}60`, color: activeColor }}
              >
                SEARCH
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedMood("")}
              className="px-3 py-1.5 border font-mono text-[10px] tracking-[0.16em] uppercase"
              style={{
                borderColor: !selectedMood ? `${activeColor}70` : "#252530",
                color: !selectedMood ? activeColor : "#888",
              }}
            >
              All moods
            </button>
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                className="px-3 py-1.5 border font-mono text-[10px] tracking-[0.16em] uppercase"
                style={{
                  borderColor: selectedMood === mood ? `${activeColor}70` : "#252530",
                  color: selectedMood === mood ? activeColor : "#888",
                }}
              >
                {mood.replace("-", " ")}
              </button>
            ))}
          </div>

          {error && (
            <div className="border border-accent2/40 bg-accent2/10 p-3 font-mono text-xs text-accent2">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center font-mono text-xs text-textdim tracking-[0.2em]">LOADING FEED...</div>
          ) : entries.length === 0 ? (
            <div className="py-20 text-center border border-border bg-bg2">
              <p className="font-display text-3xl text-textdim mb-2">NO PLAYLISTS YET</p>
              <p className="font-body italic text-textmid">Submit the first playlist for this mood.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <article key={entry.id} className="border border-border bg-bg2 p-4 md:p-5">
                  <div className="flex items-start gap-4">
                    <img
                      src={entry.playlist.image ?? "https://i.scdn.co/image/ab67616d00001e02ff9ca10b55ce82ae553c8228"}
                      alt={entry.playlist.title}
                      className="w-20 h-20 object-cover bg-bg3"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="font-display text-3xl leading-none truncate">{entry.playlist.title}</h2>
                        <span className="font-mono text-[10px] text-textdim tracking-[0.18em] uppercase">
                          {entry.playlist.trackCount} tracks
                        </span>
                      </div>

                      <p className="font-body italic text-sm text-textmid mb-2">"{entry.oneLiner}"</p>

                      <div className="font-mono text-[11px] text-textdim mb-3">
                        by {entry.playlist.ownerName} · shared by {entry.submitter.name}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {entry.moodTags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 border border-border text-[10px] font-mono tracking-[0.14em] uppercase text-textdim"
                          >
                            {tag.replace("-", " ")}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        <a
                          href={entry.playlist.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => void handleOpen(entry.id)}
                          className="px-3 py-2 border font-mono text-xs tracking-[0.16em]"
                          style={{ borderColor: `${activeColor}60`, color: activeColor }}
                        >
                          OPEN IN SPOTIFY ↗
                        </a>
                        <button
                          onClick={() => void handleSave(entry.id)}
                          className="px-3 py-2 border border-border font-mono text-xs text-textmid tracking-[0.16em]"
                        >
                          {entry.hasSaved ? "SAVED" : "SAVE"} ({entry.saves})
                        </button>
                        <button
                          onClick={() => void handleVote(entry.id)}
                          className="px-3 py-2 border border-border font-mono text-xs text-textmid tracking-[0.16em]"
                        >
                          {entry.hasVoted ? "LIKED" : "LIKE"} ({entry.upvotes})
                        </button>
                        <button
                          onClick={() => void handleReport(entry.id)}
                          className="px-3 py-2 border border-border font-mono text-xs text-textdim tracking-[0.16em]"
                        >
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

        <aside className="space-y-4">
          <div className="border border-border bg-bg2 p-4">
            <h3 className="font-display text-3xl leading-none mb-3 text-accent">Submit Playlist</h3>
            <p className="font-mono text-[11px] text-textdim mb-4">Add a Spotify playlist with 1 to 3 moods.</p>

            <form onSubmit={handleSubmitPlaylist} className="space-y-3">
              <div>
                <label className="font-mono text-[10px] text-textdim tracking-[0.15em] uppercase">Spotify URL</label>
                <input
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  required
                  className="mt-1 w-full px-3 py-2 bg-bg border border-border font-mono text-xs text-textmid focus:outline-none focus:border-accent/50"
                  placeholder="https://open.spotify.com/playlist/..."
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-textdim tracking-[0.15em] uppercase">One-liner (20-100 chars)</label>
                <textarea
                  value={oneLinerInput}
                  onChange={(event) => setOneLinerInput(event.target.value)}
                  minLength={20}
                  maxLength={100}
                  required
                  className="mt-1 w-full px-3 py-2 bg-bg border border-border font-body italic text-sm text-textmid focus:outline-none focus:border-accent/50"
                  rows={3}
                  placeholder="Late-night synth wave for long city drives."
                />
              </div>

              <div>
                <label className="font-mono text-[10px] text-textdim tracking-[0.15em] uppercase">Moods (max 3)</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((mood) => {
                    const selected = moodSelection.includes(mood);
                    return (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => toggleMoodSelection(mood)}
                        className="px-2 py-1 border font-mono text-[10px] tracking-[0.13em] uppercase"
                        style={{
                          borderColor: selected ? "#c8ff00" : "#252530",
                          color: selected ? "#c8ff00" : "#888",
                          background: selected ? "rgba(200,255,0,0.08)" : "transparent",
                        }}
                      >
                        {mood.replace("-", " ")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || moodSelection.length < 1}
                className="w-full px-3 py-2 border font-mono text-xs tracking-[0.2em] disabled:opacity-50"
                style={{ borderColor: "#c8ff00", color: "#c8ff00" }}
              >
                {submitting ? "SUBMITTING..." : "SUBMIT"}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
}
