"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, PanInfo } from "framer-motion";
import GameLayout from "@/components/GameLayout";
import ScorePopup from "@/components/ScorePopup";
import { HowToPlay, useHowToPlay } from "@/components/HowToPlay";
import { getTopTracks, shuffle } from "@/lib/spotify";
import { useGameStore } from "@/lib/store";
import {
  GridSize,
  SlideBoard,
  areAdjacent,
  getMovableIndices,
  isSolved,
  moveTile,
  parMovesBySize,
  scrambleUniqueBoard,
} from "@/lib/slide-puzzle";

const COLOR = "#ff9f1c";
const MOVE_ANIMATION_MS = 210;
const HINT_DURATION_MS = 2200;
const MAX_HINTS = 3;

const DIFFICULTY_CONFIG: Record<GridSize, { label: string; timeLimit: number; baseScore: number; timeWeight: number; moveWeight: number }> = {
  3: { label: "Easy", timeLimit: 90, baseScore: 1200, timeWeight: 4, moveWeight: 6 },
  5: { label: "Medium", timeLimit: 180, baseScore: 2200, timeWeight: 3, moveWeight: 4 },
  7: { label: "Hard", timeLimit: 300, baseScore: 3600, timeWeight: 2, moveWeight: 3 },
};

type Phase = "loading" | "difficulty" | "ingame" | "won" | "failed";

interface PuzzleAlbum {
  id: string;
  name: string;
  image: string;
  artistName: string;
}

