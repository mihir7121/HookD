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
