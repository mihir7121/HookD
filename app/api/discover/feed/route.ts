import { NextRequest, NextResponse } from "next/server";
import { isDiscoverTab } from "@/lib/discover";
import { supabaseAdmin } from "@/lib/supabase";
import { getAuthedUser } from "@/lib/discover-server";

type SubmissionRow = {
  id: string;
  playlist_id: string;
  user_id: string;
  one_liner: string;
  mood_tags: string[];
  open_count: number;
  created_at: string;
  status: string;
};

type PlaylistRow = {
  id: string;
  spotify_playlist_id: string;
  url: string;
  title: string;
  image: string | null;
  owner_name: string;
  track_count: number;
};

type UserRow = {
  id: string;
  name: string | null;
  image: string | null;
};

export async function GET(req: NextRequest) {
  const { userId } = await getAuthedUser();

  const { searchParams } = new URL(req.url);
  const tabParam = searchParams.get("tab");
  const tab = isDiscoverTab(tabParam) ? tabParam : "trending";
  const mood = searchParams.get("mood")?.trim().toLowerCase() ?? "";
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  let submissionsQuery = supabaseAdmin
    .from("playlist_submissions")
    .select("id, playlist_id, user_id, one_liner, mood_tags, open_count, created_at, status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(200);

  if (mood) {
    submissionsQuery = submissionsQuery.contains("mood_tags", [mood]);
  }

  const { data: submissions, error: submissionsError } = await submissionsQuery;
  if (submissionsError) {
    return NextResponse.json({ error: "Failed to fetch discover feed" }, { status: 500 });
  }

  const typedSubmissions = (submissions ?? []) as SubmissionRow[];
  if (typedSubmissions.length === 0) {
    return NextResponse.json({ entries: [] });
  }

  const playlistIds = Array.from(new Set(typedSubmissions.map((s) => s.playlist_id)));
  const userIds = Array.from(new Set(typedSubmissions.map((s) => s.user_id)));
  const submissionIds = typedSubmissions.map((s) => s.id);

  const [playlistRes, usersRes, votesRes, savesRes, myVotesRes, mySavesRes] = await Promise.all([
    supabaseAdmin
      .from("playlists")
      .select("id, spotify_playlist_id, url, title, image, owner_name, track_count")
      .in("id", playlistIds),
    supabaseAdmin.from("users").select("id, name, image").in("id", userIds),
    supabaseAdmin.from("playlist_votes").select("submission_id").in("submission_id", submissionIds),
    supabaseAdmin.from("playlist_saves").select("submission_id").in("submission_id", submissionIds),
    userId
      ? supabaseAdmin
          .from("playlist_votes")
          .select("submission_id")
          .eq("user_id", userId)
          .in("submission_id", submissionIds)
      : Promise.resolve({ data: [], error: null } as any),
    userId
      ? supabaseAdmin
          .from("playlist_saves")
          .select("submission_id")
          .eq("user_id", userId)
          .in("submission_id", submissionIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (playlistRes.error || usersRes.error || votesRes.error || savesRes.error) {
    return NextResponse.json({ error: "Failed to enrich discover feed" }, { status: 500 });
  }

  const playlistById = new Map((playlistRes.data as PlaylistRow[]).map((p) => [p.id, p]));
  const userById = new Map((usersRes.data as UserRow[]).map((u) => [u.id, u]));

  const voteCount = new Map<string, number>();
  for (const row of votesRes.data ?? []) {
    voteCount.set(row.submission_id, (voteCount.get(row.submission_id) ?? 0) + 1);
  }

  const saveCount = new Map<string, number>();
  for (const row of savesRes.data ?? []) {
    saveCount.set(row.submission_id, (saveCount.get(row.submission_id) ?? 0) + 1);
  }

  const myVoted = new Set<string>((myVotesRes.data ?? []).map((v: any) => v.submission_id));
  const mySaved = new Set<string>((mySavesRes.data ?? []).map((s: any) => s.submission_id));

  let entries = typedSubmissions
    .map((s) => {
      const playlist = playlistById.get(s.playlist_id);
      const submitter = userById.get(s.user_id);
      if (!playlist) return null;

      const upvotes = voteCount.get(s.id) ?? 0;
      const saves = saveCount.get(s.id) ?? 0;
      const ageHours = (Date.now() - new Date(s.created_at).getTime()) / 3600000;
      const freshness = Math.max(0, 72 - ageHours) / 12;

      return {
        id: s.id,
        oneLiner: s.one_liner,
        moodTags: s.mood_tags,
        createdAt: s.created_at,
        upvotes,
        saves,
        opens: s.open_count ?? 0,
        trendingScore: upvotes * 3 + saves * 4 + (s.open_count ?? 0) + freshness,
        hasVoted: myVoted.has(s.id),
        hasSaved: mySaved.has(s.id),
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
          name: submitter?.name ?? "Anonymous",
          image: submitter?.image ?? null,
        },
      };
    })
    .filter(Boolean) as Array<any>;

  if (q) {
    entries = entries.filter((entry) => {
      const title = entry.playlist.title.toLowerCase();
      const owner = entry.playlist.ownerName.toLowerCase();
      const line = entry.oneLiner.toLowerCase();
      return title.includes(q) || owner.includes(q) || line.includes(q);
    });
  }

  if (tab === "trending") {
    entries.sort((a, b) => b.trendingScore - a.trendingScore);
  } else {
    entries.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return NextResponse.json({ entries });
}
