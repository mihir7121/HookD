"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getTopTracks, shuffle } from "@/lib/spotify";
import { useGameStore } from "@/lib/store";
import GameLayout from "@/components/GameLayout";
import ScorePopup from "@/components/ScorePopup";

interface MatchTrack {
  id: string;
  songName: string;
  artistName: string;
}

const PAIR_COLORS = ["#c8ff00", "#ff4060", "#9b59ff", "#ff8c00", "#00cfff"];
const ROUND_TIME = 60;
const POINTS_MIN = 40;
const POINTS_MAX = 200;

export default function MatchGame() {
  const { data: session } = useSession();
  const router = useRouter();
  const { addPoints, endStreak, maxStreak } = useGameStore();

  const [allTracks, setAllTracks] = useState<MatchTrack[]>([]);
  const [shuffledSongs, setShuffledSongs] = useState<MatchTrack[]>([]);
  const [shuffledArtists, setShuffledArtists] = useState<MatchTrack[]>([]);
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [matches, setMatches] = useState<Map<string, string>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [roundResult, setRoundResult] = useState<{ correct: number; pts: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [popupPts, setPopupPts] = useState<number | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0); // rounds completed
  const [totalCorrect, setTotalCorrect] = useState(0);   // songs correctly matched

  const savedRef = useRef(false);
  const submittedRef = useRef(false);
  const matchesRef = useRef<Map<string, string>>(new Map());
  const timeLeftRef = useRef(ROUND_TIME);

  const accessToken = (session as any)?.accessToken as string | undefined;

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const data = await getTopTracks(accessToken, 50);
        // Deduplicate by artist name — one song per artist
        const seen = new Set<string>();
        const tracks: MatchTrack[] = [];
        for (const t of data.items) {
          const artist = t.artists[0].name;
          if (!seen.has(artist)) {
            seen.add(artist);
            tracks.push({ id: t.id, songName: t.name, artistName: artist });
          }
        }
        setAllTracks(shuffle(tracks));
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const setupRound = useCallback((tracks: MatchTrack[]) => {
    const five = shuffle(tracks).slice(0, 5);
    setShuffledSongs([...five]);
    setShuffledArtists(shuffle([...five]));
    setSelectedSong(null);
    const newMatches = new Map<string, string>();
    setMatches(newMatches);
    matchesRef.current = newMatches;
    submittedRef.current = false;
    setSubmitted(false);
    setRoundResult(null);
    setTimeLeft(ROUND_TIME);
    timeLeftRef.current = ROUND_TIME;
  }, []);

  useEffect(() => {
    if (allTracks.length >= 5) {
      setupRound(allTracks);
    }
  }, [allTracks, round, setupRound]);

  const doSubmit = useCallback(
    (finalMatches: Map<string, string>, currentTime: number) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitted(true);

      let correctCount = 0;
      for (const [songId, artistId] of finalMatches.entries()) {
        if (songId === artistId) correctCount++;
      }

      const pts =
        correctCount > 0
          ? correctCount *
            Math.round(
              POINTS_MIN + (POINTS_MAX - POINTS_MIN) * (currentTime / ROUND_TIME)
            )
          : 0;

      if (pts > 0) {
        addPoints(pts);
        setSessionScore((s) => s + pts);
        setPopupPts(pts);
        setTimeout(() => setPopupPts(null), 1200);
      } else {
        endStreak();
      }

      setRoundResult({ correct: correctCount, pts });
      setTotalAnswered((t) => t + 1);
      setTotalCorrect((t) => t + correctCount);
    },
    [addPoints, endStreak]
  );

  // Countdown timer
  useEffect(() => {
    if (loading || submitted || shuffledSongs.length === 0) return;
    if (timeLeft <= 0) {
      doSubmit(matchesRef.current, 0);
      return;
    }
    const t = setTimeout(() => {
      const next = timeLeft - 1;
      timeLeftRef.current = next;
      setTimeLeft(next);
    }, 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading, submitted, shuffledSongs.length, doSubmit]);

  const handleSongClick = (trackId: string) => {
    if (submitted) return;
    setSelectedSong((prev) => (prev === trackId ? null : trackId));
  };

  const handleArtistClick = (trackId: string) => {
    if (submitted || !selectedSong) return;

    const next = new Map(matchesRef.current);
    // Clear any existing pairing where this artist is already used
    for (const [k, v] of next.entries()) {
      if (v === trackId) {
        next.delete(k);
        break;
      }
    }
    // Clear any existing pairing for the selected song
    next.delete(selectedSong);
    // Create the new pairing
    next.set(selectedSong, trackId);

    matchesRef.current = next;
    setMatches(new Map(next));
    setSelectedSong(null);

    // Auto-submit once all 5 are matched
    if (next.size === 5) {
      setTimeout(() => doSubmit(matchesRef.current, timeLeftRef.current), 500);
    }
  };

  const handleNext = () => {
    setRound((r) => r + 1);
  };

  const handleBack = async () => {
    if (!savedRef.current && sessionScore > 0) {
      savedRef.current = true;
      try {
        await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameType: "match",
            score: sessionScore,
            roundsPlayed: totalAnswered * 5,
            correctAnswers: totalCorrect,
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
      <GameLayout title="Match Up" color="#ff8c00" onBack={handleBack}>
        <LoadingState />
      </GameLayout>
    );
  }

  if (allTracks.length < 5) {
    return (
      <GameLayout title="Match Up" color="#ff8c00" onBack={handleBack}>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="font-mono text-sm text-textdim text-center">
            Not enough listening history yet.
            <br />
            Play more music on Spotify first!
          </p>
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout
      title="Match Up"
      color="#ff8c00"
      onBack={handleBack}
      stats={{
        round: round + 1,
        correct: totalCorrect,
        total: totalAnswered * 5,
      }}
    >
      <div className="flex flex-col items-center gap-6 py-8">
        {/* Timer bar */}
        <div className="w-full max-w-lg">
          <div className="flex justify-between font-mono text-xs text-textdim mb-2">
            <span>TIME</span>
            <span
              className={timeLeft <= 10 ? "animate-pulse-accent" : ""}
              style={{ color: timeLeft <= 10 ? "#ff4060" : "#ff8c00" }}
            >
              {timeLeft}s
            </span>
          </div>
          <div className="h-px bg-border w-full">
            <div
              className="h-px transition-all duration-1000"
              style={{
                width: `${(timeLeft / ROUND_TIME) * 100}%`,
                backgroundColor: "#ff8c00",
              }}
            />
          </div>
        </div>

        {/* Instruction / result */}
        {!submitted ? (
          <p className="font-mono text-xs text-textdim tracking-widest">
            {selectedSong
              ? "NOW TAP THE MATCHING ARTIST \u2192"
              : "TAP A SONG, THEN ITS ARTIST"}
          </p>
        ) : (
          <div className="font-mono text-xs text-center animate-reveal">
            <span style={{ color: "#ff8c00" }}>
              {roundResult?.correct}/5 CORRECT &middot; +{roundResult?.pts} PTS
            </span>
          </div>
        )}

        {/* Two-column matching grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
          {/* Songs column */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] text-textdim tracking-widest uppercase mb-1">
              SONGS
            </span>
            {shuffledSongs.map((track, colorIdx) => {
              const matchedArtistId = matches.get(track.id);
              const isMatched = matchedArtistId !== undefined;
              const isCorrect = submitted && matchedArtistId === track.id;
              const isWrong =
                submitted && isMatched && matchedArtistId !== track.id;
              const isUnmatched = submitted && !isMatched;
              const pairColor = PAIR_COLORS[colorIdx];
              const isSelected = selectedSong === track.id;

              let borderColor = "#252530";
              let bgColor = "transparent";
              let textColor = "#999";

              if (isSelected) {
                borderColor = "#ff8c00";
                bgColor = "rgba(255,140,0,0.1)";
                textColor = "#ff8c00";
              } else if (submitted) {
                if (isCorrect) {
                  borderColor = pairColor;
                  bgColor = `${pairColor}15`;
                  textColor = pairColor;
                } else if (isWrong || isUnmatched) {
                  borderColor = "#ff4060";
                  bgColor = "rgba(255,64,96,0.06)";
                  textColor = "#ff4060";
                }
              } else if (isMatched) {
                borderColor = pairColor;
                bgColor = `${pairColor}12`;
                textColor = pairColor;
              }

              return (
                <button
                  key={track.id}
                  onClick={() => handleSongClick(track.id)}
                  disabled={submitted}
                  className="p-3 border text-left font-mono text-xs transition-all duration-150 hover:bg-bg3 disabled:cursor-default leading-tight"
                  style={{ borderColor, backgroundColor: bgColor, color: textColor }}
                >
                  {track.songName}
                </button>
              );
            })}
          </div>

          {/* Artists column */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] text-textdim tracking-widest uppercase mb-1">
              ARTISTS
            </span>
            {shuffledArtists.map((track) => {
              // Find if this artist side is paired to any song
              let matchedSongId: string | undefined;
              for (const [songId, artistId] of matches.entries()) {
                if (artistId === track.id) {
                  matchedSongId = songId;
                  break;
                }
              }
              const isMatched = matchedSongId !== undefined;
              const isCorrect = submitted && matchedSongId === track.id;
              const isWrong =
                submitted && isMatched && matchedSongId !== track.id;
              const isUnmatched = submitted && !isMatched;

              // Color is determined by the song's index in shuffledSongs
              const songColorIdx = matchedSongId
                ? shuffledSongs.findIndex((s) => s.id === matchedSongId)
                : -1;
              const pairColor =
                songColorIdx >= 0 ? PAIR_COLORS[songColorIdx] : "#666";

              let borderColor = "#252530";
              let bgColor = "transparent";
              let textColor = "#999";

              // Highlight unmatched artists when a song is selected
              if (!submitted && selectedSong && !isMatched) {
                borderColor = "#333";
                textColor = "#bbb";
              }

              if (submitted) {
                if (isCorrect) {
                  borderColor = pairColor;
                  bgColor = `${pairColor}15`;
                  textColor = pairColor;
                } else if (isWrong || isUnmatched) {
                  borderColor = "#ff4060";
                  bgColor = "rgba(255,64,96,0.06)";
                  textColor = "#ff4060";
                }
              } else if (isMatched) {
                borderColor = pairColor;
                bgColor = `${pairColor}12`;
                textColor = pairColor;
              }

              return (
                <button
                  key={track.id}
                  onClick={() => handleArtistClick(track.id)}
                  disabled={submitted || !selectedSong}
                  className="p-3 border text-left font-mono text-xs transition-all duration-150 hover:bg-bg3 disabled:cursor-default leading-tight"
                  style={{ borderColor, backgroundColor: bgColor, color: textColor }}
                >
                  {track.artistName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit button (shown when at least one pair exists and not yet submitted) */}
        {!submitted && matches.size > 0 && (
          <button
            onClick={() => doSubmit(matchesRef.current, timeLeftRef.current)}
            className="font-mono text-xs px-8 py-3 border transition-all hover:opacity-80"
            style={{
              color: "#ff8c00",
              borderColor: "#ff8c00",
              backgroundColor: "rgba(255,140,0,0.08)",
            }}
          >
            SUBMIT ({matches.size}/5 matched)
          </button>
        )}

        {submitted && (
          <button
            onClick={handleNext}
            className="font-mono text-xs px-8 py-3 border transition-all hover:opacity-80 animate-reveal"
            style={{
              color: "#ff8c00",
              borderColor: "#ff8c00",
              backgroundColor: "rgba(255,140,0,0.08)",
            }}
          >
            NEXT ROUND →
          </button>
        )}
      </div>

      {popupPts && <ScorePopup points={popupPts} color="#ff8c00" />}
    </GameLayout>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div
        className="w-16 h-16 border rounded-full animate-spin"
        style={{ borderColor: "rgba(255,140,0,0.3)", borderTopColor: "#ff8c00" }}
      />
      <span className="font-mono text-xs text-textdim tracking-widest">
        LOADING YOUR TRACKS...
      </span>
    </div>
  );
}
