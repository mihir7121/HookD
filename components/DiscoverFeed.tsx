"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { MOOD_OPTIONS } from "@/lib/discover";
import { TagSelect } from "@/components/TagSelect";

const COLOR = "#00cfff";

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

export function DiscoverFeed({ authenticated }: { authenticated: boolean }) {
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
  const [showMoodMenu, setShowMoodMenu] = useState(false);
  const [moodMenuSearch, setMoodMenuSearch] = useState("");
  const moodMenuRef = useRef<HTMLDivElement>(null);

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

  // Always fetch — no auth gate
  useEffect(() => {
    void fetchFeed();
  }, [tab, selectedMood]);

  const handleVote = async (id: string, currentlyVoted: boolean) => {
    if (!authenticated) { void signIn("spotify"); return; }
    await fetch("/api/discover/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: id, remove: currentlyVoted }) });
    void fetchFeed();
  };
  const handleSave = async (id: string, currentlySaved: boolean) => {
    if (!authenticated) { void signIn("spotify"); return; }
    await fetch("/api/discover/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: id, remove: currentlySaved }) });
    void fetchFeed();
  };
  const handleOpen = async (id: string) => {
    if (!authenticated) return;
    await fetch("/api/discover/open", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: id }) });
  };
  const handleReport = async (id: string) => {
    if (!authenticated) return;
    await fetch("/api/discover/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: id, reason: "spam" }) });
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
      setUrlInput(""); setOneLinerInput(""); setMoodSelection([]);
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
          <h2 className="font-display tracking-wider leading-none" style={{ fontSize: "clamp(40px, 6vw, 72px)", color: COLOR }}>
            DISCOVER
          </h2>
          <p className="font-body italic mt-2" style={{ fontSize: "clamp(14px, 1.5vw, 17px)", color: "rgba(255,255,255,0.35)" }}>
            Community-curated playlists for any mood.
          </p>
        </div>

        {authenticated ? (
          <button
            onClick={() => setShowSubmit((s) => !s)}
            className="shrink-0 font-mono text-xs tracking-[0.18em] px-4 py-2.5 border transition-colors"
            style={{ borderColor: showSubmit ? `${COLOR}80` : `${COLOR}40`, color: COLOR, background: showSubmit ? `${COLOR}10` : "transparent" }}
          >
            {showSubmit ? "✕ CLOSE" : "+ SUBMIT PLAYLIST"}
          </button>
        ) : (
          <button
            onClick={() => void signIn("spotify")}
            className="shrink-0 font-mono text-xs tracking-[0.18em] px-4 py-2.5 border transition-colors"
            style={{ borderColor: `${COLOR}30`, color: `${COLOR}70` }}
          >
            CONNECT TO SUBMIT ↗
          </button>
        )}
      </div>

      {/* Submit form (auth only) */}
      {authenticated && showSubmit && (
        <div className="mb-8 border border-border bg-bg2 p-6" style={{ borderColor: `${COLOR}25` }}>
          <h3 className="font-display text-2xl leading-none mb-1" style={{ color: COLOR }}>Submit a Playlist</h3>
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
              <div className="mt-2">
                <TagSelect
                  value={moodSelection}
                  onChange={setMoodSelection}
                  suggestions={MOOD_OPTIONS}
                  max={3}
                  color={COLOR}
                />
              </div>
              <button type="submit" disabled={submitting || moodSelection.length < 1} className="mt-4 w-full px-3 py-2.5 border font-mono text-xs tracking-[0.2em] disabled:opacity-40 transition-colors" style={{ borderColor: COLOR, color: COLOR }}>
                {submitting ? "SUBMITTING..." : "SUBMIT"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="flex items-center gap-0 border-b border-border shrink-0">
          {(["trending", "new"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="px-4 py-2 border-b-2 -mb-px font-mono text-xs tracking-[0.2em] uppercase transition-colors" style={{ borderBottomColor: tab === t ? COLOR : "transparent", color: tab === t ? COLOR : "#555" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Mood filter — inline for first 8, overflow goes into a searchable dropdown */}
        {(() => {
          const INLINE_LIMIT = 8;
          const inlineTags = MOOD_OPTIONS.slice(0, INLINE_LIMIT);
          const overflowTags = MOOD_OPTIONS.slice(INLINE_LIMIT);
          // If selected mood is in overflow, surface it inline so it's always visible
          const selectedInOverflow = selectedMood && overflowTags.includes(selectedMood);
          const menuFiltered = overflowTags.filter((m) =>
            m.includes(moodMenuSearch.toLowerCase().trim())
          );

          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {/* All */}
              <button
                onClick={() => setSelectedMood("")}
                className="px-3 py-1.5 border font-mono text-xs tracking-[0.14em] uppercase transition-colors"
                style={{ borderColor: !selectedMood ? `${COLOR}70` : "#252530", color: !selectedMood ? COLOR : "#555" }}
              >
                All
              </button>

              {/* First 8 inline */}
              {inlineTags.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className="px-3 py-1.5 border font-mono text-xs tracking-[0.14em] uppercase transition-colors"
                  style={{ borderColor: selectedMood === mood ? `${COLOR}70` : "#252530", color: selectedMood === mood ? COLOR : "#555" }}
                >
                  {mood.replace(/-/g, " ")}
                </button>
              ))}

              {/* Surface selected overflow tag inline */}
              {selectedInOverflow && (
                <button
                  onClick={() => setSelectedMood(selectedMood)}
                  className="px-3 py-1.5 border font-mono text-xs tracking-[0.14em] uppercase transition-colors"
                  style={{ borderColor: `${COLOR}70`, color: COLOR }}
                >
                  {selectedMood.replace(/-/g, " ")}
                </button>
              )}

              {/* Overflow dropdown */}
              {overflowTags.length > 0 && (
                <div ref={moodMenuRef} className="relative">
                  <button
                    onClick={() => {
                      setShowMoodMenu((s) => !s);
                      setMoodMenuSearch("");
                    }}
                    className="px-3 py-1.5 border font-mono text-xs tracking-[0.14em] uppercase transition-colors flex items-center gap-1.5"
                    style={{
                      borderColor: showMoodMenu || selectedInOverflow ? `${COLOR}70` : "#252530",
                      color: showMoodMenu || selectedInOverflow ? COLOR : "#555",
                    }}
                  >
                    {selectedInOverflow ? "1 active" : `+${overflowTags.length} more`}
                    <span style={{ fontSize: "9px", opacity: 0.7 }}>{showMoodMenu ? "▲" : "▼"}</span>
                  </button>

                  {showMoodMenu && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMoodMenu(false)}
                      />
                      <div
                        className="absolute left-0 top-full mt-1 z-50 border overflow-hidden"
                        style={{
                          background: "#0d0d10",
                          borderColor: `${COLOR}25`,
                          width: "200px",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        }}
                      >
                        {/* Search */}
                        <div style={{ borderBottom: `1px solid ${COLOR}15` }}>
                          <input
                            autoFocus
                            value={moodMenuSearch}
                            onChange={(e) => setMoodMenuSearch(e.target.value)}
                            placeholder="Search tags..."
                            className="w-full px-3 py-2 bg-transparent font-mono text-xs text-textmid placeholder:text-textdim focus:outline-none"
                          />
                        </div>

                        {/* Options */}
                        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {menuFiltered.length === 0 ? (
                            <p className="px-3 py-2 font-mono text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                              No matches
                            </p>
                          ) : (
                            menuFiltered.map((mood) => (
                              <button
                                key={mood}
                                onClick={() => {
                                  setSelectedMood(mood);
                                  setShowMoodMenu(false);
                                }}
                                className="w-full text-left px-3 py-2 font-mono text-xs tracking-[0.12em] uppercase hover:bg-white/5 transition-colors"
                                style={{ color: selectedMood === mood ? COLOR : "rgba(255,255,255,0.5)" }}
                              >
                                {selectedMood === mood && <span className="mr-1.5">✓</span>}
                                {mood.replace(/-/g, " ")}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex items-center gap-2 md:ml-auto">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void fetchFeed()} placeholder="Search playlists..." className="px-3 py-1.5 bg-bg2 border border-border font-mono text-xs text-textmid placeholder:text-textdim focus:outline-none focus:border-accent/40" />
          <button onClick={() => void fetchFeed()} className="px-3 py-1.5 border font-mono text-xs tracking-[0.18em] transition-colors" style={{ borderColor: `${COLOR}50`, color: COLOR }}>
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
          <p className="font-body italic text-textmid text-sm">Be the first to submit a playlist for this mood.</p>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={entry.playlist.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => void handleOpen(entry.id)}
                      className="px-3 py-1.5 border font-mono text-xs tracking-[0.14em] transition-colors"
                      style={{ borderColor: `${COLOR}50`, color: COLOR }}
                    >
                      OPEN IN SPOTIFY ↗
                    </a>

                    {authenticated ? (
                      <>
                        <button onClick={() => void handleSave(entry.id, entry.hasSaved)} className="px-3 py-1.5 border border-border font-mono text-xs tracking-[0.14em] hover:border-border/80 transition-colors flex items-center gap-1.5" style={{ color: entry.hasSaved ? COLOR : undefined }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill={entry.hasSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                          {entry.saves}
                        </button>
                        <button onClick={() => void handleVote(entry.id, entry.hasVoted)} className="px-3 py-1.5 border border-border font-mono text-xs tracking-[0.14em] hover:border-border/80 transition-colors flex items-center gap-1.5" style={{ color: entry.hasVoted ? "#f472b6" : undefined }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill={entry.hasVoted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                          {entry.upvotes}
                        </button>
                        <button onClick={() => void handleReport(entry.id)} className="px-3 py-1.5 border border-border font-mono text-xs text-textdim tracking-[0.14em] hover:border-border/80 transition-colors">
                          REPORT
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="font-mono text-xs tracking-[0.12em] flex items-center gap-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                          <span className="flex items-center gap-1">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            {entry.upvotes}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                            {entry.saves}
                          </span>
                        </span>
                        <button
                          onClick={() => void signIn("spotify")}
                          className="font-mono text-xs tracking-[0.14em] transition-colors"
                          style={{ color: `${COLOR}60` }}
                        >
                          Connect to vote ↗
                        </button>
                      </>
                    )}
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
