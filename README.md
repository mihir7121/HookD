# HOOKD — Music Gaming Layer for Spotify

> Turn your listening history into a game. Four experiences, one platform, zero friction.

HOOKD is a Spotify-native music gaming and discovery platform built on top of the Spotify Web API and Web Playback SDK. It transforms a user's personal listening data into personalized, competitive, and community-driven experiences — all deeply integrated with Spotify's existing ecosystem.

---

## What It Does

HOOKD adds a gaming and social layer on top of Spotify without requiring users to leave their music context. Every game is personalized to the individual user's listening history, meaning no two sessions are the same.

### Games

| # | Game | Description | Points | Access |
|---|------|-------------|--------|--------|
| 01 | **Pixel Panic** | An album cover from your library starts pixelated and sharpens over 12 seconds. Identify it before time runs out — speed is score. 8 rounds, 4-choice MCQ, genre-filtered from your top artists. | 100–500 pts/round | Free |
| 02 | **Cover Slide** | Tile-slide puzzle using your album art. Choose 3×3, 5×5, or 7×7 — every board is mathematically guaranteed solvable. | 100–3,600 pts | Free |
| 03 | **Blind Taste Test** | A 10-second anonymous clip from your own library plays. Guess the title, artist, and whether it's in your Top 10. Capped at 3 attempts/day to drive daily retention. | 50–450 pts | Premium only |
| 04 | **Discover** | Community-curated playlist feed with mood tagging, trending scores, and one-click open in Spotify. Submit, vote, save, and filter by vibe. | Community | Free |

### Leaderboards

Each game tracks personal bests per user. An overall leaderboard aggregates best scores across all three scored games. Rankings are server-authoritative — scoring cannot be manipulated client-side.

---

## Why Spotify

HOOKD is not a standalone app — it is a feature concept built specifically around Spotify's infrastructure:

- **Uses data Spotify already owns.** Top tracks, top artists, saved library, album art, streaming playback — all sourced via existing Spotify APIs. No new data collection required.
- **Drives Premium upgrades.** Blind Taste Test requires Spotify Premium for the Web Playback SDK. It is the most engaging game and naturally converts free users.
- **Creates daily re-engagement.** The 3-attempt daily cap on Blind Taste and competitive leaderboards generate a habit loop that brings users back to Spotify daily.
- **Surfaces the catalog.** Games surface albums and artists users already love but may have forgotten. Discover exposes community playlists, increasing time in the catalog.
- **Zero content lift.** All game content is dynamically generated from each user's existing Spotify library. Spotify does not need to curate or maintain any game content.

---

## Architecture

```
Browser (Client)
  React 18 + Next.js 14 App Router
  Zustand (game state: score, streak)
  Framer Motion (animations)
  Spotify Web Playback SDK (Premium audio)
        ↓ HTTP / OAuth
Next.js API Routes (Serverless)
  NextAuth.js — Spotify OAuth + token refresh
  Game session storage + leaderboard queries
  Blind eligibility + attempt tracking
  Discover feed, submissions, voting, saves
        ↓           ↓           ↓
  Spotify Web API  Supabase DB  Resend (email)
```

**Rendering strategy:**
- Landing + auth: server-rendered
- Game pages: client-rendered (interactive, real-time state)
- Discover feed: client-side paginated with server queries
- Leaderboards: on-demand server queries

**Database tables:** `users`, `game_sessions`, `blind_daily_attempts`, `playlists`, `playlist_submissions`, `playlist_votes`, `playlist_saves`, `playlist_reports`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Auth | NextAuth.js v4 — Spotify OAuth |
| Music Data | Spotify Web API (`spotify-web-api-node`) |
| Audio Playback | Spotify Web Playback SDK |
| Database | Supabase (PostgreSQL + RLS) |
| State | Zustand |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Email | Resend + React Email |

---

## Key Technical Details

