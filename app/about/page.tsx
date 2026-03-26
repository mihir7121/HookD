"use client";
import { useRouter } from "next/navigation";

const PEOPLE = [
  {
    name: "Mihir Nikam",
    role: "Full-Stack & Product",
    color: "#c8ff00",
    image: "/mihir_nikam.jpeg",
    email: "mihir.nikam1@gmail.com",
    instagram: "https://www.instagram.com/mihir.nikamm/",
    linkedin: "https://www.linkedin.com/in/mihir-nikam/",
  },
  {
    name: "Aayush Mishra",
    role: "Product Designer & Full-Stack",
    color: "#f472b6",
    image: "/aayush_mishra.jpeg",
    email: "aayush.mishra@gmail.com",
    instagram: "https://www.instagram.com/aayushmightdoit/",
    linkedin: "https://www.linkedin.com/in/aayushmishra1512/",
  },
];

export default function AboutPage() {
  const router = useRouter();

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .about-fu1 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .about-fu2 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
        .about-fu3 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
        .about-fu4 { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
        .person-card { transition: border-color 0.3s ease, background 0.3s ease; }
        .person-card:hover { border-color: var(--card-color) !important; }
      `}</style>

      <main className="min-h-screen bg-bg text-white">

        {/* Nav */}
        <nav
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-5"
          style={{ background: "linear-gradient(to bottom, rgba(8,8,10,0.98) 0%, rgba(8,8,10,0) 100%)" }}
        >
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-accent" />
            <span className="font-display text-lg tracking-[0.22em] text-accent group-hover:opacity-70 transition-opacity">HOOKD</span>
          </button>
          <button
            onClick={() => router.back()}
            className="font-mono text-xs tracking-[0.18em] flex items-center gap-2 transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <span>← BACK</span>
          </button>
        </nav>

        {/* Content */}
        <div className="pt-40 pb-32 px-6 md:px-16 max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-20">
            <p className="about-fu1 font-mono text-xs tracking-[0.5em] uppercase mb-4" style={{ color: "rgba(255,255,255,0.22)" }}>
              The Team
            </p>
            <h1
              className="about-fu2 font-display leading-none text-white"
              style={{ fontSize: "clamp(56px, 10vw, 120px)", letterSpacing: "0.07em" }}
            >
              CREATED BY
            </h1>
            <p className="about-fu3 font-body italic mt-5 max-w-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.32)", fontSize: "clamp(15px, 2vw, 18px)" }}>
              Two people who wanted to know if they actually knew their own music taste.
            </p>
          </div>

          {/* People cards */}
          <div className="about-fu4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {PEOPLE.map((person) => (
              <div
                key={person.name}
                className="person-card flex flex-col p-8 md:p-10"
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.015)",
                  ["--card-color" as string]: person.color,
                }}
              >
                {/* Avatar */}
                <div
                  className="w-28 h-28 rounded-full mb-8 shrink-0 overflow-hidden"
                  style={{ border: `1px solid ${person.color}30` }}
                >
                  <img
                    src={person.image}
                    alt={person.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Name + role */}
                <h2
                  className="font-display tracking-wider leading-none mb-1"
                  style={{ fontSize: "clamp(24px, 3vw, 36px)", color: person.color }}
                >
                  {person.name}
                </h2>
                <p className="font-mono text-xs tracking-[0.2em] mb-8" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {person.role}
                </p>

                {/* Social links */}
                <div className="flex flex-col gap-3 mt-auto">
                  <a
                    href={`mailto:${person.email}`}
                    className="flex items-center gap-3 font-mono text-xs tracking-[0.12em] transition-opacity hover:opacity-100"
                    style={{ color: "rgba(255,255,255,0.4)", opacity: 0.7 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    {person.email}
                  </a>
                  <a
                    href={person.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 font-mono text-xs tracking-[0.12em] transition-opacity hover:opacity-100"
                    style={{ color: "rgba(255,255,255,0.4)", opacity: 0.7 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
                    Instagram ↗
                  </a>
                  <a
                    href={person.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 font-mono text-xs tracking-[0.12em] transition-opacity hover:opacity-100"
                    style={{ color: "rgba(255,255,255,0.4)", opacity: 0.7 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                    LinkedIn ↗
                  </a>
                </div>

                {/* Accent line */}
                <div
                  className="mt-8 h-px w-12"
                  style={{ background: `linear-gradient(to right, ${person.color}50, transparent)` }}
                />
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-20 pt-10" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="font-mono text-xs tracking-[0.3em] text-center" style={{ color: "rgba(255,255,255,0.15)" }}>
              BUILT WITH NEXT.JS · SPOTIFY WEB API · TOO MUCH MUSIC
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
