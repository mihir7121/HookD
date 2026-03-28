import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function WaitlistConfirmation({ email }: { email: string }) {
  return (
    <Html>
      <Head />
      <Preview>You're on the HOOKD waitlist — we'll be in touch soon.</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Text style={logo}>HOOKD</Text>
          </Section>

          <Hr style={hr} />

          <Heading style={h1}>You're on the list.</Heading>

          <Text style={paragraph}>
            Thanks for signing up — we got you. HOOKD is currently in a limited
            testing phase while Spotify restricts our app to a small set of
            users.
          </Text>

          <Text style={paragraph}>
            We review the waitlist every week and send out access in batches.
            When it's your turn, you'll get a separate email with everything you
            need to jump in.
          </Text>

          <Text style={paragraph}>
            In the meantime, Discover is completely free — browse
            community-curated playlists, vote, and save the ones you love.
          </Text>

          <Section style={ctaSection}>
            <Link href="https://hookd.app/discover" style={ctaButton}>
              Browse Community Playlists →
            </Link>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You're receiving this because {email} signed up at hookd.app.
            <br />
            If this wasn't you, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ──────────────────────────────────────────────

const body = {
  backgroundColor: "#08080a",
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
};

const container = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "48px 24px",
};

const logoSection = {
  marginBottom: "24px",
};

const logo = {
  fontFamily: "Georgia, serif",
  fontSize: "28px",
  letterSpacing: "0.18em",
  color: "#c8ff00",
  margin: "0",
};

const hr = {
  borderColor: "rgba(255,255,255,0.08)",
  margin: "24px 0",
};

const h1 = {
  color: "#ffffff",
  fontSize: "32px",
  fontWeight: "700",
  letterSpacing: "0.04em",
  margin: "0 0 20px",
};

const paragraph = {
  color: "rgba(255,255,255,0.55)",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: "0 0 16px",
};

const ctaSection = {
  margin: "32px 0",
};

const ctaButton = {
  display: "inline-block",
  padding: "12px 24px",
  border: "1px solid rgba(0,207,255,0.35)",
  color: "#00cfff",
  fontSize: "11px",
  fontFamily: "monospace",
  letterSpacing: "0.18em",
  textDecoration: "none",
  textTransform: "uppercase" as const,
};

const footer = {
  color: "rgba(255,255,255,0.2)",
  fontSize: "11px",
  lineHeight: "1.6",
  fontFamily: "monospace",
};