export default function CoverSlidePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addPoints, endStreak } = useGameStore();

  const [phase, setPhase] = useState<Phase>("loading");
  const [albums, setAlbums] = useState<PuzzleAlbum[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [difficulty, setDifficulty] = useState<GridSize>(3);
  const [board, setBoard] = useState<SlideBoard | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<PuzzleAlbum | null>(null);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [solvedSeconds, setSolvedSeconds] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [popupPts, setPopupPts] = useState<number | null>(null);
  const [inputLocked, setInputLocked] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHintPreview, setShowHintPreview] = useState(false);
  const [hintTileIndex, setHintTileIndex] = useState<number | null>(null);

  const startedAtRef = useRef<number>(0);
  const solvedRef = useRef(false);
  const savedRef = useRef(false);
  const hintTimeoutRef = useRef<number | null>(null);
  const usedShufflesRef = useRef(
    new Map<GridSize, Set<string>>([
      [3, new Set<string>()],
      [5, new Set<string>()],
      [7, new Set<string>()],
    ])
  );

  const accessToken = (session as any)?.accessToken as string | undefined;
  const config = DIFFICULTY_CONFIG[difficulty];
  const { show: showHtp, dismiss: dismissHtp, neverShow: neverShowHtp } = useHowToPlay("slide");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (!accessToken) return;

    (async () => {
      try {
        const tracksData = await getTopTracks(accessToken, 50);
        const albumMap = new Map<string, PuzzleAlbum>();

        for (const track of tracksData.items ?? []) {
          const id = track.album?.id;
          const image = track.album?.images?.[0]?.url;
          if (!id || !image || albumMap.has(id)) continue;
          albumMap.set(id, {
            id,
            name: track.album.name,
            image,
            artistName: track.artists?.[0]?.name ?? "Unknown artist",
          });
        }

        const nextAlbums = Array.from(albumMap.values());
        if (nextAlbums.length < 5) {
          setLoadError("Not enough album art in your library yet. Play more music and try again.");
          setPhase("difficulty");
          return;
        }

        setAlbums(nextAlbums);
        setLoadError(null);
        setPhase("difficulty");
      } catch {
        setLoadError("Failed to load album covers. Please try again.");
        setPhase("difficulty");
      }
    })();
  }, [accessToken]);

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) window.clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase !== "ingame") return;
    if (timeLeft <= 0) {
      if (!solvedRef.current) {
        endStreak();
        setInputLocked(true);
        setPhase("failed");
      }
      return;
    }

    const t = setTimeout(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearTimeout(t);
  }, [phase, timeLeft, endStreak]);

  const boardDistanceScore = useCallback((candidate: SlideBoard): number => {
    const total = candidate.size * candidate.size;
    let distance = 0;
    for (let index = 0; index < total; index++) {
      const value = candidate.tiles[index];
      if (value === 0) continue;
      const target = value - 1;
      const row = Math.floor(index / candidate.size);
      const col = index % candidate.size;
      const targetRow = Math.floor(target / candidate.size);
      const targetCol = target % candidate.size;
      distance += Math.abs(row - targetRow) + Math.abs(col - targetCol);
    }
    return distance;
  }, []);

  const findBestHintMove = useCallback(
    (candidate: SlideBoard): number | null => {
      const movable = getMovableIndices(candidate.blankIndex, candidate.size);
      if (movable.length === 0) return null;

      let bestIndex = movable[0];
      let bestScore = Number.POSITIVE_INFINITY;
      for (const moveIndex of movable) {
        const next = moveTile(candidate, moveIndex);
        const score = boardDistanceScore(next);
        if (score < bestScore) {
          bestScore = score;
          bestIndex = moveIndex;
        }
      }

      return bestIndex;
    },
    [boardDistanceScore]
  );

  const resetRunState = useCallback((size: GridSize, album: PuzzleAlbum) => {
    const used = usedShufflesRef.current.get(size) ?? new Set<string>();
    usedShufflesRef.current.set(size, used);
    const nextBoard = scrambleUniqueBoard(size, used);

    setDifficulty(size);
    setBoard(nextBoard);
    setSelectedAlbum(album);
    setMoves(0);
    setFinalScore(0);
    setSolvedSeconds(0);
    setTimeLeft(DIFFICULTY_CONFIG[size].timeLimit);
    setInputLocked(false);
    setHintsUsed(0);
    setShowHintPreview(false);
    setHintTileIndex(null);
    solvedRef.current = false;
    savedRef.current = false;
    startedAtRef.current = Date.now();
    setPhase("ingame");
  }, []);

  const handleHint = useCallback(() => {
    if (phase !== "ingame" || !board) return;
    if (inputLocked || hintsUsed >= MAX_HINTS) return;

    if (hintTimeoutRef.current) window.clearTimeout(hintTimeoutRef.current);

    setHintsUsed((prev) => prev + 1);
    setShowHintPreview(true);
    setHintTileIndex(findBestHintMove(board));

    hintTimeoutRef.current = window.setTimeout(() => {
      setShowHintPreview(false);
      setHintTileIndex(null);
      hintTimeoutRef.current = null;
    }, HINT_DURATION_MS);
  }, [board, findBestHintMove, hintsUsed, inputLocked, phase]);

  const startGame = useCallback(
    (size: GridSize) => {
      if (albums.length === 0) return;
      const [picked] = shuffle(albums);
      resetRunState(size, picked);
    },
    [albums, resetRunState]
  );

  const saveSession = useCallback(async (score: number) => {
    if (savedRef.current || score <= 0) return;
    savedRef.current = true;
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: "slide",
          score,
          roundsPlayed: 1,
          correctAnswers: 1,
          maxStreak: 1,
        }),
      });
    } catch (error) {
      console.error("Failed to save slide session", error);
    }
  }, []);

  const completeRun = useCallback(
    (nextMoves: number) => {
      if (solvedRef.current) return;
      solvedRef.current = true;
      setInputLocked(true);

      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
      const parMoves = parMovesBySize(difficulty);
      const overMoves = Math.max(0, nextMoves - parMoves);

      const score = Math.max(
        100,
        config.baseScore - elapsedSeconds * config.timeWeight - overMoves * config.moveWeight
      );

      setSolvedSeconds(elapsedSeconds);
      setFinalScore(score);
      setPopupPts(score);
      setTimeout(() => setPopupPts(null), 1300);

      addPoints(score);
      void saveSession(score);
      setPhase("won");
    },
    [addPoints, config.baseScore, config.moveWeight, config.timeWeight, difficulty, saveSession]
  );

  const attemptMove = useCallback(
    (tileIndex: number) => {
      if (phase !== "ingame" || !board) return;
      if (inputLocked) return;
      if (!areAdjacent(tileIndex, board.blankIndex, board.size)) return;

      setInputLocked(true);
      const nextBoard = moveTile(board, tileIndex);
      const nextMoves = moves + 1;
      setBoard(nextBoard);
      setMoves(nextMoves);

      if (isSolved(nextBoard)) {
        completeRun(nextMoves);
      } else {
        window.setTimeout(() => setInputLocked(false), MOVE_ANIMATION_MS);
      }
    },
    [board, completeRun, inputLocked, moves, phase]
  );

  const handleSwipeEnd = useCallback(
    (tileIndex: number, info: PanInfo) => {
      if (!board || phase !== "ingame") return;
      if (inputLocked) return;
      if (!areAdjacent(tileIndex, board.blankIndex, board.size)) return;

      const delta = board.blankIndex - tileIndex;
      const threshold = 30;

      if (delta === 1 && info.offset.x > threshold) {
        attemptMove(tileIndex);
        return;
      }
      if (delta === -1 && info.offset.x < -threshold) {
        attemptMove(tileIndex);
        return;
      }
      if (delta === board.size && info.offset.y > threshold) {
        attemptMove(tileIndex);
        return;
      }
      if (delta === -board.size && info.offset.y < -threshold) {
        attemptMove(tileIndex);
      }
    },
    [attemptMove, board, inputLocked, phase]
  );

  const backToLobby = () => router.push("/game");

  if (status === "loading" || phase === "loading") {
    return (
      <GameLayout title="Cover Slide" color={COLOR} onBack={backToLobby}>
        <LoadingState text="LOADING ALBUM ART..." color={COLOR} />
      </GameLayout>
    );
  }

  if (phase === "difficulty") {
    return (
      <>
        {showHtp && <HowToPlay gameId="slide" onDismiss={dismissHtp} onNeverShow={neverShowHtp} />}
        <GameLayout title="Cover Slide" color={COLOR} onBack={backToLobby}>
        <div className="max-w-xl mx-auto py-12 px-4 flex flex-col gap-8">
          <div className="text-center">
            <p className="font-display text-4xl leading-none" style={{ color: COLOR }}>
              PICK YOUR GRID
            </p>
            <p className="font-body italic text-textmid mt-2">
              Rebuild the album art by sliding tiles into the empty space.
            </p>
            <p className="font-mono text-[10px] tracking-[0.18em] text-textdim mt-4">
              Hard fail enabled. If time runs out, the run ends.
            </p>
            {loadError && <p className="font-mono text-xs mt-3 text-accent2">{loadError}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([3, 5, 7] as GridSize[]).map((size) => (
              <DifficultyCard
                key={size}
                size={size}
                active={difficulty === size}
                onClick={() => setDifficulty(size)}
              />
            ))}
          </div>

          <button
            onClick={() => startGame(difficulty)}
            disabled={albums.length === 0}
            className="w-full py-4 rounded-2xl font-mono text-xs tracking-[0.22em] transition-all disabled:opacity-40"
            style={{
              border: `1px solid ${COLOR}70`,
              color: COLOR,
              background: `linear-gradient(135deg, ${COLOR}30, ${COLOR}12)`,
              boxShadow: `0 0 34px ${COLOR}24`,
            }}
          >
            START COVER SLIDE →
          </button>
        </div>
        </GameLayout>
      </>
    );
  }

  if (!selectedAlbum) return null;

  if (phase === "won") {
    return (
      <GameLayout title="Cover Slide" color={COLOR} onBack={backToLobby}>
        <EndScreen
          won
          album={selectedAlbum}
          color={COLOR}
          score={finalScore}
          difficulty={difficulty}
          moves={moves}
          timeTaken={solvedSeconds}
          onReplay={() => startGame(difficulty)}
          onChangeDifficulty={() => setPhase("difficulty")}
          onBack={backToLobby}
        />
      </GameLayout>
    );
  }

  if (phase === "failed") {
    return (
      <GameLayout title="Cover Slide" color={COLOR} onBack={backToLobby}>
        <EndScreen
          won={false}
          album={selectedAlbum}
          color={COLOR}
          score={0}
          difficulty={difficulty}
          moves={moves}
          timeTaken={config.timeLimit}
          onReplay={() => startGame(difficulty)}
          onChangeDifficulty={() => setPhase("difficulty")}
          onBack={backToLobby}
        />
      </GameLayout>
    );
  }

  if (!board) return null;

  return (
    <GameLayout title="Cover Slide" color={COLOR} onBack={backToLobby}>
      <div className="w-full max-w-xl mx-auto py-7 px-3 flex flex-col gap-5">
        <div className="rounded-2xl border border-border bg-bg2/80 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.18em] text-textdim">DIFFICULTY</p>
            <p className="font-display text-3xl leading-none" style={{ color: COLOR }}>
              {difficulty}x{difficulty}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] tracking-[0.18em] text-textdim">TIME LEFT</p>
            <p
              className="font-display text-4xl leading-none"
              style={{ color: timeLeft <= 10 ? "#ff4060" : COLOR }}
            >
              {timeLeft}s
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] tracking-[0.18em] text-textdim">MOVES</p>
            <p className="font-display text-4xl leading-none text-white">{moves}</p>
          </div>
        </div>

        <PuzzleBoard
          board={board}
          image={selectedAlbum.image}
          color={COLOR}
          inputLocked={inputLocked}
          showHintPreview={showHintPreview}
          hintTileIndex={hintTileIndex}
          onTapMove={attemptMove}
          onSwipeMove={handleSwipeEnd}
        />

        <div className="flex items-center justify-between rounded-xl border border-border bg-bg2/70 px-3 py-2">
          <p className="font-mono text-[10px] tracking-[0.14em] text-textdim uppercase">
            Hints left: {MAX_HINTS - hintsUsed}
          </p>
          <button
            onClick={handleHint}
            disabled={inputLocked || hintsUsed >= MAX_HINTS}
            className="px-3 py-1.5 rounded-lg font-mono text-[10px] tracking-[0.14em] border disabled:opacity-40"
            style={{ borderColor: `${COLOR}66`, color: COLOR }}
          >
            SHOW HINT
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-bg2/80 p-4">
          <p className="font-display text-3xl leading-none text-white truncate">{selectedAlbum.name}</p>
          <p className="font-mono text-[10px] tracking-[0.16em] text-textdim mt-1 uppercase truncate">
            {selectedAlbum.artistName}
          </p>
          <p className="font-body italic text-textmid mt-3 text-sm">
            Tap an adjacent tile to slide, or drag it toward the empty slot.
          </p>
        </div>
      </div>

      {popupPts && <ScorePopup points={popupPts} color={COLOR} />}
    </GameLayout>
  );
}

