"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getTopTracks, shuffle } from "@/lib/spotify";
import { useGameStore } from "@/lib/store";
import GameLayout from "@/components/GameLayout";
import ScorePopup from "@/components/ScorePopup";

interface Track {
  id: string;
  name: string;
  artist: string;
  previewUrl: string | null;
  albumImage: string;
}

const ROUND_TIME = 30;
const POINTS_MAX = 600;
const POINTS_MIN = 150;

export default function SnippetGame() {
  const { data: session } = useSession();
  const router = useRouter();
  const { addPoints, endStreak, maxStreak } = useGameStore();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [guess, setGuess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [popupPts, setPopupPts] = useState<number | null>(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const [noPreviewTracks, setNoPreviewTracks] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const savedRef = useRef(false);
  const accessToken = (session as any)?.accessToken as string | undefined;

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const topTracks = await getTopTracks(accessToken, 50);
        const withPreview: Track[] = topTracks.items
          .filter((t: any) => t.preview_url)
          .map((t: any) => ({
            id: t.id,
            name: t.name,
            artist: t.artists[0].name,
            previewUrl: t.preview_url,
            albumImage: t.album.images[0]?.url,
          }));

        if (withPreview.length < 4) {
          setNoPreviewTracks(true);
          setLoading(false);
          return;
        }

        setTracks(shuffle(withPreview));
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const setupRound = useCallback((trackList: Track[], roundIndex: number) => {
    const currentTrack = trackList[roundIndex % trackList.length];
    setCurrent(currentTrack);
    setGuess(null);
    setPlaying(false);
    setTimeLeft(ROUND_TIME);
    setAudioProgress(0);

    const others = trackList
      .filter((t) => t.id !== currentTrack.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((t) => `${t.name} — ${t.artist}`);

    setOptions(
      shuffle([`${currentTrack.name} — ${currentTrack.artist}`, ...others])
    );
  }, []);

  useEffect(() => {
    if (tracks.length > 0) setupRound(tracks, round);
  }, [tracks, round, setupRound]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Timer
  useEffect(() => {
    if (loading || guess !== null || !playing) return;
    if (timeLeft <= 0) {
      endStreak();
      setGuess("__timeout__");
      setTotalAnswered((t) => t + 1);
      audioRef.current?.pause();
      setTimeout(() => setRound((r) => r + 1), 2000);
      return;
    }
    const t = setTimeout(() => setTimeLeft((tl) => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading, guess, playing, endStreak]);

  const togglePlay = () => {
    if (!current?.previewUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(current.previewUrl);
      audioRef.current.addEventListener("timeupdate", () => {
        const a = audioRef.current;
        if (a) setAudioProgress((a.currentTime / a.duration) * 100);
      });
      audioRef.current.addEventListener("ended", () => {
        setPlaying(false);
      });
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleGuess = (option: string) => {
    if (guess !== null || !current) return;
    setGuess(option);
    setTotalAnswered((t) => t + 1);
    audioRef.current?.pause();
    setPlaying(false);

    const correctAnswer = `${current.name} — ${current.artist}`;
    if (option === correctAnswer) {
      const pts = Math.round(
        POINTS_MIN + (POINTS_MAX - POINTS_MIN) * (timeLeft / ROUND_TIME)
      );
      addPoints(pts);
      setSessionScore((s) => s + pts);
      setPopupPts(pts);
      setCorrect((c) => c + 1);
      setTimeout(() => setPopupPts(null), 1200);
    } else {
      endStreak();
    }

    // Reset audio for next round
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setTimeout(() => setRound((r) => r + 1), 2000);
  };

  const handleBack = async () => {
    audioRef.current?.pause();
    if (!savedRef.current && sessionScore > 0) {
      savedRef.current = true;
      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameType: "snippet",
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

  if (loading) {
    return (
      <GameLayout title="Sound Check" color="#ff4060" onBack={handleBack}>
        <LoadingState />
      </GameLayout>
    );
  }

  if (noPreviewTracks) {
    return (
      <GameLayout title="Sound Check" color="#ff4060" onBack={handleBack}>
        <div className="text-center py-32">
          <p className="font-display text-3xl text-accent2 mb-4">NO PREVIEWS AVAILABLE</p>
          <p className="font-body italic text-textmid max-w-sm mx-auto">
            Spotify doesn&apos;t provide audio previews for your top tracks in your region.
            Try a different game or update your listening history.
          </p>
        </div>
      </GameLayout>
    );
  }

  if (!current) return null;

  const correctAnswer = `${current.name} — ${current.artist}`;
  const isCorrect = guess === correctAnswer;
  const isTimeout = guess === "__timeout__";

  return (
    <GameLayout
      title="Sound Check"
      color="#ff4060"
      onBack={handleBack}
      stats={{ round: round + 1, correct, total: totalAnswered }}
    >
      <div className="flex flex-col items-center gap-8 py-8">
        {/* Timer bar */}
        <div className="w-full max-w-md">
          <div className="flex justify-between font-mono text-xs text-textdim mb-2">
            <span>TIME</span>
            <span
              className={
                timeLeft <= 5 && playing
                  ? "text-accent2 animate-pulse-accent"
                  : "text-accent2"
              }
            >
              {playing ? `${timeLeft}s` : "–"}
            </span>
          </div>
          <div className="h-px bg-border w-full">
            <div
              className="h-px bg-accent2 transition-all duration-1000"
              style={{
                width: playing ? `${(timeLeft / ROUND_TIME) * 100}%` : "100%",
              }}
            />
          </div>
        </div>

        {/* Player */}
        <div className="relative flex flex-col items-center gap-6">
          {/* Album art - blurred until guess */}
          <div className="relative w-64 h-64 md:w-72 md:h-72 overflow-hidden">
            <img
              src={current.albumImage}
              alt="Album"
              className={`w-full h-full object-cover transition-all duration-700 ${
                guess === null ? "blur-xl brightness-50 scale-110" : "blur-0 brightness-100"
              } ${isCorrect ? "ring-2 ring-accent2" : ""}`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              {guess === null && (
                <button
                  onClick={togglePlay}
                  className="w-20 h-20 rounded-full border-2 border-accent2 bg-bg/80 flex items-center justify-center text-accent2 hover:bg-accent2/20 transition-all"
                >
                  {playing ? (
                    <PauseIcon />
                  ) : (
                    <PlayIcon />
                  )}
                </button>
              )}
              {isCorrect && (
                <span className="font-display text-6xl text-accent2">✓</span>
              )}
              {isTimeout && (
                <span className="font-display text-5xl text-accent2">⏱</span>
              )}
            </div>
          </div>

          {/* Audio progress bar */}
          {playing && (
            <div className="w-64 h-px bg-border">
              <div
                className="h-px bg-accent2 transition-all duration-300"
                style={{ width: `${audioProgress}%` }}
              />
            </div>
          )}

          <p className="font-mono text-xs text-textdim text-center max-w-xs">
            {guess === null
              ? playing
                ? "Listening... what's the song?"
                : "Press play to start the clip"
              : `${current.name} by ${current.artist}`}
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-3 w-full max-w-lg">
          {options.map((opt) => {
            const isThis = opt === correctAnswer;
            const wasChosen = guess === opt;
            let borderColor = "#252530";
            let bgColor = "transparent";
            let textColor = "#999";

            if (guess !== null) {
              if (isThis) {
                borderColor = "#ff4060";
                bgColor = "rgba(255,64,96,0.08)";
                textColor = "#ff4060";
              } else if (wasChosen && !isThis) {
                borderColor = "#555";
                textColor = "#555";
              }
            }

            return (
              <button
                key={opt}
                onClick={() => handleGuess(opt)}
                disabled={guess !== null}
                className="p-4 border text-left font-mono text-sm transition-all duration-200 hover:bg-bg3 disabled:cursor-default"
                style={{ borderColor, backgroundColor: bgColor, color: textColor }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {guess !== null && (
          <p className="font-mono text-xs text-textdim animate-pulse-accent">
            Next round in a moment...
          </p>
        )}
      </div>

      {popupPts && <ScorePopup points={popupPts} color="#ff4060" />}
    </GameLayout>
  );
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-16 h-16 border border-accent2/30 border-t-accent2 rounded-full animate-spin" />
      <span className="font-mono text-xs text-textdim tracking-widest">
        LOADING YOUR TRACKS...
      </span>
    </div>
  );
}
