export const spotifyFetch = async (
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
) => {
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
  return res.json();
};

/** Fetch user's top tracks (needed for song-snippet + lyrics games) */
export const getTopTracks = async (accessToken: string, limit = 50) => {
  return spotifyFetch(
    `/me/top/tracks?limit=${limit}&time_range=medium_term`,
    accessToken
  );
};

/** Fetch top tracks across all three time ranges and return deduplicated items */
export const getTopTracksAllRanges = async (accessToken: string, limitPerRange = 50): Promise<{ items: any[] }> => {
  const [short, medium, long] = await Promise.allSettled([
    spotifyFetch(`/me/top/tracks?limit=${limitPerRange}&time_range=short_term`, accessToken),
    spotifyFetch(`/me/top/tracks?limit=${limitPerRange}&time_range=medium_term`, accessToken),
    spotifyFetch(`/me/top/tracks?limit=${limitPerRange}&time_range=long_term`, accessToken),
  ]);
  const seen = new Set<string>();
  const items: any[] = [];
  for (const result of [short, medium, long]) {
    if (result.status === "fulfilled") {
      for (const track of result.value.items ?? []) {
        if (track.id && !seen.has(track.id)) {
          seen.add(track.id);
          items.push(track);
        }
      }
    }
  }
  return { items };
};

/** Fetch user's saved/liked tracks */
export const getSavedTracks = async (accessToken: string, limit = 50): Promise<{ items: any[] }> => {
  const data = await spotifyFetch(`/me/tracks?limit=${limit}`, accessToken);
  // Saved tracks wrap each item in { added_at, track: {...} } — unwrap to match top tracks shape
  return { items: (data.items ?? []).map((i: any) => i.track).filter(Boolean) };
};

/** Fetch user's top artists (needed for artist-silhouette game) */
export const getTopArtists = async (accessToken: string, limit = 50) => {
  return spotifyFetch(
    `/me/top/artists?limit=${limit}&time_range=medium_term`,
    accessToken
  );
};

/** Fetch several albums to build the album-cover game */
export const getNewReleases = async (accessToken: string, limit = 20) => {
  return spotifyFetch(
    `/browse/new-releases?limit=${limit}`,
    accessToken
  );
};

/** Artist's top tracks (market=from_token uses user's country) */
export const getArtistTopTracks = async (artistId: string, accessToken: string) =>
  spotifyFetch(`/artists/${artistId}/top-tracks?market=from_token`, accessToken);

/** Related artists for a given artist */
export const getRelatedArtists = async (artistId: string, accessToken: string) =>
  spotifyFetch(`/artists/${artistId}/related-artists`, accessToken);

/** Albums released by a given artist (albums + singles, user's market) */
export const getArtistAlbums = async (
  artistId: string,
  accessToken: string,
  limit = 5
) =>
  spotifyFetch(
    `/artists/${artistId}/albums?include_groups=album,single&limit=${limit}&market=from_token`,
    accessToken
  );

/** Shuffle array helper */
export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Pick n random items from an array */
export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}
