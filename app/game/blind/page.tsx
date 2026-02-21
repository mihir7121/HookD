"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getTopTracks, shuffle } from "@/lib/spotify";
import { useGameStore } from "@/lib/store";
import GameLayout from "@/components/GameLayout";
import ScorePopup from "@/components/ScorePopup";

const COLOR = "#f472b6";
const ROUND_TIME = 25; // 10s clip + 15s to answer
const CLIP_LENGTH_MS = 10_000;
const CLIP_START_MS = 30_000; // Start 30s into the track to hit the chorus
const PTS_SONG_MAX = 250;
const PTS_SONG_MIN = 75;
const PTS_ARTIST_MAX = 150;
const PTS_ARTIST_MIN = 50;
const PTS_YEAR_MAX = 100;
const PTS_TOP10 = 50; // flat, no time scaling

const YEAR_RANGES = [
  { label: "Before 2015", min: 0, max: 2014 },
  { label: "2015 – 2018", min: 2015, max: 2018 },
  { label: "2019 – 2022", min: 2019, max: 2022 },
  { label: "2023 or later", min: 2023, max: 9999 },
] as const;

interface BlindTrack {
  id: string;
  uri: string;
  name: string;
  artistName: string;
  releaseYear: number;
  topRank: number; // 1-indexed position in top 50
  isTop10: boolean;
  albumImage: string;
  songOptions: string[];   // 4 shuffled song title choices
  artistOptions: string[]; // 4 shuffled artist choices
}

function yearBucket(year: number): string {
  return (
    YEAR_RANGES.find((r) => year >= r.min && year <= r.max)?.label ??
    YEAR_RANGES[YEAR_RANGES.length - 1].label
  );
}

function hookLine(
  track: BlindTrack,
  songCorrect: boolean,
  artistCorrect: boolean,
  yearCorrect: boolean,
  top10Correct: boolean
): string {
  const r = track.topRank;
  const rankStr =
    r === 1
      ? "your most played track"
      : r <= 3
      ? `your #${r} most played track`
      : r <= 10
      ? `a top-10 track for you (#${r})`
      : `your #${r} most played track`;

  if (songCorrect && artistCorrect && yearCorrect && top10Correct) {
    return `${rankStr[0].toUpperCase()}${rankStr.slice(1)}. Perfect round.`;
  }
  if (!songCorrect && !artistCorrect) {
    return `${rankStr[0].toUpperCase()}${rankStr.slice(1)} — and you still missed it.`;
  }
  if (songCorrect && !artistCorrect) {
    return `You knew the song, but not who made it.`;
  }
  if (!songCorrect && artistCorrect && yearCorrect && top10Correct) {
    return `You knew everything except the title. Embarrassing.`;
  }
  if (!songCorrect && artistCorrect) {
    return `You know the artist — but not this track.`;
  }
  if (yearCorrect && top10Correct) {
    return `${rankStr[0].toUpperCase()}${rankStr.slice(1)}. You really know your music.`;
  }
  if (!yearCorrect && artistCorrect) {
    return `You knew the artist — but not when they made it.`;
  }
  return `Artist right, but the details still got you.`;
}

