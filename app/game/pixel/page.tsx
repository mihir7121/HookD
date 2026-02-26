"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getTopTracks, getTopArtists, shuffle } from "@/lib/spotify";
import { useGameStore } from "@/lib/store";
import GameLayout from "@/components/GameLayout";
import ScorePopup from "@/components/ScorePopup";

const COLOR = "#c8ff00";
const TOTAL_ROUNDS = 8;
const ROUND_TIME = 12;
const MAX_GENRES = 3;

type Phase = "loading_genres" | "genre_select" | "loading_tracks" | "ingame" | "ended";

interface PixelAlbum {
  id: string;
  name: string;
  image: string;
  artistName: string;
}

interface PixelRound {
  album: PixelAlbum;
  options: string[]; // 4 album names
}

interface RoundResult {
  correct: boolean;
  pts: number;
  responseTime: number; // seconds
}

function prettifyGenre(g: string): string {
  return g.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function calcPixelSize(elapsed: number): number {
  // Exponential: 4px at t=0, ~224px at t=ROUND_TIME
  return Math.round(4 * Math.pow(56, elapsed / ROUND_TIME));
}

export default function PixelPanic() {
  const { data: session } = useSession();
  const router = useRouter();
  const { addPoints, endStreak, maxStreak } = useGameStore();

  const [phase, setPhase] = useState<Phase>("loading_genres");
  const [genres, setGenres] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [rounds, setRounds] = useState<PixelRound[]>([]);
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [chosen, setChosen] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [roundPts, setRoundPts] = useState<number | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [popupPts, setPopupPts] = useState<number | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sessionScoreRef = useRef(0);
  const correctCountRef = useRef(0);
  const savedRef = useRef(false);
  const submittedRef = useRef(false);
  const timeLeftRef = useRef(ROUND_TIME);

  const accessToken = (session as any)?.accessToken as string | undefined;

  // ── Load genres ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const data = await getTopArtists(accessToken, 50);
        const genreCount = new Map<string, number>();
        for (const artist of data.items ?? []) {
          for (const g of artist.genres ?? []) {
            genreCount.set(g, (genreCount.get(g) ?? 0) + 1);
          }
        }
        const topGenres = Array.from(genreCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 24)
          .map(([g]) => g);
        setGenres(topGenres);
        setPhase("genre_select");
      } catch {
        // fallback: skip genre select, go straight to loading tracks with no genre filter
        setSelectedGenres([]);
        setPhase("loading_tracks");
      }
    })();
  }, [accessToken]);

  // ── Build rounds from tracks ──────────────────────────────────────────────────
  const buildRounds = useCallback(
    async (genreFilter: string[]) => {
      if (!accessToken) return;
      setPhase("loading_tracks");
      setLoadError(null);
      try {
        const [artistsData, tracksData] = await Promise.all([
          getTopArtists(accessToken, 50),
          getTopTracks(accessToken, 50),
        ]);

        const artists: any[] = artistsData.items ?? [];
        const tracks: any[] = tracksData.items ?? [];

        // Build unique album map
        const albumMap = new Map<string, PixelAlbum>();
        for (const track of tracks) {
          const id = track.album?.id;
          if (id && !albumMap.has(id)) {
            albumMap.set(id, {
              id,
              name: track.album.name,
              image: track.album.images?.[0]?.url ?? "",
              artistName: track.artists?.[0]?.name ?? "",
            });
          }
        }
        const allAlbums = Array.from(albumMap.values());

        if (allAlbums.length < 4) {
          setLoadError("Not enough albums in your Spotify history. Play more music and try again!");
          setPhase("genre_select");
          return;
        }

        let pool: PixelAlbum[];
        if (genreFilter.length > 0) {
          const genreArtistIds = new Set(
            artists
              .filter((a: any) => a.genres?.some((g: string) => genreFilter.includes(g)))
              .map((a: any) => a.id)
          );
          const matching = tracks
            .filter((t: any) => genreArtistIds.has(t.artists?.[0]?.id))
            .map((t: any) => t.album?.id)
            .filter((id: string, i: number, arr: string[]) => id && arr.indexOf(id) === i)
            .map((id: string) => albumMap.get(id)!)
            .filter(Boolean);
          pool = matching.length >= 4 ? matching : allAlbums;
        } else {
          pool = allAlbums;
        }

        const shuffledPool = shuffle(pool);
        const gameAlbums = shuffledPool.slice(0, TOTAL_ROUNDS);

        const builtRounds: PixelRound[] = gameAlbums.map((album) => {
          const distractors = shuffle(allAlbums.filter((a) => a.id !== album.id)).slice(0, 3);
          return {
            album,
            options: shuffle([album.name, ...distractors.map((d) => d.name)]),
          };
        });

        setRounds(builtRounds);
        setRound(0);
        setRoundResults([]);
        sessionScoreRef.current = 0;
        correctCountRef.current = 0;
        savedRef.current = false;
        setSessionScore(0);
        setPhase("ingame");
      } catch {
        setLoadError("Failed to load your tracks. Please try again.");
        setPhase("genre_select");
      }
    },
    [accessToken]
  );

  // ── Setup each round ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "ingame" || rounds.length === 0) return;
    submittedRef.current = false;
    setSubmitted(false);
    setChosen(null);
    setRoundPts(null);
    setTimeLeft(ROUND_TIME);
    timeLeftRef.current = ROUND_TIME;
  }, [round, phase, rounds.length]);

  // ── Submit answer ─────────────────────────────────────────────────────────────
  const doSubmit = useCallback(
    (pick: string | null, timeRemaining: number, currentRound: PixelRound) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitted(true);

      const correct = pick === currentRound.album.name;
      const pts = correct
        ? 100 + Math.floor(400 * (timeRemaining / ROUND_TIME))
        : 0;
      const responseTime = ROUND_TIME - timeRemaining;

      if (correct) {
        addPoints(pts);
        sessionScoreRef.current += pts;
        setSessionScore(sessionScoreRef.current);
        correctCountRef.current++;
        setPopupPts(pts);
        setTimeout(() => setPopupPts(null), 1200);
      } else {
        endStreak();
      }

      setRoundPts(pts);
      setRoundResults((prev) => [...prev, { correct, pts, responseTime }]);
    },
    [addPoints, endStreak]
  );

  // ── Countdown ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "ingame" || submitted || rounds.length === 0) return;
    const currentRound = rounds[round];
    if (!currentRound) return;

    if (timeLeft <= 0) {
      doSubmit(chosen, 0, currentRound);
      return;
    }
    const t = setTimeout(() => {
      const next = timeLeft - 1;
      timeLeftRef.current = next;
      setTimeLeft(next);
    }, 1000);
    return () => clearTimeout(t);
  }, [timeLeft, phase, submitted, round, rounds, chosen, doSubmit]);

  // ── Save session ──────────────────────────────────────────────────────────────
  const doSave = async () => {
    if (savedRef.current || sessionScoreRef.current === 0) return;
    savedRef.current = true;
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: "pixel",
          score: sessionScoreRef.current,
          roundsPlayed: TOTAL_ROUNDS,
          correctAnswers: correctCountRef.current,
          maxStreak,
        }),
      });
    } catch (e) {
      console.error("Failed to save session:", e);
    }
  };

  // ── Next round / end ──────────────────────────────────────────────────────────
  const handleNext = () => {
    const nextRound = round + 1;
    if (nextRound >= rounds.length) {
      doSave();
      setPhase("ended");
    } else {
      setRound(nextRound);
    }
  };

  // ── Back ──────────────────────────────────────────────────────────────────────
  const handleBack = async () => {
    await doSave();
    router.push("/game");
  };

  // ── Handle choice ─────────────────────────────────────────────────────────────
  const handleChoice = (opt: string) => {
    if (submitted) return;
    setChosen(opt);
    doSubmit(opt, timeLeftRef.current, rounds[round]);
  };

  // ── Phase: loading ────────────────────────────────────────────────────────────
  if (phase === "loading_genres" || phase === "loading_tracks") {
    const text = phase === "loading_genres" ? "LOADING YOUR GENRES..." : "BUILDING YOUR GAME...";
    return (
      <GameLayout title="Pixel Panic" color={COLOR} onBack={handleBack}>
        <LoadingState text={text} color={COLOR} />
      </GameLayout>
    );
  }

  // ── Phase: genre select ───────────────────────────────────────────────────────
  if (phase === "genre_select") {
    return (
      <GameLayout title="Pixel Panic" color={COLOR} onBack={() => router.push("/game")}>
        <div className="flex flex-col items-center py-12 px-4 w-full max-w-lg mx-auto gap-8">
          <div className="text-center">
            <p
              className="font-display text-3xl tracking-widest mb-2"
              style={{ color: COLOR }}
            >
              PICK YOUR GENRES
            </p>
            <p className="font-body italic text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Select up to {MAX_GENRES} genres to pull album covers from.
            </p>
            {loadError && (
              <p className="font-mono text-xs mt-3" style={{ color: "#ff4060" }}>
                {loadError}
              </p>
            )}
          </div>

          {genres.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {genres.map((g) => {
                const active = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => {
                      setSelectedGenres((prev) =>
                        active
                          ? prev.filter((x) => x !== g)
                          : prev.length < MAX_GENRES
                          ? [...prev, g]
                          : prev
                      );
                    }}
                    className="px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] transition-all duration-150 rounded-full"
                    style={{
                      background: active ? `${COLOR}20` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${active ? COLOR + "80" : "rgba(255,255,255,0.1)"}`,
                      color: active ? COLOR : "rgba(255,255,255,0.45)",
                      opacity: !active && selectedGenres.length >= MAX_GENRES ? 0.35 : 1,
                    }}
                  >
                    {prettifyGenre(g)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="font-mono text-xs text-textdim">No genres found — we&apos;ll use your full library.</p>
          )}

          <button
            onClick={() => buildRounds(selectedGenres)}
            disabled={genres.length > 0 && selectedGenres.length === 0}
            className="w-full max-w-xs py-4 font-mono text-xs tracking-[0.2em] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${COLOR}30, ${COLOR}15)`,
              border: `1px solid ${COLOR}60`,
              color: COLOR,
              boxShadow: `0 0 32px ${COLOR}20`,
            }}
          >
            {selectedGenres.length === 0 && genres.length > 0
              ? "SELECT AT LEAST 1 GENRE"
              : `START GAME${selectedGenres.length > 0 ? ` · ${selectedGenres.length} GENRE${selectedGenres.length > 1 ? "S" : ""}` : ""} →`}
          </button>
        </div>
      </GameLayout>
    );
  }

  // ── Phase: ended ──────────────────────────────────────────────────────────────
  if (phase === "ended") {
    const totalRoundsPlayed = roundResults.length;
    const correctCount = roundResults.filter((r) => r.correct).length;
    const accuracy = totalRoundsPlayed > 0 ? Math.round((correctCount / totalRoundsPlayed) * 100) : 0;
    const avgResponse =
      totalRoundsPlayed > 0
        ? (roundResults.reduce((sum, r) => sum + r.responseTime, 0) / totalRoundsPlayed).toFixed(1)
        : "—";
    const bestRound = Math.max(0, ...roundResults.map((r) => r.pts));

    return (
      <GameLayout title="Pixel Panic" color={COLOR} onBack={() => router.push("/game")}>
        <div className="flex flex-col items-center gap-6 py-12 px-4 w-full max-w-sm mx-auto">
          <p className="font-display text-2xl tracking-widest" style={{ color: COLOR }}>
            GAME OVER
          </p>

          {/* Total score */}
          <div
            className="w-full rounded-2xl p-6 text-center"
            style={{ background: `${COLOR}0a`, border: `1px solid ${COLOR}25` }}
          >
            <p
              className="font-mono text-[10px] tracking-[0.2em] mb-2"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              TOTAL SCORE
            </p>
            <p className="font-display text-5xl" style={{ color: COLOR }}>
              {sessionScore.toLocaleString()}
            </p>
          </div>

          {/* Stats grid */}
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
              <StatCell label="ACCURACY" value={`${accuracy}%`} color={accuracy >= 50 ? COLOR : "#ff4060"} />
              <StatCell label="AVG RESPONSE" value={`${avgResponse}s`} color="rgba(255,255,255,0.6)" />
              <StatCell label="BEST ROUND" value={bestRound > 0 ? `${bestRound} pts` : "—"} color={COLOR} />
              <StatCell label="CORRECT" value={`${correctCount}/${totalRoundsPlayed}`} color="rgba(255,255,255,0.6)" />
            </div>
          </div>

          {/* Selected genres */}
          {selectedGenres.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {selectedGenres.map((g) => (
                <span
                  key={g}
                  className="px-2.5 py-1 font-mono text-[9px] tracking-[0.12em] rounded-full"
                  style={{ background: `${COLOR}15`, border: `1px solid ${COLOR}30`, color: COLOR }}
                >
                  {prettifyGenre(g)}
                </span>
              ))}
            </div>
          )}

          {/* CTAs */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => {
                setSelectedGenres([]);
                setPhase("genre_select");
              }}
              className="w-full py-4 font-mono text-xs tracking-[0.2em] rounded-2xl transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${COLOR}30, ${COLOR}15)`,
                border: `1px solid ${COLOR}60`,
                color: COLOR,
                boxShadow: `0 0 32px ${COLOR}20`,
              }}
            >
              PLAY AGAIN →
            </button>
            <button
              onClick={() => router.push("/game")}
              className="w-full py-3.5 font-mono text-xs tracking-[0.2em] rounded-2xl transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              BACK TO LOBBY
            </button>
          </div>
        </div>
      </GameLayout>
    );
  }

  // ── Phase: ingame ─────────────────────────────────────────────────────────────
  const currentRound = rounds[round];
  if (!currentRound) return null;

  const elapsed = ROUND_TIME - timeLeft;
  const pixelSize = submitted ? 224 : calcPixelSize(elapsed);
  const urgent = timeLeft <= 4 && !submitted;

  return (
    <GameLayout
      title="Pixel Panic"
      color={COLOR}
      onBack={handleBack}
      stats={{
        round: round + 1,
        correct: correctCountRef.current,
        total: round + (submitted ? 1 : 0),
      }}
    >
      <div className="flex flex-col items-center gap-5 py-8 w-full max-w-xl mx-auto px-4">
        {/* Album + timer */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Pixelated album art */}
          <div className="relative">
            <div
              className="absolute -inset-6 rounded-[2rem] pointer-events-none transition-opacity duration-700"
              style={{
                background: `radial-gradient(ellipse, ${COLOR}35 0%, transparent 70%)`,
                opacity: submitted ? 0.6 : 0.15,
                filter: "blur(16px)",
              }}
            />
            <div
              className="relative rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                width: 224,
                height: 224,
                boxShadow: submitted
                  ? `0 0 50px ${COLOR}30, 0 24px 64px rgba(0,0,0,0.7)`
                  : "0 12px 48px rgba(0,0,0,0.6)",
              }}
            >
              <PixelatedImage
                src={currentRound.album.image}
                pixelSize={pixelSize}
                displaySize={224}
              />
              {submitted && (
                <div
                  className="absolute bottom-0 left-0 right-0 px-3 pt-8 pb-3"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)" }}
                >
                  <p className="font-display text-sm text-white leading-tight truncate">
                    {currentRound.album.name}
                  </p>
                  <p className="font-mono text-[10px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {currentRound.album.artistName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Round counter */}
          <div
            className="font-mono text-[10px] tracking-[0.2em] px-3 py-1 rounded-full"
            style={{ background: `${COLOR}15`, border: `1px solid ${COLOR}30`, color: COLOR }}
          >
            ROUND {round + 1} / {rounds.length}
          </div>

          {/* Timer bar */}
          <div className="w-full">
            <div
              className="flex justify-between font-mono text-[10px] mb-2"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <span className="tracking-[0.15em]">{submitted ? "REVEALED" : "GUESS THE ALBUM"}</span>
              <span style={{ color: urgent ? "#ff4060" : "rgba(255,255,255,0.35)" }}>
                {submitted ? "—" : `${timeLeft}s`}
              </span>
            </div>
            <div className="h-[2px] w-full rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: submitted ? "0%" : `${(timeLeft / ROUND_TIME) * 100}%`,
                  background: urgent
                    ? "linear-gradient(90deg, #c0203a, #ff4060)"
                    : `linear-gradient(90deg, ${COLOR}bb, ${COLOR})`,
                  boxShadow: submitted ? "none" : `0 0 10px ${urgent ? "#ff406055" : COLOR + "45"}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* MCQ options */}
        {!submitted && (
          <div className="w-full grid grid-cols-2 gap-2">
            {currentRound.options.map((opt) => (
              <AlbumOption
                key={opt}
                label={opt}
                chosen={chosen === opt}
                disabled={submitted}
                color={COLOR}
                onClick={() => handleChoice(opt)}
              />
            ))}
          </div>
        )}

        {/* Post-submit reveal */}
        {submitted && roundPts !== null && (
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}
          >
            <div className="p-5 flex flex-col gap-4">
              {/* Result row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{
                      background: roundPts > 0 ? `${COLOR}20` : "rgba(255,64,96,0.15)",
                      color: roundPts > 0 ? COLOR : "#ff4060",
                    }}
                  >
                    {roundPts > 0 ? "✓" : "✗"}
                  </div>
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {roundPts > 0 ? "CORRECT" : chosen ? "WRONG" : "TIME OUT"}
                    </p>
                    {chosen && chosen !== currentRound.album.name && (
                      <p className="font-mono text-[9px]" style={{ color: "rgba(255,64,96,0.7)" }}>
                        You picked: {chosen}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className="font-display text-2xl"
                  style={{ color: roundPts > 0 ? COLOR : "rgba(255,64,96,0.55)" }}
                >
                  {roundPts > 0 ? `+${roundPts}` : "—"}
                </span>
              </div>

              <button
                onClick={handleNext}
                className="w-full py-3.5 font-mono text-xs tracking-[0.15em] rounded-xl transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${COLOR}25, ${COLOR}10)`,
                  border: `1px solid ${COLOR}45`,
                  color: COLOR,
                  boxShadow: `0 0 24px ${COLOR}18`,
                }}
              >
                {round + 1 >= rounds.length ? "SEE RESULTS →" : "NEXT ROUND →"}
              </button>
            </div>
          </div>
        )}
      </div>

      {popupPts && <ScorePopup points={popupPts} color={COLOR} />}
    </GameLayout>
  );
}