function PuzzleBoard({
  board,
  image,
  color,
  inputLocked,
  showHintPreview,
  hintTileIndex,
  onTapMove,
  onSwipeMove,
}: {
  board: SlideBoard;
  image: string;
  color: string;
  inputLocked: boolean;
  showHintPreview: boolean;
  hintTileIndex: number | null;
  onTapMove: (index: number) => void;
  onSwipeMove: (index: number, info: PanInfo) => void;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [boardPx, setBoardPx] = useState(380);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 380;
      setBoardPx(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tilePx = boardPx / board.size;
  const moveable = useMemo(() => new Set(getMovableIndices(board.blankIndex, board.size)), [board.blankIndex, board.size]);

  return (
    <div
      ref={boardRef}
      className="relative w-full max-w-[460px] mx-auto aspect-square rounded-2xl overflow-hidden"
      style={{
        background: "#050507",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: `0 20px 50px rgba(0,0,0,0.65), 0 0 42px ${color}1f`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(transparent calc(100% - 1px), rgba(255,255,255,0.09) calc(100% - 1px)), linear-gradient(90deg, transparent calc(100% - 1px), rgba(255,255,255,0.09) calc(100% - 1px))",
          backgroundSize: `${100 / board.size}% ${100 / board.size}%`,
        }}
      />

      {showHintPreview && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: `${boardPx}px ${boardPx}px`,
              backgroundPosition: "0 0",
              backgroundRepeat: "no-repeat",
              opacity: 0.62,
              filter: "saturate(1.1)",
            }}
          />
          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/65 border border-white/20 font-mono text-[9px] tracking-[0.14em] text-white/85">
            HINT PREVIEW
          </div>
        </div>
      )}

      {board.tiles.map((value, index) => {
        if (value === 0) {
          return (
            <div
              key="blank"
              className="absolute rounded-lg"
              style={{
                width: tilePx,
                height: tilePx,
                transform: `translate(${(index % board.size) * tilePx}px, ${Math.floor(index / board.size) * tilePx}px)`,
                background: "rgba(0,0,0,0.48)",
                boxShadow: "inset 0 0 14px rgba(0,0,0,0.6)",
              }}
            />
          );
        }

        const currentIndex = index;
        const row = Math.floor((value - 1) / board.size);
        const col = (value - 1) % board.size;
        const movable = moveable.has(currentIndex);
        const locked = inputLocked || !movable;

        return (
          <motion.button
            key={value}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onTapMove(currentIndex)}
            onPanEnd={(_, info) => onSwipeMove(currentIndex, info)}
            className="absolute rounded-lg"
            style={{
              width: tilePx,
              height: tilePx,
              left: 0,
              top: 0,
              backgroundImage: `url(${image})`,
              backgroundSize: `${boardPx}px ${boardPx}px`,
              backgroundPosition: `${-col * tilePx}px ${-row * tilePx}px`,
              backgroundRepeat: "no-repeat",
              border: movable ? `1px solid ${color}60` : "1px solid rgba(255,255,255,0.08)",
              boxShadow: movable
                ? `0 4px 18px ${color}2c, inset 0 1px 0 rgba(255,255,255,0.24)`
                : "0 2px 10px rgba(0,0,0,0.35)",
              willChange: "transform",
              cursor: locked ? "default" : "pointer",
              touchAction: "none",
              pointerEvents: locked ? "none" : "auto",
              zIndex: currentIndex === hintTileIndex ? 12 : 2,
            }}
            animate={{
              x: (currentIndex % board.size) * tilePx,
              y: Math.floor(currentIndex / board.size) * tilePx,
              scale: currentIndex === hintTileIndex ? 1.05 : 1,
            }}
            transition={{ type: "spring", stiffness: 560, damping: 42, mass: 0.4 }}
          />
        );
      })}
    </div>
  );
}

