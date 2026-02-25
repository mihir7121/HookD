import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/discover-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId, session } = await getAuthedUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const submissionId = String(body.submissionId ?? "").trim();
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
  }

  // Look up the Spotify playlist ID for this submission
  let spotifyPlaylistId: string | null = null;
  const { data: submission } = await supabaseAdmin
    .from("playlist_submissions")
    .select("playlist_id")
    .eq("id", submissionId)
    .single();
  if (submission?.playlist_id) {
    const { data: playlist } = await supabaseAdmin
      .from("playlists")
      .select("spotify_playlist_id")
      .eq("id", submission.playlist_id)
      .single();
    spotifyPlaylistId = playlist?.spotify_playlist_id ?? null;
  }

  // Save to our DB (idempotent)
  const { error } = await supabaseAdmin.from("playlist_saves").upsert(
    { user_id: userId, submission_id: submissionId },
    { onConflict: "user_id,submission_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  // Best-effort: follow the playlist on Spotify so it appears in the user's library.
  // Requires playlist-modify-private scope (private follow — not public on profile).
  // Silently skips if the token lacks the scope or the call fails.
  const accessToken = (session as any)?.accessToken as string | undefined;
  if (accessToken && spotifyPlaylistId) {
    try {
      await fetch(`https://api.spotify.com/v1/playlists/${spotifyPlaylistId}/followers`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ public: false }),
      });
    } catch {
      // Non-blocking — DB save already succeeded
    }
  }

  return NextResponse.json({ ok: true });
}
