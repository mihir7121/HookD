import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_ATTEMPTS = 3;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = (session as any).accessToken as string | undefined;
  const spotifyId = (session as any).spotifyId as string | undefined;

  if (!accessToken || !spotifyId) {
    return NextResponse.json({ error: "Missing token or spotifyId" }, { status: 400 });
  }

  // Verify Premium server-side (authoritative check before consuming attempt)
  let isPremium = false;
  try {
    const me = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json());
    isPremium = me.product === "premium";
  } catch {
    // treat as non-premium on error
  }

  if (!isPremium) {
    return NextResponse.json({ error: "Premium required" }, { status: 403 });
  }

  // Upsert user row (in case they haven't visited sessions before)
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
    return NextResponse.json({ error: "User error" }, { status: 500 });
  }

  const dateKey = new Date().toISOString().slice(0, 10);

  // Read current attempt count
  const { data: existing } = await supabaseAdmin
    .from("blind_daily_attempts")
    .select("attempts_used")
    .eq("user_id", user.id)
    .eq("date_key", dateKey)
    .single();

  const current = existing?.attempts_used ?? 0;

  if (current >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Daily limit reached" }, { status: 403 });
  }

  // Increment attempts_used
  const { error: upsertErr } = await supabaseAdmin
    .from("blind_daily_attempts")
    .upsert(
      { user_id: user.id, date_key: dateKey, attempts_used: current + 1 },
      { onConflict: "user_id,date_key" }
    );

  if (upsertErr) {
    console.error("Failed to increment attempts:", upsertErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    attemptsRemaining: MAX_ATTEMPTS - (current + 1),
  });
}
