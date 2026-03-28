import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function AccessGranted({ email }: { email: string }) {
  return (
    <Html>
      <Head />
      <Preview>You're in — your HOOKD access is ready.</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Text style={logo}>HOOKD</Text>
          </Section>

          <Hr style={hr} />

          <Heading style={h1}>You're in.</Heading>

          <Text style={paragraph}>
            Your spot on the HOOKD waitlist just turned into full access.
            Connect your Spotify account and find out what you actually know
            about your music.
          </Text>

          {/* Game highlights */}
          <Section style={gamesSection}>
            <Text style={gameItem}>
              <span style={gameNumber}>01</span>{" "}
              <span style={gameTitle}>Pixel Panic</span>
              <span style={gameDesc}> — Identify the album before it sharpens</span>
            </Text>
            <Text style={gameItem}>
              <span style={gameNumber}>02</span>{" "}
              <span style={gameTitle}>Cover Slide</span>
              <span style={gameDesc}> — Slide tiles back into the right order</span>
            </Text>
            <Text style={gameItem}>
              <span style={gameNumber}>03</span>{" "}
              <span style={gameTitle}>Blind Taste</span>
              <span style={gameDesc}> — 10 seconds of audio, no hints</span>
            </Text>
          </Section>

          <Section style={ctaSection}>
            <Button href="https://hookd.app" style={ctaButton}>
              Connect with Spotify →
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={paragraph} >
            A heads-up: access is granted for a limited testing window. We're
            actively building and your feedback means a lot — reply to this
            email with anything you notice.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Sent to {email} because you joined the HOOKD waitlist.
            <br />
            hookd.app · Built by Mihir & Aayush
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
  color: "#c8ff00",
  fontSize: "48px",
  fontWeight: "700",
  letterSpacing: "0.06em",
  margin: "0 0 20px",
};

const paragraph = {
  color: "rgba(255,255,255,0.55)",
  fontSize: "15px",
  lineHeight: "1.7",
  margin: "0 0 16px",
};

const gamesSection = {
  margin: "28px 0",
  padding: "20px 24px",
  borderLeft: "2px solid rgba(200,255,0,0.25)",
};

const gameItem = {
  color: "rgba(255,255,255,0.7)",
  fontSize: "14px",
  margin: "0 0 10px",
  lineHeight: "1.5",
};

const gameNumber = {
  color: "rgba(200,255,0,0.5)",
  fontFamily: "monospace",
  fontSize: "11px",
  letterSpacing: "0.1em",
};

const gameTitle = {
  color: "#ffffff",
  fontWeight: "600",
};

const gameDesc = {
  color: "rgba(255,255,255,0.4)",
};

const ctaSection = {
  margin: "32px 0",
};

const ctaButton = {
  display: "inline-block",
  padding: "14px 32px",
  backgroundColor: "rgba(200,255,0,0.06)",
  border: "1px solid rgba(200,255,0,0.35)",
  color: "#c8ff00",
  fontSize: "12px",
  fontFamily: "monospace",
  letterSpacing: "0.2em",
  textDecoration: "none",
  textTransform: "uppercase" as const,
};

const footer = {
  color: "rgba(255,255,255,0.2)",
  fontSize: "11px",
  lineHeight: "1.6",
  fontFamily: "monospace",
};