export default function BlindGame() {
  const { data: session } = useSession();
  const router = useRouter();
  const { addPoints, endStreak, maxStreak } = useGameStore();

  const [tracks, setTracks] = useState<BlindTrack[]>([]);
  const [current, setCurrent] = useState<BlindTrack | null>(null);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notPremium, setNotPremium] = useState(false);

  // Per-round answers
  const [songGuess, setSongGuess] = useState<string | null>(null);
  const [artistGuess, setArtistGuess] = useState<string | null>(null);
  const [yearGuess, setYearGuess] = useState<string | null>(null);
  const [top10Guess, setTop10Guess] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [roundPts, setRoundPts] = useState<{
    song: number;
    artist: number;
    year: number;
    top10: number;
  } | null>(null);

  // Player state
  const [clipPlaying, setClipPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);

  // Session-level stats
  const [popupPts, setPopupPts] = useState<number | null>(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);

  const playerRef = useRef<any>(null);
  const deviceIdRef = useRef<string>("");
  const clipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(false);
  const submittedRef = useRef(false);
  const timeLeftRef = useRef(ROUND_TIME);
  const accessToken = (session as any)?.accessToken as string | undefined;

  // ── Load tracks + check premium ───────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        // Check premium status
        const me = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }).then((r) => r.json());

        if (me.product !== "premium") {
          setNotPremium(true);
          setLoading(false);
          return;
        }

        const data = await getTopTracks(accessToken, 50);
        const mapped: BlindTrack[] = data.items.map((t: any, idx: number) => ({
          id: t.id,
          uri: t.uri,
          name: t.name,
          artistName: t.artists[0].name,
          releaseYear: parseInt(t.album.release_date?.slice(0, 4) ?? "2000"),
          topRank: idx + 1,
          isTop10: idx < 10,
          albumImage: t.album.images[0]?.url ?? "",
        }));

        // Build stable MCQ options per track
        const allArtists = Array.from(new Set(mapped.map((t) => t.artistName)));
        const allSongs = mapped.map((t) => t.name);
        const tracksWithOptions: BlindTrack[] = mapped.map((t) => ({
          ...t,
          songOptions: shuffle([
            t.name,
            ...shuffle(allSongs.filter((s) => s !== t.name)).slice(0, 3),
          ]),
          artistOptions: shuffle([
            t.artistName,
            ...shuffle(allArtists.filter((a) => a !== t.artistName)).slice(0, 3),
          ]),
        }));

        setTracks(shuffle(tracksWithOptions));
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    })();
  }, [accessToken]);

  // ── Spotify Web Playback SDK ──────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;

    (window as any).onSpotifyWebPlaybackSDKReady = () => {
      const player = new (window as any).Spotify.Player({
        name: "HookD Blind Taste Test",
        getOAuthToken: (cb: (token: string) => void) => cb(accessToken),
        volume: 0.8,
      });

      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        deviceIdRef.current = device_id;
        setPlayerReady(true);
      });

      player.addListener("not_ready", () => {
        setPlayerReady(false);
      });

      player.connect();
      playerRef.current = player;
    };

    // Load SDK script if not already in DOM
    if (!document.getElementById("spotify-sdk")) {
      const script = document.createElement("script");
      script.id = "spotify-sdk";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      document.body.appendChild(script);
    } else if ((window as any).Spotify) {
      // SDK already loaded (e.g. navigated back to page), fire manually
      (window as any).onSpotifyWebPlaybackSDKReady();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
        setPlayerReady(false);
      }
    };
  }, [accessToken]);

  // ── Setup round ───────────────────────────────────────────────────────────────
  const setupRound = useCallback((trackList: BlindTrack[], roundIdx: number) => {
    setCurrent(trackList[roundIdx % trackList.length]);
    setSongGuess(null);
    setArtistGuess(null);
    setYearGuess(null);
    setTop10Guess(null);
    submittedRef.current = false;
    setSubmitted(false);
    setRoundPts(null);
    setTimeLeft(ROUND_TIME);
    timeLeftRef.current = ROUND_TIME;
    setClipPlaying(false);
  }, []);

  useEffect(() => {
    if (tracks.length > 0) setupRound(tracks, round);
  }, [tracks, round, setupRound]);

  // ── Play 10s clip via SDK ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!current || loading || !playerReady || !deviceIdRef.current || !accessToken) return;

    const startDelay = setTimeout(async () => {
      if (clipTimerRef.current) clearTimeout(clipTimerRef.current);
      try {
        await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: [current.uri],
              position_ms: CLIP_START_MS,
            }),
          }
        );
        setClipPlaying(true);
        clipTimerRef.current = setTimeout(() => {
          playerRef.current?.pause();
          setClipPlaying(false);
        }, CLIP_LENGTH_MS);
      } catch (e) {
        console.error("Failed to play track:", e);
      }
    }, 250);

    return () => {
      clearTimeout(startDelay);
      if (clipTimerRef.current) clearTimeout(clipTimerRef.current);
      playerRef.current?.pause();
    };
  }, [current, loading, playerReady, accessToken]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (clipTimerRef.current) clearTimeout(clipTimerRef.current);
      playerRef.current?.pause();
    },
    []
  );

  // ── Submit answers ────────────────────────────────────────────────────────────
  const doSubmit = useCallback(
    (
      sGuess: string | null,
      aGuess: string | null,
      yGuess: string | null,
      t10Guess: boolean | null,
      time: number,
      track: BlindTrack
    ) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitted(true);

      playerRef.current?.pause();
      if (clipTimerRef.current) clearTimeout(clipTimerRef.current);
      setClipPlaying(false);

      const tf = time / ROUND_TIME;
      const songOk = sGuess === track.name;
      const artistOk = aGuess === track.artistName;
      const yearOk = yGuess === yearBucket(track.releaseYear);
      const top10Ok = t10Guess === track.isTop10;

      const songPts = songOk
        ? Math.round(PTS_SONG_MIN + (PTS_SONG_MAX - PTS_SONG_MIN) * tf)
        : 0;
      const artistPts = artistOk
        ? Math.round(PTS_ARTIST_MIN + (PTS_ARTIST_MAX - PTS_ARTIST_MIN) * tf)
        : 0;
      const yearPts = yearOk ? Math.round(PTS_YEAR_MAX * tf) : 0;
      const top10Pts = top10Ok ? PTS_TOP10 : 0;
      const total = songPts + artistPts + yearPts + top10Pts;

      if (total > 0) {
        addPoints(total);
        setSessionScore((s) => s + total);
        setPopupPts(total);
        setTimeout(() => setPopupPts(null), 1200);
      }
      if (!artistOk) endStreak();

      setRoundPts({ song: songPts, artist: artistPts, year: yearPts, top10: top10Pts });
      setTotalAnswered((t) => t + 1);
      if (artistOk) setCorrect((c) => c + 1);
    },
    [addPoints, endStreak]
  );

  // ── Countdown ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || submitted || !current) return;
    if (timeLeft <= 0) {
      doSubmit(songGuess, artistGuess, yearGuess, top10Guess, 0, current);
      return;
    }
    const t = setTimeout(() => {
      const next = timeLeft - 1;
      timeLeftRef.current = next;
      setTimeLeft(next);
    }, 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading, submitted, current, songGuess, artistGuess, yearGuess, top10Guess, doSubmit]);

  // ── Auto-submit when all 4 answered ──────────────────────────────────────────
  useEffect(() => {
    if (submitted || !current) return;
    if (songGuess !== null && artistGuess !== null && yearGuess !== null && top10Guess !== null) {
      doSubmit(songGuess, artistGuess, yearGuess, top10Guess, timeLeftRef.current, current);
    }
  }, [songGuess, artistGuess, yearGuess, top10Guess, submitted, current, doSubmit]);

  // ── Save & back ───────────────────────────────────────────────────────────────
  const handleBack = async () => {
    playerRef.current?.pause();
    if (!savedRef.current && sessionScore > 0) {
      savedRef.current = true;
      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameType: "blind",
            score: sessionScore,
            roundsPlayed: totalAnswered,
            correctAnswers: correct,
            maxStreak,
          }),
        });
      } catch (e) {
        console.error("Failed to save session:", e);
      }
    }
    router.push("/game");
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <GameLayout title="Blind Taste Test" color={COLOR} onBack={handleBack}>
        <LoadingState text="LOADING YOUR TRACKS..." />
      </GameLayout>
    );
  }

  if (notPremium) {
    return (
      <GameLayout title="Blind Taste Test" color={COLOR} onBack={handleBack}>
        <div className="flex flex-col items-center justify-center py-40 px-4 text-center gap-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
            style={{ background: `${COLOR}15`, border: `1px solid ${COLOR}30` }}
          >
            ✦
          </div>
          <div>
            <p className="font-display text-2xl tracking-widest mb-3" style={{ color: COLOR }}>
              PREMIUM REQUIRED
            </p>
            <p className="font-body italic text-sm leading-relaxed max-w-xs mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              Blind Taste Test plays full Spotify tracks and requires a Spotify Premium account.
            </p>
          </div>
        </div>
      </GameLayout>
    );
  }

  if (!playerReady) {
    return (
      <GameLayout title="Blind Taste Test" color={COLOR} onBack={handleBack}>
        <LoadingState text="CONNECTING PLAYER..." />
      </GameLayout>
    );
  }

  if (!current) return null;

  const songOk = songGuess === current.name;
  const artistOk = artistGuess === current.artistName;
  const yearOk = yearGuess === yearBucket(current.releaseYear);
  const top10Ok = top10Guess === current.isTop10;
  const urgent = timeLeft <= 8 && !submitted;

  return (
    <GameLayout
      title="Blind Taste Test"
      color={COLOR}
      onBack={handleBack}
      stats={{ round: round + 1, correct, total: totalAnswered }}
    >
      {/* ── Ambient album-art background ── */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <img
          src={current.albumImage}
          alt=""
          className={`w-full h-full object-cover scale-125 transition-all duration-[2000ms] ${
            submitted ? "blur-2xl opacity-30" : "blur-3xl opacity-10"
          }`}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13,13,20,0.82) 0%, rgba(13,13,20,0.68) 50%, rgba(13,13,20,0.96) 100%)",
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-5 py-8 w-full max-w-xl mx-auto px-4">

        {/* ── Hero: Album art + Timer ── */}
        <div className="flex flex-col items-center gap-5 w-full">

          {/* Album frame with glow halo */}
          <div className="relative">
            {/* Glow halo — fades in while playing */}
            <div
              className="absolute -inset-6 rounded-[2rem] pointer-events-none transition-opacity duration-700"
              style={{
                background: `radial-gradient(ellipse, ${COLOR}35 0%, transparent 70%)`,
                opacity: clipPlaying ? 1 : 0,
                filter: "blur(16px)",
              }}
            />

            {/* Art frame */}
            <div
              className="relative w-56 h-56 rounded-2xl overflow-hidden transition-all duration-1000"
              style={{
                boxShadow: clipPlaying
                  ? `0 0 50px ${COLOR}30, 0 0 100px ${COLOR}10, 0 24px 64px rgba(0,0,0,0.7)`
                  : submitted
                  ? "0 24px 72px rgba(0,0,0,0.7)"
                  : "0 12px 48px rgba(0,0,0,0.6)",
              }}
            >
              <img
                src={current.albumImage}
                alt="Album"
                className={`w-full h-full object-cover transition-all duration-1000 ${
                  submitted
                    ? "blur-0 scale-100 brightness-100"
                    : "blur-xl scale-125 brightness-[0.25]"
                }`}
              />

              {/* Frosted overlay while hidden */}
              {!submitted && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)" }}
                >
                  {clipPlaying ? (
                    <WaveformAnim color={COLOR} />
                  ) : (
                    <span
                      className="font-mono text-[10px] tracking-[0.2em]"
                      style={{ color: "rgba(255,255,255,0.25)" }}
                    >
                      LOADING...
                    </span>
                  )}
                </div>
              )}

              {/* Track info gradient after reveal */}
              {submitted && (
                <div
                  className="absolute bottom-0 left-0 right-0 px-3 pt-8 pb-3"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)",
                  }}
                >
                  <p className="font-display text-sm text-white leading-tight truncate">
                    {current.name}
                  </p>
                  <p
                    className="font-mono text-[10px] mt-1 truncate"
                    style={{ color: "rgba(255,255,255,0.45)" }}
                  >
                    {current.artistName} · {current.releaseYear}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timer bar */}
          <div className="w-full">
            <div
              className="flex justify-between font-mono text-[10px] mb-2"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <span className="tracking-[0.15em]">
                {clipPlaying ? "♪  PLAYING" : submitted ? "REVEALED" : "ANSWER NOW"}
              </span>
              <span style={{ color: urgent ? "#ff4060" : "rgba(255,255,255,0.35)" }}>
                {submitted ? "—" : `${timeLeft}s`}
              </span>
            </div>
            <div
              className="h-[2px] w-full rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: submitted ? "0%" : `${(timeLeft / ROUND_TIME) * 100}%`,
                  background: urgent
                    ? "linear-gradient(90deg, #c0203a, #ff4060)"
                    : `linear-gradient(90deg, ${COLOR}bb, ${COLOR})`,
                  boxShadow: submitted
                    ? "none"
                    : `0 0 10px ${urgent ? "#ff406055" : COLOR + "45"}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Questions ── */}
        <div className="w-full flex flex-col gap-3">
          <QuestionBlock label="WHAT IS THIS SONG?">
            <div className="grid grid-cols-2 gap-2">
              {current.songOptions.map((opt) => (
                <ChoiceBtn
                  key={opt}
                  label={opt}
                  chosen={songGuess === opt}
                  correct={opt === current.name}
                  submitted={submitted}
                  disabled={submitted || songGuess !== null}
                  color={COLOR}
                  onClick={() => setSongGuess(opt)}
                />
              ))}
            </div>
          </QuestionBlock>

          <QuestionBlock label="WHO IS THIS ARTIST?">
            <div className="grid grid-cols-2 gap-2">
              {current.artistOptions.map((opt) => (
                <ChoiceBtn
                  key={opt}
                  label={opt}
                  chosen={artistGuess === opt}
                  correct={opt === current.artistName}
                  submitted={submitted}
                  disabled={submitted || artistGuess !== null}
                  color={COLOR}
                  onClick={() => setArtistGuess(opt)}
                />
              ))}
            </div>
          </QuestionBlock>

          <QuestionBlock label="WHEN WAS THIS RELEASED?">
            <div className="grid grid-cols-2 gap-2">
              {YEAR_RANGES.map((r) => (
                <ChoiceBtn
                  key={r.label}
                  label={r.label}
                  chosen={yearGuess === r.label}
                  correct={r.label === yearBucket(current.releaseYear)}
                  submitted={submitted}
                  disabled={submitted || yearGuess !== null}
                  color={COLOR}
                  onClick={() => setYearGuess(r.label)}
                />
              ))}
            </div>
          </QuestionBlock>

          <QuestionBlock label="IS THIS IN YOUR TOP 10 MOST PLAYED?">
            <div className="grid grid-cols-2 gap-2">
              {([{ label: "YES", val: true }, { label: "NO", val: false }] as const).map(
                ({ label, val }) => (
                  <ChoiceBtn
                    key={label}
                    label={label}
                    chosen={top10Guess === val}
                    correct={val === current.isTop10}
                    submitted={submitted}
                    disabled={submitted || top10Guess !== null}
                    color={COLOR}
                    onClick={() => setTop10Guess(val)}
                  />
                )
              )}
            </div>
          </QuestionBlock>
        </div>

        {/* ── Reveal panel ── */}
        {submitted && roundPts && (
          <div
            className="w-full rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.09)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div className="p-5 flex flex-col gap-4">
              {/* Score rows */}
              <div className="flex flex-col divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <ScoreRow label="SONG"      pts={roundPts.song}   correct={songOk}   color={COLOR} />
                <ScoreRow label="ARTIST"    pts={roundPts.artist} correct={artistOk} color={COLOR} />
                <ScoreRow label="YEAR"      pts={roundPts.year}   correct={yearOk}   color={COLOR} />
                <ScoreRow label="TOP 10"    pts={roundPts.top10}  correct={top10Ok}  color={COLOR} flat />
              </div>

              {/* Hook line */}
              <p
                className="font-body italic text-sm leading-relaxed pt-1"
                style={{ color: songOk && artistOk ? COLOR : "#ff4060" }}
              >
                &ldquo;{hookLine(current, songOk, artistOk, yearOk, top10Ok)}&rdquo;
              </p>

              {/* Next button */}
              <button
                onClick={() => setRound((r) => r + 1)}
                className="w-full py-3.5 font-mono text-xs tracking-[0.15em] rounded-xl transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${COLOR}25, ${COLOR}10)`,
                  border: `1px solid ${COLOR}45`,
                  color: COLOR,
                  boxShadow: `0 0 24px ${COLOR}18`,
                }}
              >
                NEXT CLIP →
              </button>
            </div>
          </div>
        )}
      </div>

      {popupPts && <ScorePopup points={popupPts} color={COLOR} />}
    </GameLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuestionBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="px-4 pt-3.5 pb-2.5">
        <p
          className="font-mono text-[9px] tracking-[0.15em]"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          {label}
        </p>
      </div>
      <div className="px-3 pb-3">{children}</div>
    </div>
  );
}

