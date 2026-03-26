"use client";
import { useEffect, useState } from "react";

const COLOR = "#00cfff";
const CARD_W = 272;
const GAP = 20;
// Animation moves one full set of cards, then loops — includes the trailing gap
// so the second set picks up seamlessly where the first ended.
const stepPx = (n: number) => n * (CARD_W + GAP);

type Entry = {
  id: string;
  oneLiner: string;
  moodTags: string[];
  upvotes: number;
  saves: number;
  playlist: {
    url: string;
    title: string;
    image: string | null;
    ownerName: string;
    trackCount: number;
  };
};

export function TrendingCarousel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    fetch("/api/discover/feed?tab=trending")
      .then((r) => r.json())
      .then((d) => setEntries((d.entries ?? []).slice(0, 10)))
      .catch(() => {});
  }, []);

  if (entries.length === 0) return null;

  const totalShift = stepPx(entries.length);
  // ~55s per full loop regardless of card count — adjust the divisor to taste
  const duration = Math.round(totalShift / 42);

  return (
    <>
      <style>{`
        @keyframes tc_marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-${totalShift}px); }
        }
        .tc-track {
          animation: tc_marquee ${duration}s linear infinite;
        }
        .tc-track.paused {
          animation-play-state: paused;
        }
        .tc-card {
          transition: border-color 0.35s ease, transform 0.35s ease, box-shadow 0.35s ease;
          text-decoration: none;
        }
        .tc-card:hover {
          transform: translateY(-5px);
          border-color: rgba(0,207,255,0.38) !important;
          box-shadow: 0 24px 64px rgba(0,0,0,0.55);
        }
      `}</style>

      <section
        className="relative"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Header */}
        <div className="px-8 md:px-16 pt-20 pb-10 flex items-end justify-between">
          <div>
            <p
              className="font-mono text-xs tracking-[0.45em] mb-3 uppercase"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              Community picks
            </p>
            <h2
              className="font-display leading-none text-white"
              style={{ fontSize: "clamp(36px, 5.5vw, 72px)", letterSpacing: "0.06em" }}
            >
              TRENDING TODAY
            </h2>
          </div>
          <p
            className="hidden md:block font-body italic text-right max-w-[200px]"
            style={{ fontSize: "15px", color: "rgba(255,255,255,0.25)", lineHeight: 1.5 }}
          >
            What the community is playing right now.
          </p>
        </div>

        {/* Carousel — full bleed, no padding so cards run edge-to-edge */}
        <div
          className="overflow-hidden pb-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Track: entries duplicated for seamless loop */}
          <div
            className={`tc-track flex${paused ? " paused" : ""}`}
            style={{ gap: GAP, paddingLeft: GAP }}
          >
            {[...entries, ...entries].map((entry, i) => (
              <a
                key={`${entry.id}-${i}`}
                href={entry.playlist.url}
                target="_blank"
                rel="noreferrer"
                className="tc-card shrink-0 flex flex-col overflow-hidden"
                style={{
                  width: CARD_W,
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                {/* Album art */}
                <div className="relative shrink-0" style={{ height: 168, width: "100%" }}>
                  {entry.playlist.image ? (
                    <img
                      src={entry.playlist.image}
                      alt={entry.playlist.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full" style={{ background: "rgba(255,255,255,0.04)" }} />
                  )}
                  {/* Gradient bleed into card body */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-14 pointer-events-none"
                    style={{ background: "linear-gradient(to top, rgba(8,8,10,0.92) 0%, transparent 100%)" }}
                  />
                  <span
                    className="absolute bottom-2 right-3 font-mono"
                    style={{ fontSize: "8px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)" }}
                  >
                    {entry.playlist.trackCount} tracks
                  </span>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-2 p-4 flex-1">
                  <h3
                    className="font-display leading-tight line-clamp-2"
                    style={{ fontSize: "17px", letterSpacing: "0.04em", color: "#fff" }}
                  >
                    {entry.playlist.title}
                  </h3>
                  <p
                    className="font-body italic line-clamp-2"
                    style={{ fontSize: "13px", lineHeight: 1.5, color: "rgba(255,255,255,0.36)" }}
                  >
                    "{entry.oneLiner}"
                  </p>

                  {entry.moodTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {entry.moodTags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="font-mono uppercase"
                          style={{
                            fontSize: "11px", letterSpacing: "0.12em",
                            padding: "3px 9px",
                            border: `1px solid ${COLOR}22`,
                            color: `${COLOR}75`,
                          }}
                        >
                          {tag.replace("-", " ")}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats row */}
                  <div
                    className="flex items-center justify-between mt-auto pt-3"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span
                      className="font-mono"
                      style={{ fontSize: "11px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)" }}
                    >
                      {entry.upvotes} likes · {entry.saves} saves
                    </span>
                    <span
                      className="font-mono"
                      style={{ fontSize: "11px", letterSpacing: "0.14em", color: COLOR }}
                    >
                      OPEN ↗
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
