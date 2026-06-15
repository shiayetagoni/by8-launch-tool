/**
 * GlobalActivityTicker — horizontal feed strip showing a static snapshot
 * of recent anonymized user actions.
 * No auto-injection, no intervals — fully static at rest.
 * Users can click "Refresh" to load a new snapshot.
 */

import { useCallback, useState } from "react";

// ─── Data ──────────────────────────────────────────────────────────────────────

const ACTION_TEMPLATES = [
  { action: "verified", suffix: "a token on Solana", addr: true },
  { action: "activated", suffix: "launch tracking dashboard", addr: false },
  { action: "exported", suffix: "an analytics report", addr: true },
  { action: "added", suffix: "a new token CA to tracking", addr: false },
  { action: "detected", suffix: "visibility spike +12%", addr: false },
  {
    action: "initialized",
    suffix: "analytics engine for new token",
    addr: true,
  },
  { action: "activated", suffix: "real-time engagement tracking", addr: true },
  { action: "detected", suffix: "engagement signal on $BONK", addr: false },
  { action: "verified", suffix: "wallet holdings on Solana", addr: true },
  { action: "exported", suffix: "visibility report PDF", addr: true },
  { action: "activated", suffix: "dashboard for token $WIF", addr: false },
  {
    action: "detected",
    suffix: "discovery placement increased +8%",
    addr: false,
  },
  {
    action: "initialized",
    suffix: "analytics for $POPCAT launch",
    addr: false,
  },
  { action: "verified", suffix: "whale status (7M+ tokens)", addr: true },
  { action: "activated", suffix: "30-day tracking window", addr: true },
];

const FAKE_PREFIXES = [
  "0x7f",
  "0xb3",
  "0xe2",
  "0xa1",
  "0xd4",
  "0xc9",
  "0x3f",
  "0x88",
  "Trader",
  "User",
  "Whale",
];
const FAKE_SUFFIXES = ["3a2", "91c", "77f", "44b", "6e8", "2d1", "5c3", "8f9"];

// Use a seeded pseudo-random so initial render is deterministic
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1.7) * 10000;
  return x - Math.floor(x);
}

function randomAddrSeeded(seed: number): string {
  const p = FAKE_PREFIXES[Math.floor(seededRand(seed) * FAKE_PREFIXES.length)];
  const s =
    FAKE_SUFFIXES[Math.floor(seededRand(seed + 100) * FAKE_SUFFIXES.length)];
  if (p.startsWith("0x")) return `${p}...${s}`;
  return p;
}

function formatAgo(s: number): string {
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

interface TickerItem {
  id: number;
  subject: string;
  action: string;
  suffix: string;
  secondsAgo: number;
}

// Generate a deterministic static snapshot
function generateSnapshot(offset: number): TickerItem[] {
  return [
    { secondsAgo: 4, tplIdx: 0 },
    { secondsAgo: 11, tplIdx: 6 },
    { secondsAgo: 18, tplIdx: 13 },
  ].map(({ secondsAgo, tplIdx }, i) => {
    const idx = (tplIdx + offset) % ACTION_TEMPLATES.length;
    const tpl = ACTION_TEMPLATES[idx];
    return {
      id: offset * 10 + i,
      subject: tpl.addr ? randomAddrSeeded(offset + i * 7) : "BY8 user",
      action: tpl.action,
      suffix: tpl.suffix,
      secondsAgo,
    };
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function GlobalActivityTicker() {
  const [snapshotOffset, setSnapshotOffset] = useState(0);
  const [displayItems, setDisplayItems] = useState<TickerItem[]>(() =>
    generateSnapshot(0),
  );

  const handleRefresh = useCallback(() => {
    const next = (snapshotOffset + 3) % ACTION_TEMPLATES.length;
    setSnapshotOffset(next);
    setDisplayItems(generateSnapshot(next));
  }, [snapshotOffset]);

  return (
    <div
      className="relative overflow-hidden contain-layout"
      style={{
        background: "rgba(8,13,22,0.85)",
        borderTop: "1px solid rgba(0,196,255,0.08)",
        borderBottom: "1px solid rgba(0,196,255,0.08)",
      }}
      data-ocid="global_ticker.section"
      aria-label="Platform activity snapshot"
    >
      <div className="max-w-5xl mx-auto px-5 py-2.5 flex items-center gap-3">
        {/* LIVE badge */}
        <div
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(0,255,135,0.07)",
            border: "1px solid rgba(0,255,135,0.18)",
          }}
          aria-hidden
        >
          <span
            className="pulse-dot w-1.5 h-1.5 rounded-full"
            style={{ background: "#00ff87" }}
          />
          <span
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{
              color: "#00ff87",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            Live
          </span>
        </div>

        {/* Feed items — static snapshot */}
        <div className="flex items-center gap-4 flex-1 min-w-0 overflow-hidden">
          {displayItems.slice(0, 2).map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 min-w-0 flex-shrink-0"
              style={{
                opacity: idx === 0 ? 1 : 0.65,
              }}
            >
              <span
                className="text-[11px] font-medium truncate max-w-[180px] sm:max-w-[240px]"
                style={{ color: "#8892a4" }}
              >
                <span
                  style={{
                    color: "#00b4ff",
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                  }}
                >
                  {item.subject}
                </span>{" "}
                <span style={{ color: "#00b4ff" }}>{item.action}</span>{" "}
                {item.suffix}
              </span>
              <span
                className="text-[10px] flex-shrink-0"
                style={{
                  color: "rgba(136,146,164,0.5)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {formatAgo(item.secondsAgo)}
              </span>
              {idx < 1 && (
                <span
                  className="flex-shrink-0 w-px h-3 mx-0.5"
                  style={{ background: "rgba(100,60,200,0.2)" }}
                  aria-hidden
                />
              )}
            </div>
          ))}

          {/* 3rd item — desktop only */}
          {displayItems[2] && (
            <div
              className="hidden md:flex items-center gap-1.5 min-w-0 flex-shrink-0"
              style={{ opacity: 0.45 }}
            >
              <span
                className="text-[11px] font-medium truncate max-w-[200px]"
                style={{ color: "#8892a4" }}
              >
                <span
                  style={{
                    color: "#00b4ff",
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: 600,
                  }}
                >
                  {displayItems[2].subject}
                </span>{" "}
                <span style={{ color: "#00b4ff" }}>
                  {displayItems[2].action}
                </span>{" "}
                {displayItems[2].suffix}
              </span>
              <span
                className="text-[10px] flex-shrink-0"
                style={{
                  color: "rgba(136,146,164,0.5)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {formatAgo(displayItems[2].secondsAgo)}
              </span>
            </div>
          )}
        </div>

        {/* Right: refresh + active count */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="text-[10px] px-2 py-0.5 rounded-full transition-colors duration-200"
            style={{
              color: "rgba(136,146,164,0.5)",
              fontFamily: "JetBrains Mono, monospace",
              border: "1px solid rgba(136,146,164,0.12)",
              background: "transparent",
            }}
            data-ocid="global_ticker.refresh_button"
            aria-label="Refresh activity feed"
          >
            ↺
          </button>
          <div
            className="hidden sm:flex items-center gap-1 text-[10px]"
            style={{
              color: "rgba(136,146,164,0.45)",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            <span>↑</span>
            <span>847 active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GlobalActivityTicker;
