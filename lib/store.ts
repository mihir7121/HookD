import { create } from "zustand";

interface GameState {
  score: number;
  streak: number;
  maxStreak: number;
  addPoints: (pts: number) => void;
  resetScore: () => void;
  endStreak: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  streak: 0,
  maxStreak: 0,
  addPoints: (pts) =>
    set((s) => ({
      score: s.score + pts,
      streak: s.streak + 1,
      maxStreak: Math.max(s.maxStreak, s.streak + 1),
    })),
  resetScore: () => set({ score: 0, streak: 0, maxStreak: 0 }),
  endStreak: () => set({ streak: 0 }),
}));
