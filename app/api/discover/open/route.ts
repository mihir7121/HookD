import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const submissionId = String(body.submissionId ?? "").trim();
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
  }

  const { data: submission, error: submissionErr } = await supabaseAdmin
    .from("playlist_submissions")
    .select("open_count")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionErr || !submission) {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("playlist_submissions")
    .update({ open_count: (submission.open_count ?? 0) + 1 })
    .eq("id", submissionId);

  if (error) {
    return NextResponse.json({ error: "Failed to track open" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
