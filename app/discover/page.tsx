"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DiscoverFeed } from "@/components/DiscoverFeed";

export default function DiscoverPage() {
  const { status } = useSession();
  const router = useRouter();

  return (
    <main className="min-h-screen bg-bg text-white">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="font-mono text-xs text-textdim hover:text-white tracking-[0.2em] transition-colors"
          >
            ← BACK
          </button>
          <div className="w-px h-4 bg-border" />
          <p className="font-mono text-xs text-textdim tracking-[0.4em] uppercase">Community Playlists</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <DiscoverFeed authenticated={status === "authenticated"} />
      </div>
    </main>
  );
}
