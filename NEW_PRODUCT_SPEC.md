# HOOKD Product Spec v1.0

## Scope Lock
- Game 1: `Pixel Panic`
- Game 2: `Blind Taste Test`
- Community: `Playlist Discovery Hub` (playlist-only + one-line description)
- Shareable end-game/result screens for both games
- Blind Taste capped at `3 runs/day/user`

---

## 1) Product Vision
- Build a Spotify-native experience that combines:
  - high-intensity play (short skill games)
  - practical daily utility (discover playlists by mood)
- Retention strategy:
  - gameplay loop: score chasing + social battle
  - habit loop: daily caps/challenges + discover feed refresh
- Design principle: fast sessions, low friction, high replay.

### Success outcomes
- Users return for either:
  - competition (`Pixel Panic` solo PB + 1v1), or
  - utility (`Discover` mood playlists), or
  - challenge (`Blind Taste` limited attempts).

---

## 2) Target Users & Jobs To Be Done
- Competitive listener: "I want to prove I know my music better than my friends."
- Casual listener: "I want quick fun without learning complex rules."
- Discovery seeker: "I want playlists that match my exact mood right now."

### Primary JTBD
- "When I have 3–10 minutes, I want a music experience that is fun and personalized to Spotify taste."

---

## 3) Information Architecture
- Main nav:
  - `Play`
    - Pixel Panic
    - Blind Taste Test
  - `Discover`
    - Trending
    - New
    - By Mood
  - `Profile`
    - stats, saved playlists, share history
- Core routes (suggested):
  - `/play/pixel` (solo and 1v1 entry)
  - `/play/blind`
  - `/discover`
  - `/r/[shareId]` (public share page)

---

## 4) Game 1 Spec — Pixel Panic

### 4.1 Core concept
- Album cover starts heavily pixelated.
- Cover becomes clearer over time.
- Player selects correct album from 4 options before timeout.
- Faster correct answer => higher score.

### 4.2 Modes
- `Solo Run`
- `1v1 Friend Battle` (invite room)

### 4.3 Setup rules
- User chooses `1 or more genres` before starting.
- Selection mode: multi-select chips.
- Minimum: 1 genre.
- Maximum: 3 genres (recommended for v1 quality/performance).
- Match settings (fixed v1):
  - rounds: 8
  - time per round: 12s
  - options per round: 4

### 4.4 Scoring
- Round score formula:
  - `score = 100 + floor(400 * (timeLeft / roundTime))` if correct
  - wrong/timeout = 0
- Optional streak bonus:
  - +10% after 3+ consecutive correct (v1 optional toggle)
- Session score = sum of round scores.

### 4.5 Solo flow
- Play -> Pixel Panic -> genre select -> start.
- Loop for 8 rounds:
  - show pixelated cover + timer
  - answer MCQ
  - feedback (correct/incorrect + points)
- End screen:
  - total score
  - accuracy
  - avg response time
  - best round
  - selected genres
  - CTA: play again / change genres / share result

### 4.6 1v1 flow
- Play -> Pixel Panic -> Battle Friend.
- Host creates room:
  - selects genres
  - receives code/link
- Guest joins with code/link.
- Room state: both ready.
- Match starts when both ready:
  - same seed, same rounds, same options, same timers for fairness
- End:
  - winner, score difference
  - round-by-round summary
  - CTA: rematch same genres / rematch new genres / share

### 4.7 Edge cases
- Insufficient cover pool for selected genres:
  - auto-fill with nearest related genre + show non-blocking notice.
- Guest drops before match start:
  - room remains open for host (timeout after N min).
- Mid-match disconnect:
  - 20s reconnect grace, then forfeit.
- Tie:
  - tie-break by faster cumulative correct-answer time.

---

## 5) Game 2 Spec — Blind Taste Test

### 5.1 Core concept
- Play a short anonymized track clip via Spotify Web Playback SDK.
- User answers 3 prompts (no release-era question):
  - Song title (MCQ)
  - Artist (MCQ)
  - Is this in your Top 10? (Yes/No)

