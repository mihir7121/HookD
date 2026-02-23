import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/discover-server";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_REASONS = ["spam", "offensive", "irrelevant", "broken-link"] as const;

export async function POST(req: NextRequest) {
  const { userId } = await getAuthedUser();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const submissionId = String(body.submissionId ?? "").trim();
  const reason = String(body.reason ?? "spam").trim().toLowerCase();

  if (!submissionId) {
    return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
  }
  if (!VALID_REASONS.includes(reason as (typeof VALID_REASONS)[number])) {
    return NextResponse.json({ error: "Invalid report reason" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("playlist_reports").upsert(
    {
      reporter_id: userId,
      submission_id: submissionId,
      reason,
      status: "open",
    },
    { onConflict: "reporter_id,submission_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to report" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