function DifficultyCard({
  size,
  active,
  onClick,
}: {
  size: GridSize;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = DIFFICULTY_CONFIG[size];
  return (
    <button
      onClick={onClick}
      className="p-4 rounded-2xl text-left transition-all"
      style={{
        background: active ? `${COLOR}14` : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? COLOR + "70" : "rgba(255,255,255,0.08)"}`,
        boxShadow: active ? `0 0 20px ${COLOR}20` : "none",
      }}
    >
      <p className="font-display text-4xl leading-none" style={{ color: active ? COLOR : "#fff" }}>
        {size}x{size}
      </p>
      <p className="font-mono text-[10px] tracking-[0.16em] mt-2 text-textdim uppercase">{cfg.label}</p>
      <p className="font-mono text-[10px] tracking-[0.16em] mt-1" style={{ color: active ? COLOR : "#8d8d95" }}>
        {cfg.timeLimit}s
      </p>
    </button>
  );
}

function EndScreen({
  won,
  album,
  color,
  score,
  difficulty,
  moves,
  timeTaken,
  onReplay,
  onChangeDifficulty,
  onBack,
}: {
  won: boolean;
  album: PuzzleAlbum;
  color: string;
  score: number;
  difficulty: GridSize;
  moves: number;
  timeTaken: number;
  onReplay: () => void;
  onChangeDifficulty: () => void;
  onBack: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto py-10 px-4 flex flex-col items-center gap-5">
      <p className="font-display text-5xl leading-none" style={{ color: won ? color : "#ff4060" }}>
        {won ? "PUZZLE SOLVED" : "TIME'S UP"}
      </p>

      <div
        className="w-64 h-64 rounded-2xl overflow-hidden"
        style={{
          border: `1px solid ${won ? color + "60" : "rgba(255,255,255,0.12)"}`,
          boxShadow: won ? `0 0 38px ${color}2c` : "0 0 22px rgba(255,255,255,0.09)",
        }}
      >
        <img src={album.image} alt={album.name} className="w-full h-full object-cover" />
      </div>

      <div className="w-full rounded-2xl border border-border bg-bg2 p-5 grid grid-cols-2 gap-3">
        <Stat label="Difficulty" value={`${difficulty}x${difficulty}`} color={color} />
        <Stat label="Moves" value={String(moves)} color="#fff" />
        <Stat label="Time" value={`${timeTaken}s`} color={won ? color : "#ff4060"} />
        <Stat label="Score" value={score.toLocaleString()} color={won ? color : "#aaa"} />
      </div>

      <div className="w-full flex flex-col gap-3">
        <button
          onClick={onReplay}
          className="w-full py-4 rounded-2xl font-mono text-xs tracking-[0.2em]"
          style={{
            border: `1px solid ${color}70`,
            color: color,
            background: `linear-gradient(135deg, ${color}30, ${color}12)`,
          }}
        >
          PLAY AGAIN →
        </button>
        <button
          onClick={onChangeDifficulty}
          className="w-full py-3 rounded-2xl font-mono text-xs tracking-[0.2em] border border-border text-textmid"
        >
          CHANGE DIFFICULTY
        </button>
        <button
          onClick={onBack}
          className="w-full py-3 rounded-2xl font-mono text-xs tracking-[0.2em] border border-border text-textdim"
        >
          BACK TO LOBBY
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg/50 px-3 py-2">
      <p className="font-mono text-[10px] text-textdim tracking-[0.16em] uppercase">{label}</p>
      <p className="font-display text-3xl leading-none mt-1" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

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
