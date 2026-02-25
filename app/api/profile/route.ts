import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/discover-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { userId, session } = await getAuthedUser();
  if (!userId || !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [sessionsResult, savesResult] = await Promise.all([
    supabaseAdmin
      .from("game_sessions")
      .select("game_type, score, rounds_played, correct_answers, max_streak, played_at")
      .eq("user_id", userId)
      .order("played_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("playlist_saves")
      .select(
        `created_at,
         playlist_submissions (
           id,
           one_liner,
           mood_tags,
           playlists (
             spotify_playlist_id,
             url,
             title,
             image,
             owner_name,
             track_count
           )
         )`
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const allSessions = sessionsResult.data ?? [];

  // Best score per game type
  const bestScores: Record<string, number> = {};
  for (const s of allSessions) {
    const gt = s.game_type as string;
    if (bestScores[gt] === undefined || s.score > bestScores[gt]) {
      bestScores[gt] = s.score;
    }
  }

  const recentSessions = allSessions.slice(0, 10).map((s) => ({
    gameType: s.game_type,
    score: s.score,
    roundsPlayed: s.rounds_played,
    correctAnswers: s.correct_answers,
    maxStreak: s.max_streak,
    createdAt: s.played_at,
  }));

  const savedPlaylists = (savesResult.data ?? [])
    .map((save: any) => {
      const sub = save.playlist_submissions;
      const pl = sub?.playlists;
      if (!sub || !pl) return null;
      return {
        submissionId: sub.id as string,
        oneLiner: sub.one_liner as string,
        moodTags: (sub.mood_tags ?? []) as string[],
        savedAt: save.created_at as string,
        playlist: {
          spotifyPlaylistId: pl.spotify_playlist_id as string,
          url: pl.url as string,
          title: pl.title as string,
          image: (pl.image ?? null) as string | null,
          ownerName: pl.owner_name as string,
          trackCount: pl.track_count as number,
        },
      };
    })
    .filter(Boolean);

  return NextResponse.json({
    user: {
      name: session.user?.name ?? null,
      image: session.user?.image ?? null,
    },
    bestScores,
    recentSessions,
    savedPlaylists,
  });
}
