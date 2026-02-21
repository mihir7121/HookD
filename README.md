# HOOKD — Music Trivia

A dark, moody music trivia game powered by your Spotify listening history. Five games. Your taste on trial.

## Games

| # | Game | Description | Points |
|---|------|-------------|--------|
| 01 | **Cover ID** | An album cover flashes on screen. Type the album name before time runs out. Faster = more points. | 100–500 pts |
| 02 | **Sound Check** | A 30-second clip from one of your top tracks plays. Name the song and artist. Streak multipliers apply. | 150–600 pts |
| 03 | **Who's That?** | An artist photo is heavily blurred and reveals itself over 10 seconds. Guess before it's fully clear. | 200–800 pts |
| 04 | **Match Up** | Five songs, five artists — all shuffled. Pair every song to its artist before the clock hits zero. | 40–200 pts |
| 05 | **Blind Taste Test** ⭐ | A 10-second clip from your library plays — no hints. Guess the song, artist, era, and whether it's a top-10 track. | 50–350 pts |

> ⭐ Blind Taste Test requires a **Spotify Premium** account (uses the Web Playback SDK for full-track playback).

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/mihir7121/HookD.git
cd HookD
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
  game_type text check (game_type in ('album', 'snippet', 'artist', 'match', 'blind')),
  score integer not null,
  rounds_played integer default 0,
  correct_answers integer default 0,
  max_streak integer default 0,
  played_at timestamptz default now()
);

alter table users enable row level security;
alter table game_sessions enable row level security;
```

3. Copy your **Project URL** and **Service Role Key** from Project Settings → API

### 4. Configure environment

Create `.env.local` in the project root:

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
| Cover ID | 100 pts | 500 pts | Time-based |
| Sound Check | 150 pts | 600 pts | Time-based + streak multiplier |
| Who's That? | 200 pts | 800 pts | Time-based (10s reveal window) |
| Match Up | 40 pts | 200 pts | Speed bonus on completion |
| Blind Taste Test | 50 pts | 350 pts | Multi-question (song, artist, era, top-10) |

Points scale linearly with time remaining. Build streaks for bonus multipliers on Sound Check.

## Leaderboard

Each game has its own leaderboard tracking each player's **personal best**. The overall leaderboard sums your best score across all five games.
