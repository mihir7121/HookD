"use client";
import React, { useState } from "react";

const GAME_META: Record<string, { title: string; color: string; bullets: string[] }> = {
  pixel: {
    title: "PIXEL PANIC",
    color: "#c8ff00",
    bullets: [
      "Cover blurs then slowly sharpens",
      "Pick the right album fast",
      "Faster answers earn more points",
    ],
  },
  slide: {
    title: "COVER SLIDE",
    color: "#ff9f1c",
    bullets: [
      "Slide tiles back into order",
      "Race the clock to solve",
      "Bigger grid, harder challenge",
    ],
  },
  blind: {
    title: "BLIND TASTE TEST",
    color: "#f472b6",
    bullets: [
      "10-second clip, no hints given",
      "Guess artist and track name",
      "Even superfans get humbled",
    ],
  },
};

function storageKey(id: string) {
  return `hookd_htp_never_${id}`;
}

export function useHowToPlay(gameId: string) {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(storageKey(gameId));
  });

  return {
    show,
    dismiss: () => setShow(false),
    neverShow: () => {
      localStorage.setItem(storageKey(gameId), "1");
      setShow(false);
    },
  };
}

export function HowToPlay({
  gameId,
  onDismiss,
  onNeverShow,
}: {
  gameId: string;
  onDismiss: () => void;
  onNeverShow: () => void;
}) {
  const meta = GAME_META[gameId];
  if (!meta) return null;
  const { title, color, bullets } = meta;

  return (
    <>
      <style>{`
        @keyframes htp_pixelBlur{0%,15%{filter:blur(9px) brightness(.55)}72%,87%{filter:blur(0) brightness(1)}100%{filter:blur(9px) brightness(.55)}}
        @keyframes htp_waveBar1{0%,100%{height:6px}50%{height:28px}}
        @keyframes htp_waveBar2{0%,100%{height:22px}50%{height:7px}}
        @keyframes htp_waveBar3{0%,100%{height:12px}50%{height:34px}}
        @keyframes htp_waveBar4{0%,100%{height:30px}50%{height:10px}}
        @keyframes htp_waveBar5{0%,100%{height:9px}50%{height:24px}}
        @keyframes htp_tileSlide{0%,18%{transform:translateY(0)}48%,72%{transform:translateY(-37px)}88%,100%{transform:translateY(0)}}
        @keyframes htp_fadeIn{from{opacity:0;transform:scale(0.96) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(8,8,10,0.84)",
          backdropFilter: "blur(14px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}
      >
        {/* Card */}
        <div
          style={{
            width: "100%", maxWidth: "360px",
            background: "rgba(14,14,18,0.98)",
            border: `1px solid ${color}22`,
            boxShadow: `0 0 80px ${color}10, 0 40px 80px rgba(0,0,0,0.6)`,
            overflow: "hidden",
            animation: "htp_fadeIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          {/* Animated preview */}
          <HtpPreview gameId={gameId} color={color} />

          {/* Content */}
          <div style={{ padding: "24px 28px 28px" }}>
            <p
              className="font-mono"
              style={{ fontSize: "9px", letterSpacing: "0.42em", color: `${color}65`, marginBottom: "6px" }}
            >
              HOW TO PLAY
            </p>
            <h2
              className="font-display"
              style={{ fontSize: "26px", letterSpacing: "0.08em", color: "#fff", lineHeight: 1, marginBottom: "20px" }}
            >
              {title}
            </h2>

            {/* Bullets */}
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 26px 0", display: "flex", flexDirection: "column", gap: "11px" }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: color, flexShrink: 0, opacity: 0.7 }} />
                  <span
                    className="font-mono"
                    style={{ fontSize: "11px", letterSpacing: "0.06em", color: "rgba(255,255,255,0.62)" }}
                  >
                    {b}
                  </span>
                </li>
              ))}
            </ul>

            {/* Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              <button
                onClick={onDismiss}
                className="font-mono"
                style={{
                  width: "100%", padding: "13px",
                  fontSize: "11px", letterSpacing: "0.2em",
                  background: `linear-gradient(135deg, ${color}22, ${color}0e)`,
                  border: `1px solid ${color}45`,
                  color, cursor: "pointer",
                }}
              >
                GOT IT →
              </button>
              <button
                onClick={onNeverShow}
                className="font-mono"
                style={{
                  width: "100%", padding: "10px",
                  fontSize: "9px", letterSpacing: "0.2em",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(255,255,255,0.22)",
                  cursor: "pointer",
                }}
              >
                DON'T SHOW AGAIN
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Mini animated preview (mirrors landing page GamePreview with htp_ keyframes) ──

function HtpPreview({ gameId, color }: { gameId: string; color: string }) {
  const wrap: React.CSSProperties = {
    width: "100%", height: "140px",
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", overflow: "hidden", flexShrink: 0,
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    background: "rgba(0,0,0,0.28)",
  };

  if (gameId === "pixel") {
    const blocks = [
      "#1a3010","#5a8a35","#c8ff00","#2d4a1e",
      "#3d6b28","#a5d63c","#8bc34a","#1f3a14",
      "#c8ff00","#1a2e0f","#4e7a23","#6aa831",
      "#2d4a1e","#8bc34a","#1f3a14","#5a8a35",
    ];
    return (
      <div style={wrap}>
        <div style={{ animation: "htp_pixelBlur 4s ease-in-out infinite" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 22px)", gridTemplateRows: "repeat(4, 22px)", gap: "3px" }}>
            {blocks.map((c, i) => <div key={i} style={{ background: c, borderRadius: "2px" }} />)}
          </div>
        </div>
        <span className="font-mono" style={{ position: "absolute", bottom: 8, right: 10, fontSize: "8px", letterSpacing: "0.22em", color: `${color}50` }}>
          SHARPENING...
        </span>
      </div>
    );
  }

  if (gameId === "slide") {
    const tiles: (number | null)[] = [1, 2, null, 4, 5, 6, 7, 8, 3];
    return (
      <div style={wrap}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 34px)", gridTemplateRows: "repeat(3, 34px)", gap: "3px" }}>
          {tiles.map((t, i) =>
            t === null ? (
              <div key={i} style={{ borderRadius: "3px", border: `1px dashed ${color}20`, background: "transparent" }} />
            ) : (
              <div key={i} style={{
                borderRadius: "3px",
                background: i === 5 ? `${color}22` : "rgba(255,255,255,0.06)",
                border: `1px solid ${i === 5 ? color + "45" : "rgba(255,255,255,0.1)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "monospace", fontSize: "11px",
                color: i === 5 ? color : "rgba(255,255,255,0.28)",
                animation: i === 5 ? "htp_tileSlide 3.5s ease-in-out infinite" : "none",
                position: "relative", zIndex: i === 5 ? 2 : 1,
              }}>
                {t}
              </div>
            )
          )}
        </div>
        <span className="font-mono" style={{ position: "absolute", bottom: 8, right: 10, fontSize: "8px", letterSpacing: "0.22em", color: `${color}50` }}>
          SLIDE TO SOLVE
        </span>
      </div>
    );
  }

  if (gameId === "blind") {
    const barAnims = [
      "htp_waveBar1","htp_waveBar3","htp_waveBar5",
      "htp_waveBar2","htp_waveBar4","htp_waveBar1",
      "htp_waveBar3","htp_waveBar5","htp_waveBar2",
      "htp_waveBar4","htp_waveBar1","htp_waveBar3",
    ];
    return (
      <div style={wrap}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "5px", height: "50px" }}>
          {barAnims.map((anim, i) => (
            <div key={i} style={{
              width: "4px", height: "10px",
              background: color, opacity: 0.5, borderRadius: "2px",
              animation: `${anim} ${1.1 + (i % 3) * 0.2}s ease-in-out ${(i * 0.08).toFixed(2)}s infinite`,
            }} />
          ))}
        </div>
        <span className="font-mono" style={{ position: "absolute", bottom: 8, right: 10, fontSize: "8px", letterSpacing: "0.22em", color: `${color}50` }}>
          10s CLIP
        </span>
      </div>
    );
  }

  return <div style={wrap} />;
}
