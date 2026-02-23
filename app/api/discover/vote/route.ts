import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/discover-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { userId } = await getAuthedUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const submissionId = String(body.submissionId ?? "").trim();
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("playlist_votes").upsert(
    {
      user_id: userId,
      submission_id: submissionId,
      value: 1,
    },
    { onConflict: "user_id,submission_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
