-- Community feature schema for Discover hub

create table if not exists playlists (
  id uuid primary key default gen_random_uuid(),
  spotify_playlist_id text unique not null,
  url text not null,
  title text not null,
  image text,
  owner_name text not null,
  track_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists playlist_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  playlist_id uuid not null references playlists(id) on delete cascade,
  one_liner text not null,
  mood_tags text[] not null,
  open_count integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint playlist_submissions_one_liner_len check (char_length(one_liner) between 20 and 100)
);

create unique index if not exists playlist_submissions_unique_active_playlist
  on playlist_submissions (playlist_id)
  where status = 'active';

create table if not exists playlist_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  submission_id uuid not null references playlist_submissions(id) on delete cascade,
  value smallint not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, submission_id)
);

create table if not exists playlist_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  submission_id uuid not null references playlist_submissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, submission_id)
);

create table if not exists playlist_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  submission_id uuid not null references playlist_submissions(id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  unique (reporter_id, submission_id)
);

create index if not exists playlist_submissions_created_at_idx on playlist_submissions (created_at desc);
create index if not exists playlist_submissions_status_idx on playlist_submissions (status);
create index if not exists playlist_submissions_mood_tags_idx on playlist_submissions using gin (mood_tags);
create index if not exists playlist_votes_submission_idx on playlist_votes (submission_id);
create index if not exists playlist_saves_submission_idx on playlist_saves (submission_id);