// ── PixelatedImage ────────────────────────────────────────────────────────────

function PixelatedImage({
  src,
  pixelSize,
  displaySize = 224,
}: {
  src: string;
  pixelSize: number;
  displaySize?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    imgRef.current = null;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
    };
    img.onerror = () => {
      const img2 = new Image();
      img2.onload = () => {
        imgRef.current = img2;
        setLoaded(true);
      };
      img2.src = src;
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (!loaded || !imgRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ps = Math.max(2, Math.round(pixelSize));

    if (ps >= displaySize) {
      ctx.imageSmoothingEnabled = true;
      ctx.clearRect(0, 0, displaySize, displaySize);
      ctx.drawImage(imgRef.current, 0, 0, displaySize, displaySize);
      return;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = ps;
    offscreen.height = ps;
    const octx = offscreen.getContext("2d")!;
    octx.imageSmoothingEnabled = true;
    octx.drawImage(imgRef.current, 0, 0, ps, ps);

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, displaySize, displaySize);
    ctx.drawImage(offscreen, 0, 0, displaySize, displaySize);
  }, [loaded, pixelSize, displaySize]);

  return (
    <canvas
      ref={canvasRef}
      width={displaySize}
      height={displaySize}
      style={{ display: "block", width: displaySize, height: displaySize }}
    />
  );
}