function ChoiceBtn({
  label,
  chosen,
  correct,
  submitted,
  disabled,
  color,
  onClick,
}: {
  label: string;
  chosen: boolean;
  correct: boolean;
  submitted: boolean;
  disabled: boolean;
  color: string;
  onClick: () => void;
}) {
  let bg = "rgba(255,255,255,0.05)";
  let border = "rgba(255,255,255,0.07)";
  let textColor = "rgba(255,255,255,0.4)";
  let shadow = "none";

  if (chosen && !submitted) {
    bg = color + "1a";
    border = color + "aa";
    textColor = color;
    shadow = `0 0 18px ${color}28`;
  } else if (submitted) {
    if (correct) {
      bg = color + "15";
      border = color + "80";
      textColor = color;
      shadow = `0 0 14px ${color}22`;
    } else if (chosen) {
      bg = "rgba(255,64,96,0.10)";
      border = "rgba(255,64,96,0.50)";
      textColor = "#ff4060";
    } else {
      bg = "rgba(255,255,255,0.02)";
      border = "rgba(255,255,255,0.03)";
      textColor = "rgba(255,255,255,0.15)";
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-3 text-left font-mono text-xs transition-all duration-200 disabled:cursor-default truncate rounded-xl hover:brightness-110 active:scale-[0.98]"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        color: textColor,
        boxShadow: shadow,
        backdropFilter: "blur(8px)",
      }}
    >
      {label}
    </button>
  );
}

