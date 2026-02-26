import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function getAuthedUser() {
  const session = await getServerSession(authOptions);
  const spotifyId = session ? ((session as any).spotifyId as string | undefined) : undefined;
  if (!session || !spotifyId) {
    return { session: null, userId: null, spotifyId: null };
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("spotify_id", spotifyId)
    .maybeSingle();

  if (error || !user) {
    return { session, userId: null, spotifyId };
  }

  return { session, userId: user.id as string, spotifyId };
}
