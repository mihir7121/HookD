import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const spotifyId = session ? ((session as any).spotifyId as string) : null;

  const { searchParams } = new URL(req.url);
  const gameType = searchParams.get("gameType") ?? "overall";

  const VALID_TYPES = ["blind", "overall"];
  if (!VALID_TYPES.includes(gameType)) {
    return NextResponse.json({ error: "Invalid gameType" }, { status: 400 });
  }

  if (gameType === "overall") {
    // Fetch all sessions joined with users, compute best per game type per user, then sum
    const { data: sessions, error } = await supabaseAdmin
      .from("game_sessions")
      .select("user_id, game_type, score, rounds_played, correct_answers, max_streak, users!inner(name, image, spotify_id)");

    if (error) {
      console.error("Overall leaderboard query error:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    // Build per-user aggregates: sum of best score per game type
    const userMap = new Map<string, {
      user_id: string;
      name: string;
      image: string | null;
      spotify_id: string;
      bestPerGame: Map<string, number>;
      totalRounds: number;
      totalCorrect: number;
      maxStreak: number;
    }>();

    for (const row of sessions ?? []) {
      const uid = row.user_id;
      const u = row.users as any;
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          user_id: uid,
          name: u.name,
          image: u.image,
          spotify_id: u.spotify_id,
          bestPerGame: new Map(),
          totalRounds: 0,
          totalCorrect: 0,
          maxStreak: 0,
        });
      }
      const entry = userMap.get(uid)!;
      const prev = entry.bestPerGame.get(row.game_type) ?? 0;
      if (row.score > prev) entry.bestPerGame.set(row.game_type, row.score);
      entry.totalRounds += row.rounds_played;
      entry.totalCorrect += row.correct_answers;
      if (row.max_streak > entry.maxStreak) entry.maxStreak = row.max_streak;
    }

    const ranked = Array.from(userMap.values())
      .map((u) => ({
        user_id: u.user_id,
        name: u.name,
        image: u.image,
        spotify_id: u.spotify_id,
        score: Array.from(u.bestPerGame.values()).reduce((a, b) => a + b, 0),
        rounds_played: u.totalRounds,
        correct_answers: u.totalCorrect,
        max_streak: u.maxStreak,
      }))
      .sort((a, b) => b.score - a.score)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    const top20 = ranked.slice(0, 20);
    let myRank: number | null = null;
    let myEntry = null;
    if (spotifyId) {
      const myIdx = ranked.findIndex((r) => r.spotify_id === spotifyId);
      if (myIdx >= 0) {
        myRank = myIdx + 1;
        myEntry = ranked[myIdx];
      }
    }

    return NextResponse.json({ entries: top20, myRank, myEntry });
  }

  // Per-game leaderboard: max score per user for this game type
  const { data: rows, error } = await supabaseAdmin
    .from("game_sessions")
    .select("user_id, score, rounds_played, correct_answers, max_streak, users!inner(name, image, spotify_id)")
    .eq("game_type", gameType)
    .order("score", { ascending: false });

  if (error) {
    console.error("Leaderboard query error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  // Deduplicate: keep best score per user
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const row of rows ?? []) {
    if (!seen.has(row.user_id)) {
      seen.add(row.user_id);
      deduped.push(row);
    }
  }

  const top20 = deduped.slice(0, 20).map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    name: (r.users as any).name,
    image: (r.users as any).image,
    spotify_id: (r.users as any).spotify_id,
    score: r.score,
    rounds_played: r.rounds_played,
    correct_answers: r.correct_answers,
    max_streak: r.max_streak,
  }));

  let myRank: number | null = null;
  let myEntry = null;
  if (spotifyId) {
    const myIdx = deduped.findIndex((r) => (r.users as any).spotify_id === spotifyId);
    if (myIdx >= 0) {
      myRank = myIdx + 1;
      myEntry = top20.find((e) => e.spotify_id === spotifyId) ?? {
        rank: myIdx + 1,
        user_id: deduped[myIdx].user_id,
        name: (deduped[myIdx].users as any).name,
        image: (deduped[myIdx].users as any).image,
        spotify_id: spotifyId,
        score: deduped[myIdx].score,
        rounds_played: deduped[myIdx].rounds_played,
        correct_answers: deduped[myIdx].correct_answers,
        max_streak: deduped[myIdx].max_streak,
      };
    }
  }

  return NextResponse.json({ entries: top20, myRank, myEntry });
}
