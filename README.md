# HOOKD — Music Trivia

A dark, moody music trivia game powered by your Spotify listening history. Four games. Your taste on trial.

## Games

| # | Game | Description | Points | Difficulty |
|---|------|-------------|--------|------------|
| 01 | **Pixel Panic** | An album cover from your library starts as a pixelated blur and sharpens over 12 seconds. Identify it before time runs out — speed is points. | 100–500 pts | MEDIUM |
| 02 | **Cover Slide** | Slide album art tiles into place before the clock expires. Choose 3×3, 5×5, or 7×7 and race for the cleanest solve. | 100–3600 pts | SCALING |
| 03 | **Blind Taste Test** ⭐ | A 10-second clip from your own library plays — no hints. Guess the artist and whether it's a top-10 track. It humbles everyone. | 50–450 pts | BRUTAL |
| 04 | **Discover** | Community-curated playlists for any mood. Trending, new, and filtered by vibe — all in one feed. | Community | EXPLORE |

> ⭐ Blind Taste Test requires a **Spotify Premium** account (uses the Spotify Web Playback SDK for full-track playback). Limited to 3 attempts per day.

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
3. Set **Redirect URI** to: `http://localhost:3000/api/auth/callback/spotify`
4. Enable **Web Playback SDK** in your app settings (required for Blind Taste Test)
5. Copy your **Client ID** and **Client Secret**

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the following SQL in the Supabase SQL editor:

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  spotify_id text unique not null,
  display_name text,
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

alter table users enable row level security;
alter table game_sessions enable row level security;
alter table blind_daily_attempts enable row level security;
```

3. Copy your **Project URL** and **Service Role Key** from Project Settings → API

### 4. Configure environment

Create `.env.local` in the `earworm/` directory:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_random_secret   # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 5. Run

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Tech Stack

- **Next.js 14** (App Router)
- **NextAuth.js** — Spotify OAuth
- **Spotify Web API** — music data (top tracks, top artists, album art)
- **Spotify Web Playback SDK** — full-track playback for Blind Taste Test (Premium only)
- **Supabase** — session storage and leaderboard
- **Zustand** — client-side game state (score, streak)
- **Tailwind CSS** — styling

## Scoring

| Game | Min | Max | Notes |
|------|-----|-----|-------|
| Pixel Panic | 100 pts | 500 pts | Time-based — faster reveal = fewer points |
| Cover Slide | 100 pts | 3600 pts | Scales with grid size (3×3 / 5×5 / 7×7) |
| Blind Taste Test | 50 pts | 450 pts | Per-question: song (150), artist (150), top-10 (150) |
| Discover | — | — | Community feature, no scoring |

## Leaderboard

Each scored game has its own leaderboard tracking each player's **personal best**. The overall leaderboard sums your best score across all three scored games (Pixel Panic, Cover Slide, Blind Taste Test).
