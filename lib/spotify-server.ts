let appTokenCache: { token: string; expiresAt: number } | null = null;

async function getSpotifyAppToken() {
  if (appTokenCache && Date.now() < appTokenCache.expiresAt) {
    return appTokenCache.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify app credentials");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error("Failed to get Spotify app token");
  }

  appTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max((data.expires_in ?? 3600) - 60, 60) * 1000,
  };

  return appTokenCache.token;
}

export interface SpotifyPlaylistMeta {
  spotifyPlaylistId: string;
  url: string;
  title: string;
  image: string | null;
  ownerName: string;
  trackCount: number;
}

export async function fetchSpotifyPlaylistMeta(
  spotifyPlaylistId: string,
  userAccessToken?: string
): Promise<SpotifyPlaylistMeta> {
  const accessToken = userAccessToken ?? (await getSpotifyAppToken());

  const response = await fetch(`https://api.spotify.com/v1/playlists/${spotifyPlaylistId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Spotify playlist fetch failed: ${response.status}`);
  }

  const playlist = await response.json();
  return {
    spotifyPlaylistId,
    url: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${spotifyPlaylistId}`,
    title: playlist.name ?? "Untitled Playlist",
    image: playlist.images?.[0]?.url ?? null,
    ownerName: playlist.owner?.display_name ?? "Spotify user",
    trackCount: playlist.tracks?.total ?? 0,
  };
}
