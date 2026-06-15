import { useState } from "react";

// ─── Token logo URLs (keyed by symbol) ────────────────────────────────────────

const TOKEN_LOGOS: Record<string, string> = {
  BONK: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdpM_nhkMbIiIF7Vx66zrSM",
  WIF: "https://bafkreibk3covs5ltyqxa272uodhculbgn2zh32te4i2nq7n6toqzaefvqm.ipfs.nftstorage.link/",
  POPCAT:
    "https://bafkreidlqld5hh5cjkywegquv5apzgj4ngtyltqfeicfpdjjmoxgirqe5u.ipfs.nftstorage.link/",
  MEW: "https://bafkreig3bsz5ueudgj35nulkwmzfbatfqjqfh5rjxhwkf73fkpztjmzjzu.ipfs.nftstorage.link/",
  PNUT: "https://bafkreicgz4xjstfr6kxlqzlhyjuawrjrpzfzb2ztflzjmxuv7pebimhjgi.ipfs.nftstorage.link/",
  GOAT: "https://bafkreihlzgxngnlf4lvlxpcffkvvwzpbkshxjgzrn7gkxrdjnnpcwbkzse.ipfs.nftstorage.link/",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSessionTokenImage(symbol: string): string | undefined {
  try {
    const raw = sessionStorage.getItem("by8_token_data");
    if (!raw) return undefined;
    const data = JSON.parse(raw) as { symbol?: string; image?: string };
    if (data.symbol?.toUpperCase() === symbol.toUpperCase() && data.image) {
      return data.image;
    }
  } catch {
    // ignore
  }
  return undefined;
}

// ─── TokenIcon ────────────────────────────────────────────────────────────────

interface TokenIconProps {
  token: string;
  logo?: string;
  imageUrl?: string;
  size?: number;
}

function TokenIcon({ token, logo, imageUrl, size = 16 }: TokenIconProps) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl =
    imageUrl ??
    logo ??
    TOKEN_LOGOS[token.toUpperCase()] ??
    getSessionTokenImage(token);

  if (resolvedUrl && !imgError) {
    return (
      <img
        src={resolvedUrl}
        alt={token}
        onError={() => setImgError(true)}
        loading="lazy"
        decoding="async"
        className="rounded-full flex-shrink-0 object-cover"
        style={{
          width: size,
          height: size,
          border: "1px solid rgba(0,255,135,0.3)",
        }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-[7px] font-bold"
      style={{
        width: size,
        height: size,
        background: "rgba(0,255,135,0.1)",
        border: "1px solid rgba(0,255,135,0.3)",
        color: "#00ff87",
        fontFamily: "JetBrains Mono, monospace",
      }}
    >
      $
    </div>
  );
}

// ─── Ticker data ───────────────────────────────────────────────────────────────

interface TickerEntry {
  wallet: string;
  token: string;
  sol: number;
  secsAgo: number;
}

const TICKER_ENTRIES: TickerEntry[] = [
  { wallet: "7xKt...mPQ", token: "BONK", sol: 35.0, secsAgo: 12 },
  { wallet: "3dFs...bNR", token: "WIF", sol: 5.0, secsAgo: 48 },
  { wallet: "9hMp...4cP", token: "POPCAT", sol: 10.0, secsAgo: 91 },
  { wallet: "5jNq...6dQ", token: "MOODENG", sol: 3.0, secsAgo: 134 },
  { wallet: "2kOr...8eR", token: "GOAT", sol: 20.0, secsAgo: 183 },
  { wallet: "8lPs...0fS", token: "PNUT", sol: 1.5, secsAgo: 212 },
  { wallet: "4mQt...1gT", token: "PEPE", sol: 0.5, secsAgo: 267 },
  { wallet: "6nRu...2hU", token: "MEW", sol: 10.0, secsAgo: 310 },
  { wallet: "1oSv...3iV", token: "BOME", sol: 0.8, secsAgo: 398 },
  { wallet: "0pTw...4jW", token: "SLERF", sol: 35.0, secsAgo: 441 },
  { wallet: "Bb4H...kAa", token: "TREMP", sol: 5.0, secsAgo: 523 },
  { wallet: "Cc9J...lBb", token: "BRETT", sol: 2.5, secsAgo: 602 },
  { wallet: "Dd2K...mCc", token: "BONK", sol: 20.0, secsAgo: 711 },
  { wallet: "Ee3L...nDd", token: "WIF", sol: 1.5, secsAgo: 793 },
  { wallet: "Ff4M...oEe", token: "POPCAT", sol: 10.0, secsAgo: 864 },
  { wallet: "Gg5N...pFf", token: "ACT", sol: 0.5, secsAgo: 932 },
  { wallet: "Hh6O...qGg", token: "PNUT", sol: 35.0, secsAgo: 1020 },
  { wallet: "Ii7P...rHh", token: "GOAT", sol: 3.0, secsAgo: 1148 },
  { wallet: "Jj8Q...sIi", token: "MEW", sol: 5.0, secsAgo: 1240 },
  { wallet: "Kk9R...tJj", token: "MOODENG", sol: 0.8, secsAgo: 1330 },
  { wallet: "Ll0S...uKk", token: "WIF", sol: 20.0, secsAgo: 1490 },
];

function formatAgo(secs: number): string {
  if (secs < 60) return `${secs}s ago`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ─── Static ticker — shows the most recent entry, no auto-cycling ─────────────
// Users can scroll the parent page to see context, or the container
// shows a single prominent entry at rest.

export function LiveTickerFade({ className = "" }: { className?: string }) {
  // Show only the first (most recent) entry — static, no cycling
  const entry = TICKER_ENTRIES[0];

  return (
    <div
      className={`w-full overflow-hidden rounded-xl flex items-center gap-3 px-3.5 py-2 contain-layout ${className}`}
      style={{
        background: "rgba(0,255,135,0.04)",
        border: "1px solid rgba(0,255,135,0.14)",
      }}
      data-ocid="live_ticker.bar"
    >
      {/* LIVE badge — pure CSS pulse */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className="w-2 h-2 rounded-full inline-block pulse-dot"
          style={{ background: "#00ff87", boxShadow: "0 0 5px #00ff87" }}
        />
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "#00ff87", fontFamily: "JetBrains Mono, monospace" }}
        >
          LIVE
        </span>
      </div>

      <div
        className="flex-shrink-0 w-px h-4"
        style={{ background: "rgba(0,255,135,0.15)" }}
      />

      {/* Static content — most recent entry */}
      <div className="flex-1 overflow-hidden">
        <div
          className="flex items-center gap-2 whitespace-nowrap"
          style={{
            opacity: 1,
            transform: "translateY(0) translateZ(0)",
          }}
        >
          <TokenIcon token={entry.token} size={16} />
          <span
            className="text-xs"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              color: "#8892a4",
            }}
          >
            <span style={{ color: "#f0f4f8", fontWeight: 600 }}>
              {entry.wallet}
            </span>{" "}
            boosted{" "}
            <span style={{ color: "#00d4ff", fontWeight: 700 }}>
              ${entry.token}
            </span>{" "}
            for{" "}
            <span style={{ color: "#00ff87", fontWeight: 700 }}>
              {entry.sol} SOL
            </span>{" "}
            <span style={{ color: "#4a5568" }}>
              · {formatAgo(entry.secsAgo)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

export { TICKER_ENTRIES, TOKEN_LOGOS, TokenIcon };
export default LiveTickerFade;