function ScoreRow({
  label,
  pts,
  correct,
  color,
  flat = false,
}: {
  label: string;
  pts: number;
  correct: boolean;
  color: string;
  flat?: boolean;
}) {
  return (
    <div className="flex items-center justify-between font-mono text-xs py-2.5">
      <div className="flex items-center gap-2.5">
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0"
          style={{
            background: correct ? color + "20" : "rgba(255,64,96,0.15)",
            color: correct ? color : "#ff4060",
          }}
        >
          {correct ? "✓" : "✗"}
        </span>
        <span
          className="tracking-[0.12em] text-[10px]"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {label}
        </span>
      </div>
      <span
        className="text-xs"
        style={{ color: correct ? color : "rgba(255,64,96,0.55)" }}
      >
        {correct ? `+${pts}${flat ? " (flat)" : ""}` : "—"}
      </span>
    </div>
  );
}

function WaveformAnim({ color }: { color: string }) {
  return (
    <>
      <style>{`
        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1); }
        }
      `}</style>
      <div className="flex items-center gap-[3px] h-10">
        {[0.7, 1.1, 0.5, 1.4, 0.8, 1.6, 0.6, 1.3, 0.9, 1.5, 0.6, 1.1].map((h, i) => (
          <div
            key={i}
            style={{
              width: 3,
              height: `${h * 18}px`,
              backgroundColor: color,
              borderRadius: 3,
              animation: `waveBar ${0.7 + (i % 4) * 0.13}s ease-in-out infinite`,
              animationDelay: `${i * 55}ms`,
              transformOrigin: "center",
            }}
          />
        ))}
      </div>
    </>
  );
}

function LoadingState({ text = "LOADING YOUR TRACKS..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-5">
      <div
        className="w-14 h-14 rounded-full animate-spin"
        style={{
          border: "2px solid rgba(244,114,182,0.12)",
          borderTopColor: COLOR,
          boxShadow: `0 0 20px ${COLOR}25`,
        }}
      />
      <span
        className="font-mono text-[10px] tracking-[0.2em]"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        {text}
      </span>
    </div>
  );
}