- **Solvability guarantee.** Cover Slide generates puzzles using parity/inversion counting — every board is provably solvable before it is shown to the user.
- **Multi-range history.** Games pull top tracks across `short_term`, `medium_term`, and `long_term` Spotify ranges and deduplicate, ensuring variety across listening eras.
- **Server-authoritative scoring.** All game sessions are saved server-side via `POST /api/sessions`. Client state is display-only.
- **Token refresh.** NextAuth handles Spotify token expiry mid-session without requiring re-login.
- **Premium verification.** Blind Taste Test checks Spotify product type at the `/api/blind/eligibility` endpoint before allowing playback initialization.
- **Trending algorithm.** Discover feed scores: `upvotes×3 + saves×4 + opens + recency decay` — weighted toward saves and unique interactions.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/mihir7121/HookD.git
cd HookD/earworm
npm install
```

### 2. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create app**
3. Set **Redirect URI** to `http://localhost:3000/api/auth/callback/spotify`
4. Enable **Web Playback SDK** in app settings (required for Blind Taste Test)
5. Copy your **Client ID** and **Client Secret**

### 3. Set up Supabase

Create a project at [supabase.com](https://supabase.com) and run this schema:

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique not null,
  display_name text,
  image_url text,
  created_at timestamptz default now()
);

create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  game_type text check (game_type in ('pixel', 'slide', 'blind')),
  score integer not null,
  rounds_played integer default 0,
  correct_answers integer default 0,
  max_streak integer default 0,
  played_at timestamptz default now()
);

create table blind_daily_attempts (
  user_id uuid references users(id) on delete cascade,
  date_key date not null,
  attempts_used integer not null default 0,
  primary key (user_id, date_key)
);

create table playlists (
  id uuid primary key default gen_random_uuid(),
  spotify_playlist_id text unique not null,
  title text,
  image_url text,
  owner_name text,
  track_count integer,
  fetched_at timestamptz default now()
);

create table playlist_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  playlist_id uuid references playlists(id) on delete cascade,
  description text,
  mood_tags text[],
  status text default 'active',
  created_at timestamptz default now()
);

create table playlist_votes (
  user_id uuid references users(id) on delete cascade,
  submission_id uuid references playlist_submissions(id) on delete cascade,
  value integer check (value in (-1, 1)),
  primary key (user_id, submission_id)
);

create table playlist_saves (
  user_id uuid references users(id) on delete cascade,
  submission_id uuid references playlist_submissions(id) on delete cascade,
  primary key (user_id, submission_id)
);

create table playlist_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references users(id) on delete cascade,
  submission_id uuid references playlist_submissions(id) on delete cascade,
  reason text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table users enable row level security;
alter table game_sessions enable row level security;
alter table blind_daily_attempts enable row level security;
```

Copy your **Project URL** and **Service Role Key** from Project Settings → API.

### 4. Configure environment

Create `.env.local` in the `earworm/` directory:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_random_secret   # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key   # optional, for waitlist emails
```

### 5. Run

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Scoring Reference

| Game | Min | Max | Scoring Model |
|------|-----|-----|---------------|
| Pixel Panic | 100 pts | 500 pts | `100 + floor(400 × timeLeft/roundTime)` per round |
| Cover Slide | 100 pts | 3,600 pts | Scales with grid size (3×3 / 5×5 / 7×7) and solve efficiency |
| Blind Taste Test | 50 pts | 450 pts | Time-scaled per question (song, artist) + flat top-10 bonus |
| Discover | — | — | Community feature, no individual scoring |

---

## Roadmap

| Phase | Features |
|-------|----------|
| v1 (shipped) | Pixel Panic solo, Blind Taste Test, Cover Slide, Discover (full CRUD + trending) |
| v2 | Pixel Panic 1v1 friend battles (invite room, shared seed, round-by-round breakdown) |
| v3 | Shareable result cards with OG preview images, social sharing (X, WhatsApp, Discord, etc.) |
| v4 | Personalization feed in Discover, moderation tooling, advanced leaderboard filters |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sessions` | Save completed game session |
| `GET` | `/api/leaderboard?gameType=` | Top 20 + authenticated user rank |
| `GET` | `/api/blind/eligibility` | Check Premium status + daily attempts remaining |
| `POST` | `/api/blind/start` | Initialize Blind Taste run (consumes one attempt) |
| `GET` | `/api/discover/feed` | Paginated playlist feed (tab, mood, search, limit, offset) |
| `POST` | `/api/discover/submit` | Submit a playlist with mood tags |
| `POST` | `/api/discover/vote` | Upvote or downvote a submission |
| `POST` | `/api/discover/save` | Save a playlist to personal collection |
| `POST` | `/api/discover/report` | Report a submission for moderation |
| `GET` | `/api/profile` | User stats, recent sessions, saved playlists |

---

## License

MIT