// ── AlbumOption ───────────────────────────────────────────────────────────────

function AlbumOption({
  label,
  chosen,
  disabled,
  color,
  onClick,
}: {
  label: string;
  chosen: boolean;
  disabled: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-3 text-left font-mono text-[11px] transition-all duration-150 disabled:cursor-default rounded-xl hover:brightness-110 active:scale-[0.98] line-clamp-2"
      style={{
        background: chosen ? `${color}1a` : "rgba(255,255,255,0.05)",
        border: `1px solid ${chosen ? color + "aa" : "rgba(255,255,255,0.07)"}`,
        color: chosen ? color : "rgba(255,255,255,0.55)",
        boxShadow: chosen ? `0 0 18px ${color}28` : "none",
        backdropFilter: "blur(8px)",
        minHeight: "3.5rem",
      }}
    >
      {label}
    </button>
  );
}

// ── StatCell ──────────────────────────────────────────────────────────────────

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-3 gap-1">
      <span className="font-mono text-[9px] tracking-[0.15em]" style={{ color: "rgba(255,255,255,0.3)" }}>
        {label}
      </span>
      <span className="font-display text-xl leading-none" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

// ── LoadingState ──────────────────────────────────────────────────────────────

function LoadingState({ text, color }: { text: string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-5">
      <div
        className="w-14 h-14 rounded-full animate-spin"
        style={{
          border: `2px solid ${color}15`,
          borderTopColor: color,
          boxShadow: `0 0 20px ${color}25`,
        }}
      />
      <span className="font-mono text-[10px] tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.25)" }}>
        {text}
      </span>
    </div>
  );
}
