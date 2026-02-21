"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getTopArtists, getRelatedArtists, getArtistTopTracks, shuffle } from "@/lib/spotify";
import { useGameStore } from "@/lib/store";
import GameLayout from "@/components/GameLayout";
import ScorePopup from "@/components/ScorePopup";
import DiscoveryPanel, { DiscoveryItem } from "@/components/DiscoveryPanel";

interface Artist {
  id: string;
  name: string;
  imageUrl: string;
  genres: string[];
}

const REVEAL_TIME = 10; // seconds to fully reveal
const POINTS_MAX = 800;
const POINTS_MIN = 200;

export default function ArtistGame() {
  const { data: session } = useSession();
  const router = useRouter();
  const { addPoints, endStreak, maxStreak } = useGameStore();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [current, setCurrent] = useState<Artist | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [guess, setGuess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(REVEAL_TIME);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [popupPts, setPopupPts] = useState<number | null>(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItem[]>([]);
  const [topTracks, setTopTracks] = useState<string[]>([]);

  const savedRef = useRef(false);
  const accessToken = (session as any)?.accessToken as string | undefined;

  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const topArtists = await getTopArtists(accessToken, 50);
        const withImages: Artist[] = topArtists.items
          .filter((a: any) => a.images?.length > 0)
          .map((a: any) => ({
            id: a.id,
            name: a.name,
            imageUrl: a.images[0].url,
            genres: a.genres.slice(0, 2),
          }));

        setArtists(shuffle(withImages));
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const setupRound = useCallback((artistList: Artist[], roundIndex: number) => {
    const current = artistList[roundIndex % artistList.length];
    setCurrent(current);
    setGuess(null);
    setTimeLeft(REVEAL_TIME);
    setShowDiscovery(false);
    setDiscoveryItems([]);
    setTopTracks([]);

    const others = artistList
      .filter((a) => a.id !== current.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((a) => a.name);

    setOptions(shuffle([current.name, ...others]));
  }, []);

  const fetchDiscovery = useCallback(
    async (artist: Artist) => {
      if (!accessToken) return;
      try {
        const [relData, tracksData] = await Promise.all([
          getRelatedArtists(artist.id, accessToken),
          getArtistTopTracks(artist.id, accessToken),
        ]);
        const items: DiscoveryItem[] = relData.artists.slice(0, 3).map((a: any) => ({
          id: a.id,
          name: a.name,
          subtitle: a.genres[0] ?? "",
          imageUrl: a.images[0]?.url ?? "",
          spotifyUrl: a.external_urls?.spotify ?? "",
        }));
        setDiscoveryItems(items);
        setTopTracks(tracksData.tracks.slice(0, 3).map((t: any) => t.name));
      } catch {
        // silent fail
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (artists.length > 0) {
      const artist = artists[round % artists.length];
      setupRound(artists, round);
      fetchDiscovery(artist); // pre-fetch while user is still guessing
    }
  }, [artists, round, setupRound, fetchDiscovery]);

  // Countdown
  useEffect(() => {
    if (loading || guess !== null || !current) return;
    if (timeLeft <= 0) {
      endStreak();
      setGuess("__timeout__");
      setTotalAnswered((t) => t + 1);
      setShowDiscovery(true);
      return;
    }
    const t = setTimeout(() => setTimeLeft((tl) => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading, guess, current, endStreak, fetchDiscovery]);

  const handleGuess = (option: string) => {
    if (guess !== null || !current) return;
    setGuess(option);
    setTotalAnswered((t) => t + 1);

    if (option === current.name) {
      const pts = Math.round(
        POINTS_MIN + (POINTS_MAX - POINTS_MIN) * (timeLeft / REVEAL_TIME)
      );
      addPoints(pts);
      setSessionScore((s) => s + pts);
      setPopupPts(pts);
      setCorrect((c) => c + 1);
      setTimeout(() => setPopupPts(null), 1200);
    } else {
      endStreak();
    }

    setShowDiscovery(true);
  };

  const handleDiscoveryNext = () => {
    setShowDiscovery(false);
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
            gameType: "artist",
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
      <GameLayout title="Who's That?" color="#9b59ff" onBack={handleBack}>
        <LoadingState />
      </GameLayout>
    );
  }

  if (!current) return null;

  const isCorrect = guess === current.name;
  const isWrong = guess !== null && guess !== "__timeout__" && !isCorrect;
  const isTimeout = guess === "__timeout__";

  // Blur decreases from 40px → 0px as time runs out
  const blurAmount =
    guess === null
      ? Math.max(0, (timeLeft / REVEAL_TIME) * 40)
      : 0;
  const brightnessAmount =
    guess === null
      ? 0.3 + (1 - timeLeft / REVEAL_TIME) * 0.7
      : 1;

  const topTracksContent =
    topTracks.length > 0 ? (
      <div className="font-mono text-xs text-textdim text-center">
        <span
          className="uppercase tracking-widest"
          style={{ color: "rgba(155,89,255,0.6)" }}
        >
          Top tracks
        </span>
        <div className="mt-1 space-y-0.5">
          {topTracks.map((t, i) => (
            <div key={i} className="text-textmid">
              {t}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <GameLayout
      title="Who's That?"
      color="#9b59ff"
      onBack={handleBack}
      stats={{ round: round + 1, correct, total: totalAnswered }}
    >
      <div className="flex flex-col items-center gap-8 py-8">
        {/* Reveal progress bar */}
        <div className="w-full max-w-md">
          <div className="flex justify-between font-mono text-xs text-textdim mb-2">
            <span>REVEALING IN</span>
            <span className="text-accent3">{timeLeft}s</span>
          </div>
          <div className="h-px bg-border w-full relative overflow-hidden">
            <div
              className="h-px bg-accent3 transition-all duration-1000"
              style={{ width: `${(timeLeft / REVEAL_TIME) * 100}%` }}
            />
          </div>
        </div>

        {/* Artist image with blur effect */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 overflow-hidden">
          <img
            src={current.imageUrl}
            alt="Artist"
            className="w-full h-full object-cover object-top transition-all duration-700"
            style={{
              filter: `blur(${blurAmount}px) brightness(${brightnessAmount}) saturate(0.2)`,
              transform: `scale(${guess === null ? 1.1 : 1})`,
            }}
          />
          {/* Overlay effects */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, rgba(155,89,255,0.2) 0%, transparent 100%)`,
              opacity: guess === null ? 1 : 0,
              transform: `scale(${guess === null ? 1.1 : 1})`,
              transition: "opacity 0.5s ease",
            }}
          />

          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)",
            }}
          />

          {isCorrect && (
            <div className="absolute inset-0 bg-accent3/20 flex items-end justify-start p-4">
              <div>
                <span className="font-display text-4xl text-accent3 block">
                  {current.name}
                </span>
                <span className="font-mono text-xs text-accent3/70">
                  {current.genres.join(" · ")}
                </span>
              </div>
            </div>
          )}
          {(isWrong || isTimeout) && (
            <div className="absolute inset-0 bg-accent2/10 flex items-end justify-start p-4">
              <div>
                <span className="font-display text-2xl text-accent2 block">
                  {current.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Hint */}
        {guess === null && timeLeft <= 7 && current.genres.length > 0 && (
          <div className="font-mono text-xs text-textdim text-center animate-reveal">
            Genre hint:{" "}
            <span className="text-accent3">{current.genres[0]}</span>
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
          {options.map((opt) => {
            const isThis = opt === current.name;
            const wasChosen = guess === opt;
            let borderColor = "#252530";
            let bgColor = "transparent";
            let textColor = "#999";

            if (guess !== null) {
              if (isThis) {
                borderColor = "#9b59ff";
                bgColor = "rgba(155,89,255,0.08)";
                textColor = "#9b59ff";
              } else if (wasChosen && !isThis) {
                borderColor = "#ff4060";
                bgColor = "rgba(255,64,96,0.06)";
                textColor = "#ff4060";
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

        {/* Discovery panel */}
        {showDiscovery && (
          <DiscoveryPanel
            items={discoveryItems}
            label="YOU MIGHT ALSO LIKE"
            color="#9b59ff"
            onNext={handleDiscoveryNext}
            autoAdvanceSec={30}
            extraContent={topTracksContent}
          />
        )}
      </div>

      {popupPts && <ScorePopup points={popupPts} color="#9b59ff" />}
    </GameLayout>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-16 h-16 border border-accent3/30 border-t-accent3 rounded-full animate-spin" />
      <span className="font-mono text-xs text-textdim tracking-widest">
        LOADING YOUR ARTISTS...
      </span>
    </div>
  );
}
