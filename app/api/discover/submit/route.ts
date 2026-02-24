import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/discover-server";
import { normalizeMoodTags, parseSpotifyPlaylistId } from "@/lib/discover";
import { fetchSpotifyPlaylistMeta } from "@/lib/spotify-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { session, userId, spotifyId } = await getAuthedUser();
  if (!session || !spotifyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const { data: upserted, error: upsertErr } = await supabaseAdmin
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
    if (upsertErr || !upserted) {
      return NextResponse.json({ error: "User resolution failed" }, { status: 500 });
    }
    resolvedUserId = upserted.id;
  }

  const body = await req.json();
  const url = String(body.url ?? "").trim();
  const oneLiner = String(body.oneLiner ?? "").trim();
  const moodTags = normalizeMoodTags(Array.isArray(body.moodTags) ? body.moodTags : []);

  if (!url) {
    return NextResponse.json({ error: "Playlist URL is required" }, { status: 400 });
  }
  if (oneLiner.length < 20 || oneLiner.length > 100) {
    return NextResponse.json({ error: "One-liner must be between 20 and 100 characters" }, { status: 400 });
  }
  if (moodTags.length < 1 || moodTags.length > 3) {
    return NextResponse.json({ error: "Select between 1 and 3 moods" }, { status: 400 });
  }

  const playlistId = parseSpotifyPlaylistId(url);
  if (!playlistId) {
    return NextResponse.json({ error: "Invalid Spotify playlist URL" }, { status: 400 });
  }

  let meta;
  try {
    meta = await fetchSpotifyPlaylistMeta(playlistId, (session as any).accessToken as string | undefined);
  } catch {
    return NextResponse.json(
      { error: "Could not fetch playlist metadata. Check visibility and URL." },
      { status: 400 }
    );
  }

  const { data: playlist, error: playlistErr } = await supabaseAdmin
    .from("playlists")
    .upsert(
      {
        spotify_playlist_id: meta.spotifyPlaylistId,
        url: meta.url,
        title: meta.title,
        image: meta.image,
        owner_name: meta.ownerName,
        track_count: meta.trackCount,
      },
      { onConflict: "spotify_playlist_id" }
    )
    .select("id, spotify_playlist_id, url, title, image, owner_name, track_count")
    .single();

  if (playlistErr || !playlist) {
    return NextResponse.json({ error: "Failed to save playlist" }, { status: 500 });
  }

  const { data: existing } = await supabaseAdmin
    .from("playlist_submissions")
    .select("id")
    .eq("playlist_id", playlist.id)
    .eq("status", "active")
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ error: "Playlist already submitted" }, { status: 409 });
  }

  const { data: submission, error: submissionErr } = await supabaseAdmin
    .from("playlist_submissions")
    .insert({
      user_id: resolvedUserId,
      playlist_id: playlist.id,
      one_liner: oneLiner,
      mood_tags: moodTags,
      status: "active",
    })
    .select("id, one_liner, mood_tags, created_at")
    .single();

  if (submissionErr || !submission) {
    return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
  }

  return NextResponse.json({
    entry: {
      id: submission.id,
      oneLiner: submission.one_liner,
      moodTags: submission.mood_tags,
      createdAt: submission.created_at,
      upvotes: 0,
      saves: 0,
      opens: 0,
      hasVoted: false,
      hasSaved: false,
      playlist: {
        id: playlist.id,
        spotifyPlaylistId: playlist.spotify_playlist_id,
        url: playlist.url,
        title: playlist.title,
        image: playlist.image,
        ownerName: playlist.owner_name,
        trackCount: playlist.track_count,
      },
      submitter: {
        name: session.user?.name ?? "Anonymous",
        image: session.user?.image ?? null,
      },
    },
  });
}
