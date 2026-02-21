"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { getNewReleases, getTopTracks, getArtistAlbums, shuffle } from "@/lib/spotify";
import { useGameStore } from "@/lib/store";
import GameLayout from "@/components/GameLayout";
import ScorePopup from "@/components/ScorePopup";
import DiscoveryPanel, { DiscoveryItem } from "@/components/DiscoveryPanel";

interface Album {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  imageUrl: string;
  spotifyUrl: string;
}

const ROUND_TIME = 15; // seconds
const POINTS_MAX = 500;
const POINTS_MIN = 100;

export default function AlbumGame() {
  const { data: session } = useSession();
  const router = useRouter();
  const { addPoints, endStreak, maxStreak } = useGameStore();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [current, setCurrent] = useState<Album | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [guess, setGuess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [round, setRound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [popupPts, setPopupPts] = useState<number | null>(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [discoveryItems, setDiscoveryItems] = useState<DiscoveryItem[]>([]);

  const savedRef = useRef(false);
  const accessToken = (session as any)?.accessToken as string | undefined;

  // Load albums from Spotify
  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const [newRel, topTracks] = await Promise.all([
          getNewReleases(accessToken, 20),
          getTopTracks(accessToken, 50),
        ]);

        const albumsMap = new Map<string, Album>();

        // From new releases
        newRel.albums.items.forEach((a: any) => {
          albumsMap.set(a.id, {
            id: a.id,
            name: a.name,
            artist: a.artists[0].name,
            artistId: a.artists[0].id,
            imageUrl: a.images[0]?.url,
            spotifyUrl: a.external_urls?.spotify ?? "",
          });
        });

        // From top tracks
        topTracks.items.forEach((t: any) => {
          const a = t.album;
          albumsMap.set(a.id, {
            id: a.id,
            name: a.name,
            artist: a.artists[0].name,
            artistId: a.artists[0].id,
            imageUrl: a.images[0]?.url,
            spotifyUrl: a.external_urls?.spotify ?? "",
          });
        });

        setAlbums(shuffle(Array.from(albumsMap.values())).slice(0, 30));
        setLoading(false);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const setupRound = useCallback(
    (albumList: Album[], roundIndex: number) => {
      const currentAlbum = albumList[roundIndex % albumList.length];
      setCurrent(currentAlbum);
      setGuess(null);
      setTimeLeft(ROUND_TIME);
      setShowDiscovery(false);
      setDiscoveryItems([]);

      // Build 4 options (1 correct + 3 wrong)
      const others = albumList
        .filter((a) => a.id !== currentAlbum.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((a) => a.name);

      setOptions(shuffle([currentAlbum.name, ...others]));
    },
    []
  );

  const fetchDiscovery = useCallback(
    async (album: Album) => {
      if (!accessToken) return;
      try {
        // Fetch more albums from the same artist (related-artists API was removed Nov 2024)
        const data = await getArtistAlbums(album.artistId, accessToken, 4);
        const items: DiscoveryItem[] = (data.items ?? [])
          .filter((a: any) => a.id !== album.id)
          .slice(0, 3)
          .map((a: any) => ({
            id: a.id,
            name: a.name,
            subtitle: album.artist,
            imageUrl: a.images[0]?.url ?? "",
            spotifyUrl: a.external_urls?.spotify ?? "",
          }));
        setDiscoveryItems(items);
      } catch (e) {
        console.error("Album discovery fetch failed:", e);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (albums.length > 0) {
      const album = albums[round % albums.length];
      setupRound(albums, round);
      fetchDiscovery(album); // pre-fetch while user is still guessing
    }
  }, [albums, round, setupRound, fetchDiscovery]);

  // Countdown timer
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
            gameType: "album",
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
      <GameLayout title="Cover ID" color="#c8ff00" onBack={handleBack}>
        <LoadingState />
      </GameLayout>
    );
  }

  if (!current) return null;

  const isCorrect = guess === current.name;
  const isWrong = guess !== null && guess !== "__timeout__" && !isCorrect;
  const isTimeout = guess === "__timeout__";

  return (
    <GameLayout
      title="Cover ID"
      color="#c8ff00"
      onBack={handleBack}
      stats={{ round: round + 1, correct, total: totalAnswered }}
    >
      <div className="flex flex-col items-center gap-8 py-8">
        {/* Timer bar */}
        <div className="w-full max-w-md">
          <div className="flex justify-between font-mono text-xs text-textdim mb-2">
            <span>TIME</span>
            <span
              className={timeLeft <= 5 ? "text-accent2 animate-pulse-accent" : "text-accent"}
            >
              {timeLeft}s
            </span>
          </div>
          <div className="h-px bg-border w-full">
            <div
              className="h-px bg-accent transition-all duration-1000"
              style={{ width: `${(timeLeft / ROUND_TIME) * 100}%` }}
            />
          </div>
        </div>

        {/* Album cover */}
        <div className="relative w-64 h-64 md:w-80 md:h-80">
          <img
            src={current.imageUrl}
            alt="Album cover"
            className={`w-full h-full object-cover transition-all duration-500 ${
              guess !== null ? "opacity-100" : "opacity-90 hover:opacity-100"
            } ${isCorrect ? "ring-2 ring-accent" : ""} ${
              isWrong || isTimeout ? "ring-2 ring-accent2" : ""
            }`}
          />
          {isCorrect && (
            <div className="absolute inset-0 bg-accent/10 flex items-center justify-center">
              <span className="font-display text-6xl text-accent">✓</span>
            </div>
          )}
          {(isWrong || isTimeout) && (
            <div className="absolute inset-0 bg-accent2/10 flex items-center justify-center">
              <span className="font-display text-5xl text-accent2">
                {isTimeout ? "⏱" : "✗"}
              </span>
            </div>
          )}
        </div>

        {/* Question */}
        <div className="text-center">
          <p className="font-mono text-xs text-textdim tracking-widest uppercase mb-1">
            Which album is this?
          </p>
          {guess !== null && (
            <p className="font-body italic text-textmid text-sm mt-2">
              By {current.artist}
            </p>
          )}
        </div>

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
                borderColor = "#c8ff00";
                bgColor = "rgba(200,255,0,0.08)";
                textColor = "#c8ff00";
              } else if (wasChosen && !isThis) {
                borderColor = "#ff4060";
                bgColor = "rgba(255,64,96,0.08)";
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
            label="DISCOVER SIMILAR ALBUMS"
            color="#c8ff00"
            onNext={handleDiscoveryNext}
            autoAdvanceSec={30}
          />
        )}
      </div>

      {popupPts && <ScorePopup points={popupPts} />}
    </GameLayout>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div className="w-16 h-16 border border-accent/30 border-t-accent rounded-full animate-spin" />
      <span className="font-mono text-xs text-textdim tracking-widest">
        FETCHING YOUR ALBUMS...
      </span>
    </div>
  );
}
