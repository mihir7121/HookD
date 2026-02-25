import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spotifyId = (session as any).spotifyId as string | undefined;
  if (!spotifyId) {
    return NextResponse.json({ error: "No spotifyId in session" }, { status: 400 });
  }

  const body = await req.json();
  const { gameType, score, roundsPlayed, correctAnswers, maxStreak } = body as {
    gameType: string;
    score: number;
    roundsPlayed: number;
    correctAnswers: number;
    maxStreak: number;
  };

  if (!["blind"].includes(gameType)) {
    return NextResponse.json({ error: "Invalid gameType" }, { status: 400 });
  }

  if (score <= 0) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Upsert the user — this ensures they exist even if the signIn upsert failed silently
  const { data: user, error: userErr } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        spotify_id: spotifyId,
        name: session.user?.name ?? null,
        image: session.user?.image ?? null,
      },
      { onConflict: "spotify_id" }
    )
    .select("id")
    .single();

  if (userErr || !user) {
    console.error("User upsert error:", userErr);
    return NextResponse.json(
      { error: "User upsert failed", detail: userErr?.message },
      { status: 500 }
    );
  }

  const { error: insertErr } = await supabaseAdmin.from("game_sessions").insert({
    user_id: user.id,
    game_type: gameType,
    score,
    rounds_played: roundsPlayed,
    correct_answers: correctAnswers,
    max_streak: maxStreak,
  });

  if (insertErr) {
    console.error("Failed to insert game session:", insertErr);
    return NextResponse.json(
      { error: "DB insert failed", detail: insertErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
