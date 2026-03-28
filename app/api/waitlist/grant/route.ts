import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { supabaseAdmin } from "@/lib/supabase";
import { AccessGranted } from "@/lib/emails/AccessGranted";

// POST /api/waitlist/grant
// Protected by GRANT_SECRET env var.
// Body: { email: string } | { emails: string[] }
//
// Marks the email(s) as granted in the waitlist table and sends the
// "You're in" email. Call this manually (curl / Postman / admin script)
// whenever you want to let a batch of users in.
//
// Example:
//   curl -X POST https://hookd.app/api/waitlist/grant \
//     -H "Authorization: Bearer <GRANT_SECRET>" \
//     -H "Content-Type: application/json" \
//     -d '{"emails": ["user@example.com"]}'

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const secret = process.env.GRANT_SECRET;
  const auth = req.headers.get("authorization") ?? "";

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const raw: string[] = Array.isArray(body.emails)
    ? body.emails
    : body.email
    ? [body.email]
    : [];

  const emails = raw.map((e) => String(e).trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) {
    return NextResponse.json({ error: "No emails provided" }, { status: 400 });
  }

  const results: { email: string; status: "sent" | "error"; reason?: string }[] = [];

  for (const email of emails) {
    try {
      // Mark as granted in DB
      await supabaseAdmin
        .from("waitlist")
        .update({ granted: true, granted_at: new Date().toISOString() })
        .eq("email", email);

      // Send access email
      await resend.emails.send({
        from: "HOOKD <hello@hookd.app>",
        to: email,
        subject: "You're in — HOOKD access granted",
        html: await render(AccessGranted({ email })),
      });

      results.push({ email, status: "sent" });
    } catch (err: any) {
      results.push({ email, status: "error", reason: err?.message ?? "Unknown error" });
    }
  }

  return NextResponse.json({ results });
}
