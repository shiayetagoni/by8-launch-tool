import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface StoredTokenData {
  ca: string;
  name: string;
  symbol: string;
  supply: string;
  decimals: number;
  image?: string;
  description?: string;
  verifiedOnChain?: boolean;
}

function readTokenData(): StoredTokenData | null {
  try {
    const raw = sessionStorage.getItem("by8_token_data");
    if (!raw) return null;
    return JSON.parse(raw) as StoredTokenData;
  } catch {
    return null;
  }
}

function readNetwork(): string {
  return sessionStorage.getItem("by8_onboarding_network") ?? "Solana";
}

// ─── Token Logo ────────────────────────────────────────────────────────────────

export function TokenLogo({
  symbol,
  imageUrl,
  size = 36,
}: {
  symbol: string;
  imageUrl?: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const letters = symbol ? symbol.slice(0, 2).toUpperCase() : "?";

  // Deterministic accent color based on first letter
  const hues = [160, 200, 270, 320, 40, 190, 140, 230, 300, 60];
  const hue = hues[(letters.charCodeAt(0) ?? 0) % hues.length];
  const bg = `linear-gradient(135deg, hsl(${hue},60%,14%) 0%, hsl(${hue + 40},65%,18%) 100%)`;
  const borderColor = `hsl(${hue},70%,38%)`;
  const textColor = `hsl(${hue},85%,72%)`;

  if (imageUrl && !imgError) {
    return (
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        {/* Shimmer placeholder while loading */}
        {!imgLoaded && (
          <div
            className="absolute inset-0 rounded-full skeleton-shimmer"
            style={{ border: "2px solid rgba(0,255,135,0.25)" }}
          />
        )}
        <img
          src={imageUrl}
          alt={symbol}
          onError={() => setImgError(true)}
          onLoad={() => setImgLoaded(true)}
          className="rounded-full object-cover"
          style={{
            width: size,
            height: size,
            border: "2px solid rgba(0,255,135,0.3)",
            boxShadow:
              "0 0 14px rgba(0,196,255,0.22), 0 0 5px rgba(0,255,135,0.18)",
            opacity: imgLoaded ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold select-none"
      style={{
        width: size,
        height: size,
        background: bg,
        border: `2px solid ${borderColor}`,
        color: textColor,
        fontSize: size * 0.36,
        fontFamily: "Space Grotesk, sans-serif",
        boxShadow: `0 0 10px ${borderColor}35, 0 0 3px ${borderColor}25`,
      }}
    >
      {letters}
    </div>
  );
}

// ─── Token Header ──────────────────────────────────────────────────────────────

export default function TokenHeader() {
  const token = readTokenData();
  const network = readNetwork();
  const [tick, setTick] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate the live tracking pulse every ~3s
  useEffect(() => {
    tickRef.current = setInterval(() => setTick((v) => !v), 3000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  if (!token) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.2, 0.64, 1] }}
      className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
      style={{
        background: "rgba(11,15,24,0.95)",
        border: "1px solid rgba(0,255,135,0.15)",
        boxShadow:
          "0 1px 0 rgba(0,255,135,0.06), inset 0 1px 0 rgba(255,255,255,0.03), 0 4px 18px rgba(0,0,0,0.35)",
      }}
      data-ocid="token_header.bar"
    >
      {/* Logo */}
      <TokenLogo symbol={token.symbol} imageUrl={token.image} size={36} />

      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-bold text-sm leading-tight truncate"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "#f0f4f8",
              letterSpacing: "-0.01em",
            }}
            data-ocid="token_header.name"
          >
            {token.name}
          </span>

          {/* Symbol badge */}
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
            style={{
              background: "rgba(0,196,255,0.08)",
              border: "1px solid rgba(0,196,255,0.22)",
              color: "#00c4ff",
              fontFamily: "JetBrains Mono, monospace",
            }}
            data-ocid="token_header.symbol"
          >
            ${token.symbol}
          </span>

          {/* Network badge — with chain icon */}
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 flex items-center gap-1"
            style={{
              background: "rgba(157,95,234,0.1)",
              border: "1px solid rgba(157,95,234,0.25)",
              color: "#b56fff",
              fontFamily: "JetBrains Mono, monospace",
            }}
            data-ocid="token_header.network"
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {network}
          </span>

          {/* Verified badge */}
          {token.verifiedOnChain && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 flex items-center gap-1"
              style={{
                background: "rgba(0,255,135,0.07)",
                border: "1px solid rgba(0,255,135,0.22)",
                color: "#00ff87",
                fontFamily: "Space Grotesk, sans-serif",
              }}
              data-ocid="token_header.verified_badge"
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                aria-hidden="true"
                style={{ filter: "drop-shadow(0 0 3px rgba(0,255,135,0.6))" }}
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Active Tracking badge — gradient background, pulsing glow */}
      <div
        className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 rounded-full"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,255,135,0.1), rgba(0,196,255,0.06))",
          border: "1px solid rgba(0,255,135,0.2)",
          boxShadow: tick
            ? "0 0 12px rgba(0,255,135,0.25), 0 0 4px rgba(0,255,135,0.12)"
            : "0 0 6px rgba(0,255,135,0.1)",
          transition: "box-shadow 0.6s ease",
        }}
        data-ocid="token_header.status"
      >
        <motion.span
          animate={{ opacity: [1, 0.25, 1], scale: [1, 1.35, 1] }}
          transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY }}
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: "#00ff87",
            boxShadow: "0 0 6px #00ff87",
          }}
        />
        <span
          className="text-[10px] font-semibold"
          style={{
            color: "#00ff87",
            fontFamily: "JetBrains Mono, monospace",
            letterSpacing: "0.03em",
          }}
        >
          Active
        </span>
      </div>
    </motion.div>
  );
}

export { readTokenData, readNetwork };
export type { StoredTokenData };