### 5.2 Access constraints
- Spotify Premium required.
- Daily cap: `max 3 runs/day/user`.
- Cap applies only to Blind Taste Test (not Pixel Panic).

### 5.3 Match settings
- rounds: 6 (recommended v1; can tune)
- clip length: 10s
- answer window: within round timer (existing timing model reused)

### 5.4 Scoring
- Song: time-scaled points
- Artist: time-scaled points
- Top10: flat bonus
- Session score = sum of round totals.

### 5.5 User flow
- Enter Blind Taste Test.
- Premium gate:
  - non-premium -> "Premium required" screen.
- Attempt gate:
  - show `attempts remaining today`
  - if 0 -> locked screen with reset info.
- Start run.
- Per round:
  - play clip
  - answer 3 prompts
  - auto-submit on complete/timer end
  - reveal answers + points breakdown
- End screen:
  - total score
  - song accuracy
  - artist accuracy
  - top10 accuracy
  - attempts remaining
  - share CTA

### 5.6 Attempt counter behavior
- Attempt consumed on run start (recommended for abuse prevention).
- If user exits mid-run, attempt remains consumed.
- Daily reset at user-local midnight or UTC midnight (choose one and keep consistent; UTC recommended for backend simplicity).

### 5.7 Edge cases
- SDK load failure:
  - retry + fallback error state.
- Playback API error:
  - retry current round once, else skip round with no points.
- Token refresh failure:
  - prompt re-auth.

---

## 6) Community Spec — Playlist Discovery Hub

### 6.1 Scope
- Playlist-only feed (no free-form forum threads).
- Each playlist has one-line description.

### 6.2 Content model
- Required:
  - Spotify playlist URL
  - one-line description (20–100 chars)
  - mood tags (1–3)
- Auto-fetched from Spotify:
  - title
  - image
  - owner name
  - track count
- Optional:
  - submitter display name

### 6.3 Feed surfaces
- Trending
- New
- By Mood (chips + filter)
- Search by mood/tag/keyword

### 6.4 Playlist card actions
- Open in Spotify
- Save (bookmark inside HookD)
- Upvote
- Report

### 6.5 Submission flow
- Discover -> Submit Playlist
- Paste Spotify URL
- Fetch metadata preview
- Add mood tags + one-line description
- Submit
- Validation:
  - valid Spotify playlist URL
  - dedupe by playlist ID
  - profanity/spam checks on one-liner

### 6.6 Moderation baseline
- Report reasons: spam, offensive, irrelevant, broken link.
- Auto-hide threshold (e.g., 3 trusted reports) + admin review queue.
- Rate limits:
  - submissions/day/user
  - votes/minute
- Ban/restrict abusive users.

### 6.7 Ranking (Trending)
- Weighted score (last 7 days):
  - upvotes
  - saves
  - opens
  - recency decay
- Anti-gaming:
  - unique-user interactions only
  - action cooldowns.

---

## 7) Shared End-Game & Social Sharing Spec

### 7.1 Shared result screen component
- Used by Pixel Panic and Blind Taste.
- Contains:
  - game name + mode
  - final score
  - key stats (mode-specific)
  - CTA buttons: copy link, share, play again

### 7.2 Share URL
- Generate public share link per completed run/duel:
  - `/r/[shareId]`
- Share page includes:
  - headline result
  - game type
  - CTA to open HookD

### 7.3 Social compatibility
- Rich OG/Twitter metadata with dynamic preview image.
- Platforms supported for link sharing:
  - X, WhatsApp, Facebook, LinkedIn, Telegram, Discord, iMessage, Reddit.
- Instagram/Snap fallback:
  - provide `Download Result Image` + `Copy Link`.

### 7.4 Share card content rules
- Include HookD URL and clear CTA.
- Must not expose private data (email, spotify_id, etc.).
- Allow display name or anonymized handle per privacy setting.

---

## 8) User Flows by Scenario (Use Cases)

### Scenario A — Solo competitor
- Opens Pixel Panic solo daily in favorite genres.
- Tries to beat personal best.
- Shares result.

### Scenario B — Friend rivalry
- Creates 1v1 Pixel room.
- Friend joins.
- They rematch repeatedly (same/new genres).

