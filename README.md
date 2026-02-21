# 🎵 EARWORM — Spotify Music Trivia

A dark, moody music trivia game powered by your Spotify listening history.

## Games

| # | Game | Description |
|---|------|-------------|
| 01 | **Cover ID** | Identify albums from their cover art. Faster = more points. |
| 02 | **Sound Check** | A song snippet plays (30s). Name the track before time runs out. |
| 03 | **Who's That?** | A blurred artist photo slowly reveals itself. Guess before it's fully clear. |

---

## Setup

### 1. Clone and install

```bash
cd earworm
npm install
```

### 2. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create app**
3. Set **Redirect URI** to: `http://localhost:3000/api/auth/callback/spotify`
4. Copy your **Client ID** and **Client Secret**

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_random_secret   # run: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

### 4. Run

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Tech Stack

- **Next.js 14** (App Router)
- **NextAuth.js** — Spotify OAuth
- **Zustand** — game state (score, streak)
- **Framer Motion** — animations
- **Tailwind CSS** — styling
- **Spotify Web API** — music data

## Notes on Sound Check

Spotify's preview URLs (30-second clips) are region-dependent. Some tracks may not have previews available. The game automatically filters to tracks that have previews.

## Scoring

| Game | Min | Max |
|------|-----|-----|
| Cover ID | 100 pts | 500 pts |
| Sound Check | 150 pts | 600 pts |
| Who's That? | 200 pts | 800 pts |

Points scale linearly with time remaining. Build streaks for bonus multipliers.
