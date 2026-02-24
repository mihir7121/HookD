export const DISCOVER_TABS = ["trending", "new"] as const;
export type DiscoverTab = (typeof DISCOVER_TABS)[number];

export const MOOD_OPTIONS = [
  "focus",
  "late-night",
  "gym",
  "heartbreak",
  "party",
  "calm",
  "commute",
  "hype",
  "study",
  "rainy-day",
] as const;

export function isDiscoverTab(value: string | null): value is DiscoverTab {
  return !!value && DISCOVER_TABS.includes(value as DiscoverTab);
}

export function parseSpotifyPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  const byPath = trimmed.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
  if (byPath?.[1]) return byPath[1];

  const byUri = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]+)$/);
  if (byUri?.[1]) return byUri[1];

  return null;
}

export function normalizeMoodTags(tags: string[]): string[] {
  const cleaned = tags
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0 && MOOD_OPTIONS.includes(tag as (typeof MOOD_OPTIONS)[number]));

  return Array.from(new Set(cleaned)).slice(0, 3);
}