### Scenario C — Premium challenge user
- Plays Blind Taste up to 3 runs/day.
- Uses remaining-attempt indicator.
- Shares best run.

### Scenario D — Discovery-only user
- Skips games, opens Discover.
- Selects mood (`late night`, `focus`).
- Saves playlist to Spotify.

### Scenario E — Hybrid user
- Plays one game, then discovers playlists matching session vibe.
- Increases total session length and return probability.

---

## 9) Data Model (Recommended Tables)

- `users` (existing)
- `game_sessions` (extend)
  - `game_type`: pixel / blind
  - `mode`: solo / duel
  - `score`, stats, timestamps
  - `share_id`
- `pixel_duels`
  - host_id, guest_id, status, seed, selected_genres, winner_id
- `pixel_duel_rounds`
  - duel_id, round_no, player_id, answer, response_ms, points
- `blind_daily_attempts`
  - user_id, date_key, attempts_used (0..3)
- `playlists`
  - spotify_playlist_id, url, title, image, owner_name, track_count
- `playlist_submissions`
  - user_id, playlist_id, one_liner, mood_tags[], status, created_at
- `playlist_votes`
  - user_id, submission_id, value
- `playlist_saves`
  - user_id, submission_id
- `playlist_reports`
  - reporter_id, submission_id, reason, status
- `shared_results`
  - share_id, game_type, mode, payload_json, visibility

---

## 10) API Surface (Suggested)
- Games
  - `POST /api/pixel/solo/start`
  - `POST /api/pixel/solo/answer`
  - `POST /api/pixel/solo/finish`
  - `POST /api/pixel/duel/create`
  - `POST /api/pixel/duel/join`
  - `POST /api/pixel/duel/ready`
  - `POST /api/pixel/duel/answer`
  - `GET /api/pixel/duel/state`
- Blind
  - `GET /api/blind/eligibility` (premium + attempts remaining)
  - `POST /api/blind/start` (consume attempt)
  - `POST /api/blind/answer`
  - `POST /api/blind/finish`
- Discover
  - `GET /api/discover/feed?tab=&mood=`
  - `POST /api/discover/submit`
  - `POST /api/discover/vote`
  - `POST /api/discover/save`
  - `POST /api/discover/report`
- Share
  - `POST /api/share/create`
  - `GET /r/[shareId]`
  - `GET /r/[shareId]/opengraph-image`

---

## 11) Non-Functional Requirements
- Mobile-first responsive behavior.
- P95 API latency target:
  - gameplay endpoints < 300ms (excluding Spotify playback)
  - feed endpoints < 400ms
- Reliability:
  - no score loss on refresh/disconnect where recoverable
- Security:
  - validate all user input
  - server-authoritative scoring/attempt checks
  - rate limits for submissions/votes/room joins

---

## 12) Analytics & KPIs

### Core KPIs
- D1 / D7 retention
- games per WAU
- Pixel 1v1 rematch rate
- Blind run completion rate
- Blind cap utilization (% users using all 3)
- Discover playlist open rate
- Discover save rate
- Share click-through/install-back rate

### Event tracking examples
- `pixel_genres_selected`
- `pixel_round_answered`
- `pixel_duel_completed`
- `blind_attempt_started`
- `blind_attempt_blocked_daily_cap`
- `playlist_submitted`
- `playlist_saved`
- `result_shared`

---

## 13) Rollout Plan

### Phase 1
- Pixel Panic solo + Blind Taste (3/day) + shared result screen.
- Discover read-only seeded feed (curated playlists).

### Phase 2
- Pixel 1v1 invite battle.
- Discover submissions + upvotes + saves + mood filters.

### Phase 3
- Moderation tooling + ranking improvements + personalization feed.

---

## 14) Final Product Decisions Locked
- Pixel Panic supports multi-genre selection (1+ genres).
- Blind Taste has no release-era prompt.
- Blind Taste capped to 3 runs/day/user only.
- Community is playlist-only with one-line description.
- End-game share flow exists for both games and supports major social platforms via share URL + OG previews.
