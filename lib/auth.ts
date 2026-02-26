import { AuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { supabaseAdmin } from "@/lib/supabase";

const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-top-read",
  "user-library-read",
  "playlist-read-private",
  "playlist-modify-private",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

async function refreshAccessToken(token: any) {
  try {
    const url = "https://accounts.spotify.com/api/token";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });
    const refreshed = await response.json();
    if (!response.ok) throw refreshed;
    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: { scope: SPOTIFY_SCOPES },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "spotify" && account.providerAccountId) {
        try {
          await supabaseAdmin.from("users").upsert(
            {
              spotify_id: account.providerAccountId,
              name: user.name ?? null,
              email: user.email ?? null,
              image: user.image ?? null,
            },
            { onConflict: "spotify_id" }
          );
        } catch (err) {
          console.error("Failed to upsert user in Supabase:", err);
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : 0,
          spotifyId: account.providerAccountId,
        };
      }
      if (Date.now() < (token.accessTokenExpires as number)) return token;
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).error = token.error;
      (session as any).spotifyId = token.spotifyId;
      return session;
    },
  },
};
