import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_ATTEMPTS = 3;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = (session as any).accessToken as string | undefined;
  const spotifyId = (session as any).spotifyId as string | undefined;

  if (!accessToken || !spotifyId) {
    return NextResponse.json({ error: "Missing token or spotifyId" }, { status: 400 });
  }

  // Check Spotify Premium server-side
  let isPremium = false;
  try {
    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json());
    isPremium = me.product === "premium";
  } catch {
    // default false on network error
  }

  if (!isPremium) {
    return NextResponse.json({ isPremium: false, attemptsRemaining: 0 });
  }

  // Look up the user row
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("spotify_id", spotifyId)
    .single();

  if (!user) {
    // User exists in Spotify but hasn't been upserted to DB yet (first visit)
    return NextResponse.json({ isPremium: true, attemptsRemaining: MAX_ATTEMPTS });
  }

  // Get today's attempt count (UTC date)
  const dateKey = new Date().toISOString().slice(0, 10);
  const { data: row } = await supabaseAdmin
    .from("blind_daily_attempts")
    .select("attempts_used")
    .eq("user_id", user.id)
    .eq("date_key", dateKey)
    .single();

  const attemptsUsed = row?.attempts_used ?? 0;
  const attemptsRemaining = Math.max(0, MAX_ATTEMPTS - attemptsUsed);

  return NextResponse.json({ isPremium: true, attemptsRemaining });
}
