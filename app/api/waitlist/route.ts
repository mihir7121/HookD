import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { supabaseAdmin } from "@/lib/supabase";
import { WaitlistConfirmation } from "@/lib/emails/WaitlistConfirmation";

// Required Supabase table:
// create table waitlist (
//   id uuid primary key default gen_random_uuid(),
//   email text unique not null,
//   created_at timestamptz default now()
// );

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const { error: dbError } = await supabaseAdmin
    .from("waitlist")
    .upsert({ email }, { onConflict: "email" });

  if (dbError) {
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }

  // Send confirmation email (non-blocking — DB write already succeeded)
  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: "HOOKD <hello@hookd.app>",
        to: email,
        subject: "You're on the HOOKD waitlist",
        html: await render(WaitlistConfirmation({ email })),
      });
    } catch {
      // Non-blocking — waitlist entry already saved
    }
  }

  return NextResponse.json({ ok: true });
}
