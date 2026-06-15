/**
 * BY8 Launch Tool — Full Onboarding Flow
 *
 * Step 0: Path choice (CA vs Community Link)
 * CA path:
 *   Step 1: Contract address input + auto-fetch token data
 *   Step 2: Tracking preferences (toggles + duration)
 *   Step 3: Launch timeline (4 cards)
 *   Step 4: Review & Activate
 * Community path: single link input → /community
 *
 * Progress saved to sessionStorage. No auto-advance.
 */

import { createActor } from "@/backend";
import { TokenInfoSkeleton } from "@/components/SkeletonLoader";
import { haptic, hapticChain, useHaptics } from "@/hooks/use-haptics";
import { useSoundFX } from "@/hooks/use-sound-fx";
import { useAppStore } from "@/store/app-store";
import type {
  LaunchTimeline,
  TrackingWindow,
  VerifiedTokenData,
} from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useRouter } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart2,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  Eye,
  Link2,
  Loader2,
  MessageCircle,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Users,
  WifiOff,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const SS_PROGRESS_KEY = "by8_ob_progress";
const SS_ONBOARDED_KEY = "by8_onboarded";
const SS_TOKEN_KEY = "by8_token_data";

const TIMELINES: {
  id: LaunchTimeline;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "Already launched",
    label: "Already launched",
    icon: <Rocket size={18} />,
  },
  { id: "Next week", label: "Next week", icon: <TrendingUp size={18} /> },
  {
    id: "Next 24 hrs or sooner",
    label: "Next 24 hrs or sooner",
    icon: <Zap size={18} />,
  },
  {
    id: "I don't know",
    label: "I don't know",
    icon: <MessageCircle size={18} />,
  },
];

const DURATIONS: { id: TrackingWindow; label: string }[] = [
  { id: "24h", label: "24 hours" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FetchStatus = "idle" | "loading" | "success" | "error";
type FetchStage =
  | "idle"
  | "solscan"
  | "jupiter"
  | "dexscreener"
  | "direct-jupiter"
  | "direct-dexscreener"
  | "solana-rpc";
type PathChoice = "token" | "community" | null;

interface SavedProgress {
  step: number;
  ca: string;
  visibilityEnabled: boolean;
  engagementEnabled: boolean;
  trackingWindow: TrackingWindow;
  timeline: LaunchTimeline;
  communityLink: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isValidSolanaCA(ca: string): boolean {
  const t = ca.trim();
  return t.length >= 32 && t.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(t);
}

function formatSupply(supply: bigint, decimals: number): string {
  const raw = Number(supply) / 10 ** decimals;
  if (raw >= 1_000_000_000) return `${(raw / 1_000_000_000).toFixed(2)}B`;
  if (raw >= 1_000_000) return `${(raw / 1_000_000).toFixed(2)}M`;
  if (raw >= 1_000) return `${(raw / 1_000).toFixed(2)}K`;
  return raw.toLocaleString();
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(
      url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`,
    );
    return u.hostname.length > 1;
  } catch {
    return false;
  }
}

function normalizeUrl(url: string): string {
  const t = url.trim();
  return t.startsWith("http") ? t : `https://${t}`;
}

function truncateAddr(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}\u2026${addr.slice(-6)}`;
}

// ─── TokenLogo ────────────────────────────────────────────────────────────────

export function TokenLogo({
  symbol,
  imageUrl,
  size = 48,
  ringColor,
}: {
  symbol: string;
  imageUrl?: string;
  size?: number;
  ringColor?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const letter = symbol ? symbol.slice(0, 2).toUpperCase() : "?";
  const hues = [160, 200, 270, 320, 40, 190, 140, 230, 300, 60];
  const hue = hues[(letter.charCodeAt(0) ?? 0) % hues.length];
  const border = ringColor
    ? `2px solid ${ringColor}`
    : "2px solid rgba(0,255,135,0.35)";
  const shadow = ringColor
    ? `0 0 16px ${ringColor}50, 0 0 6px ${ringColor}30`
    : "0 0 16px rgba(0,255,135,0.2), 0 0 6px rgba(0,180,255,0.15)";

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={symbol}
        onError={() => setImgError(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size, border, boxShadow: shadow }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue},60%,15%) 0%, hsl(${hue + 40},65%,18%) 100%)`,
        border: ringColor
          ? `2px solid ${ringColor}`
          : `2px solid hsl(${hue},70%,40%)`,
        color: ringColor ? ringColor : `hsl(${hue},85%,72%)`,
        fontSize: size * 0.38,
        fontFamily: "Space Grotesk, sans-serif",
        boxShadow: ringColor
          ? `0 0 12px ${ringColor}60`
          : `0 0 12px hsl(${hue},70%,40%)40`,
      }}
    >
      {letter}
    </div>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

const STEP_LABELS = [
  "Choose",
  "Token Info",
  "Preferences",
  "Timeline",
  "Review",
];

function ProgressBar({ step }: { step: number }) {
  const total = STEP_LABELS.length;
  const pct = Math.round((step / total) * 100);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="/assets/logo.png"
            alt="BY8"
            className="h-7 w-auto object-contain"
            style={{
              filter:
                "drop-shadow(0 0 8px rgba(0,180,255,0.4)) drop-shadow(0 0 3px rgba(179,102,255,0.25))",
            }}
          />
          <span
            className="text-sm font-bold tracking-tight"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "#f0f4f8",
            }}
          >
            BY8 Launch Tool
          </span>
        </div>
        <span
          className="text-xs font-medium tabular-nums"
          style={{ color: "#6b7a94", fontFamily: "JetBrains Mono, monospace" }}
        >
          {step}/{total}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1">
        {STEP_LABELS.map((label, i) => {
          const s = i + 1;
          const active = s === step;
          const done = s < step;
          return (
            <div key={label} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center gap-1 flex-1">
                <div className="flex items-center gap-1">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: done
                        ? "rgba(0,255,135,0.15)"
                        : active
                          ? "rgba(0,180,255,0.15)"
                          : "rgba(255,255,255,0.04)",
                      border: done
                        ? "1px solid rgba(0,255,135,0.45)"
                        : active
                          ? "1px solid rgba(0,180,255,0.45)"
                          : "1px solid rgba(255,255,255,0.1)",
                      transition: "all 400ms ease",
                    }}
                  >
                    {done ? (
                      <CheckCircle2 size={9} style={{ color: "#00ff87" }} />
                    ) : (
                      <span
                        className="text-[9px] font-bold"
                        style={{ color: active ? "#00b4ff" : "#4a5568" }}
                      >
                        {s}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[10px] font-medium hidden sm:block"
                    style={{
                      color: active ? "#c0c8d8" : done ? "#6b7a94" : "#4a5568",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    {label}
                  </span>
                </div>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div
                  className="flex-1 h-px mx-1"
                  style={{
                    background: done
                      ? "rgba(0,180,255,0.3)"
                      : "rgba(100,60,200,0.1)",
                    transition: "background 400ms ease",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: "3px", background: "rgba(100,60,200,0.12)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #00b4ff 0%, #b366ff 100%)",
            transition: "width 450ms cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 0 6px rgba(0,180,255,0.5)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Step 0 — Path Choice ────────────────────────────────────────────────────

function Step0({
  onChooseToken,
  onChooseCommunity,
}: {
  onChooseToken: () => void;
  onChooseCommunity: () => void;
}) {
  const [selected, setSelected] = useState<PathChoice>(null);
  const { playSelect, playSuccess } = useSoundFX();

  const handleSelect = (choice: PathChoice) => {
    setSelected(choice);
    haptic("select");
    playSelect();
  };

  const handleContinue = () => {
    if (!selected) return;
    hapticChain("confirm", "success", 80);
    playSuccess();
    if (selected === "token") onChooseToken();
    else onChooseCommunity();
  };

  const options: {
    id: "token" | "community";
    icon: React.ReactNode;
    title: string;
    description: string;
    badge: string;
    accent: string;
    rgb: string;
  }[] = [
    {
      id: "token",
      icon: <BarChart2 size={26} />,
      title: "Token Launch Tracking",
      description:
        "Paste your contract address to track visibility, engagement, and launch performance in real time.",
      badge: "Contract Address",
      accent: "#00b4ff",
      rgb: "0,180,255",
    },
    {
      id: "community",
      icon: <Users size={26} />,
      title: "Community Growth Tracking",
      description:
        "Share your community link to activate organic engagement and reach active traders.",
      badge: "Community Link",
      accent: "#b366ff",
      rgb: "179,102,255",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1
          className="text-2xl font-bold leading-tight"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: "#f0f4f8" }}
        >
          What are you setting up today?
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#8892a4" }}>
          Choose how you'd like to get started with BY8
        </p>
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: role=group pattern used intentionally */}
      <div className="space-y-3" role="group" aria-label="Setup path">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleSelect(opt.id)}
              data-ocid={`onboarding.path_${opt.id}_card`}
              className="w-full text-left p-5 rounded-2xl transition-all duration-200 active:scale-[0.975]"
              style={{
                background: isSelected
                  ? `rgba(${opt.rgb},0.07)`
                  : "rgba(13,17,23,0.85)",
                border: `2px solid ${isSelected ? opt.accent : "rgba(100,60,200,0.15)"}`,
                boxShadow: isSelected
                  ? `0 0 0 1px rgba(${opt.rgb},0.18), 0 0 24px rgba(${opt.rgb},0.12), inset 0 1px 0 rgba(${opt.rgb},0.05)`
                  : "0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.02)",
                transform: isSelected ? "translateY(-1px)" : "none",
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: isSelected
                      ? `rgba(${opt.rgb},0.15)`
                      : "rgba(100,60,200,0.08)",
                    border: `1.5px solid ${isSelected ? `${opt.accent}50` : "rgba(100,60,200,0.12)"}`,
                    color: isSelected ? opt.accent : "#6b7a94",
                    transition: "all 200ms ease",
                    boxShadow: isSelected
                      ? `0 0 12px rgba(${opt.rgb},0.2)`
                      : "none",
                  }}
                >
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="text-base font-bold leading-tight"
                      style={{
                        color: isSelected ? "#f0f4f8" : "#c0c8d8",
                        fontFamily: "Space Grotesk, sans-serif",
                        transition: "color 200ms ease",
                      }}
                    >
                      {opt.title}
                    </p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide"
                      style={{
                        background: isSelected
                          ? `rgba(${opt.rgb},0.15)`
                          : "rgba(100,60,200,0.08)",
                        border: `1px solid ${isSelected ? `${opt.accent}45` : "rgba(100,60,200,0.18)"}`,
                        color: isSelected ? opt.accent : "#6b7a94",
                        fontFamily: "JetBrains Mono, monospace",
                        transition: "all 200ms ease",
                      }}
                    >
                      {opt.badge}
                    </span>
                  </div>
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: isSelected ? "#8892a4" : "#6b7a94",
                      transition: "color 200ms ease",
                    }}
                  >
                    {opt.description}
                  </p>
                </div>
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isSelected ? opt.accent : "transparent",
                    border: `2px solid ${isSelected ? opt.accent : "rgba(100,60,200,0.25)"}`,
                    boxShadow: isSelected
                      ? `0 0 8px rgba(${opt.rgb},0.35)`
                      : "none",
                  }}
                >
                  {isSelected && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#0a0e1a" }}
                    />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="transition-all duration-300"
        style={{
          opacity: selected ? 1 : 0,
          transform: selected ? "translateY(0)" : "translateY(8px)",
          pointerEvents: selected ? "auto" : "none",
        }}
      >
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected}
          className="btn-3d w-full py-4 rounded-xl text-sm font-bold min-h-[52px]"
          style={{ fontFamily: "Space Grotesk, sans-serif" }}
          data-ocid="onboarding.path_continue_button"
        >
          Continue →
        </button>
      </div>

      <p className="text-center text-xs" style={{ color: "#4a5568" }}>
        <ShieldCheck
          size={12}
          className="inline mr-1"
          style={{ color: "#4a5568" }}
        />
        No wallet connection required at this stage.
      </p>
    </div>
  );
}

// ─── Community Path ────────────────────────────────────────────────────────────

function CommunityPath({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const { playSuccess, playError } = useSoundFX();

  const handleSubmit = () => {
    const trimmed = link.trim();
    if (!trimmed) {
      setError("Please enter a community link to continue.");
      haptic("error");
      playError();
      return;
    }
    if (!isValidUrl(trimmed)) {
      setError("Please enter a valid URL (e.g. discord.gg/yourserver)");
      haptic("error");
      playError();
      return;
    }
    setError("");
    sessionStorage.setItem(SS_ONBOARDED_KEY, "true");
    sessionStorage.setItem("by8_community_link", normalizeUrl(trimmed));
    hapticChain("confirm", "success", 80);
    playSuccess();
    router.navigate({ to: "/community" });
  };

  const communityTypes = [
    { label: "Discord", example: "discord.gg/yourserver", icon: "💬" },
    { label: "Twitter/X", example: "twitter.com/yourhandle", icon: "🐦" },
    { label: "Website", example: "yourtoken.com", icon: "🌐" },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            haptic("navigation");
            onBack();
          }}
          className="flex items-center gap-1.5 text-sm min-h-[40px] transition-smooth"
          style={{ color: "#6b7a94" }}
          data-ocid="onboarding.community_back_button"
        >
          <ChevronLeft size={15} />
          Back
        </button>
        <h1
          className="text-2xl font-bold leading-tight"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: "#f0f4f8" }}
        >
          Set Up Community Tracking
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#8892a4" }}>
          Share your community link and we'll track engagement and growth
          signals for your community.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {communityTypes.map((t) => (
          <div
            key={t.label}
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(179,102,255,0.05)",
              border: "1px solid rgba(179,102,255,0.12)",
            }}
          >
            <span className="text-base">{t.icon}</span>
            <div className="min-w-0">
              <p
                className="text-xs font-semibold"
                style={{
                  color: "#c0c8d8",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                {t.label}
              </p>
              <p
                className="text-[10px] truncate"
                style={{
                  color: "#6b7a94",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {t.example}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="ob-community-link"
          className="text-xs font-semibold tracking-wide uppercase"
          style={{ color: "#8892a4" }}
        >
          Community Link
        </label>
        <div className="relative">
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: link ? "#b366ff" : "#4a5568" }}
          >
            <Link2 size={15} />
          </div>
          <input
            id="ob-community-link"
            type="url"
            value={link}
            onChange={(e) => {
              setLink(e.target.value);
              setError("");
              haptic("tap");
            }}
            placeholder="discord.gg/yourserver or yourtoken.com…"
            data-ocid="onboarding.community_link_input"
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm min-h-[48px]"
            autoComplete="url"
            spellCheck={false}
            style={{
              background: "rgba(13,17,23,0.9)",
              border: `1.5px solid ${error ? "rgba(255,80,80,0.5)" : link ? "rgba(179,102,255,0.45)" : "rgba(179,102,255,0.18)"}`,
              color: "#f0f4f8",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "13px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
          />
        </div>
        {error && (
          <p
            className="text-xs"
            style={{ color: "#ff6b6b" }}
            data-ocid="onboarding.community_link_field_error"
          >
            {error}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="btn-3d w-full py-3.5 rounded-xl text-sm font-bold min-h-[48px]"
        style={{ fontFamily: "Space Grotesk, sans-serif" }}
        data-ocid="onboarding.community_submit_button"
      >
        Start Community Tracking →
      </button>

      <p className="text-center text-xs" style={{ color: "#4a5568" }}>
        <ShieldCheck
          size={12}
          className="inline mr-1"
          style={{ color: "#4a5568" }}
        />
        Read-only analytics. No wallet access required.
      </p>
    </div>
  );
}

// ─── Loading / Error / Success Cards ─────────────────────────────────────────

const STAGE_LABELS: Record<FetchStage, string> = {
  idle: "Connecting to analytics engine…",
  solscan: "Checking Solscan blockchain data…",
  jupiter: "Trying Jupiter token registry…",
  dexscreener: "Trying Dexscreener markets…",
  "direct-jupiter": "Fetching via Jupiter directly…",
  "direct-dexscreener": "Fetching via Dexscreener directly…",
  "solana-rpc": "Querying Solana RPC…",
};

function LoadingCard({ stage }: { stage: FetchStage }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
      style={{
        background: "rgba(0,180,255,0.04)",
        border: "1px solid rgba(0,180,255,0.2)",
        boxShadow:
          "0 0 30px rgba(0,180,255,0.06), inset 0 1px 0 rgba(0,180,255,0.05)",
      }}
      data-ocid="onboarding.ca_loading_state"
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: 64, height: 64 }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: "2px solid rgba(0,180,255,0.15)",
            animation: "token-ring-pulse 1.4s ease-in-out infinite",
          }}
        />
        <div
          className="absolute inset-2 rounded-full"
          style={{
            border: "2px solid rgba(0,180,255,0.08)",
            animation: "token-ring-pulse 1.4s ease-in-out 0.4s infinite",
          }}
        />
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(0,180,255,0.08)",
            border: "1.5px solid rgba(0,180,255,0.3)",
          }}
        >
          <Loader2
            size={18}
            className="animate-spin"
            style={{ color: "#00b4ff" }}
          />
        </div>
      </div>
      <div className="space-y-1">
        <p
          className="text-sm font-bold"
          style={{ color: "#f0f4f8", fontFamily: "Space Grotesk, sans-serif" }}
        >
          Fetching Token Data…
        </p>
        <p className="text-xs" style={{ color: "#00b4ff" }}>
          {STAGE_LABELS[stage]}
        </p>
      </div>
      <div className="w-full space-y-2">
        {[80, 60, 70].map((w) => (
          <div
            key={w}
            className="h-2 rounded-full skeleton-shimmer mx-auto"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function SuccessCard({ tokenMeta }: { tokenMeta: VerifiedTokenData }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "rgba(0,255,135,0.035)",
        border: "1.5px solid rgba(0,255,135,0.35)",
        boxShadow:
          "0 0 40px rgba(0,255,135,0.08), inset 0 1px 0 rgba(0,255,135,0.06)",
        animation: "token-card-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
      data-ocid="onboarding.verified_token_card"
    >
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(0,255,135,0.08)",
            border: "1px solid rgba(0,255,135,0.25)",
          }}
        >
          <CheckCircle2 size={12} style={{ color: "#00ff87" }} />
          <span
            className="text-xs font-bold"
            style={{
              color: "#00ff87",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            Token Verified ✓
          </span>
        </div>
        {tokenMeta.fetchedVia && (
          <span
            className="text-[10px] px-2 py-1 rounded-full font-semibold"
            style={{
              background: "rgba(0,180,255,0.08)",
              border: "1px solid rgba(0,180,255,0.2)",
              color: "#00b4ff",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {tokenMeta.fetchedVia}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <TokenLogo
          symbol={tokenMeta.symbol}
          imageUrl={tokenMeta.image ?? tokenMeta.imageUrl}
          size={56}
        />
        <div className="flex-1 min-w-0 space-y-1">
          <p
            className="text-xl font-bold leading-tight truncate"
            style={{
              color: "#f0f4f8",
              fontFamily: "Space Grotesk, sans-serif",
            }}
            data-ocid="onboarding.token_name"
          >
            {tokenMeta.name}
          </p>
          <p
            className="text-sm font-bold"
            style={{
              color: "#00b4ff",
              fontFamily: "JetBrains Mono, monospace",
            }}
            data-ocid="onboarding.token_symbol"
          >
            ${tokenMeta.symbol}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-3 space-y-0.5"
          style={{
            background: "rgba(0,255,135,0.04)",
            border: "1px solid rgba(0,255,135,0.1)",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "#4a7a5a" }}
          >
            Supply
          </p>
          <p
            className="text-sm font-bold"
            style={{
              color: "#f0f4f8",
              fontFamily: "JetBrains Mono, monospace",
            }}
            data-ocid="onboarding.token_supply"
          >
            {formatSupply(tokenMeta.supply, tokenMeta.decimals)}
          </p>
        </div>
        <div
          className="rounded-xl p-3 space-y-0.5"
          style={{
            background: "rgba(0,255,135,0.04)",
            border: "1px solid rgba(0,255,135,0.1)",
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "#4a7a5a" }}
          >
            Network
          </p>
          <p
            className="text-sm font-bold"
            style={{
              color: "#f0f4f8",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            Solana
          </p>
        </div>
      </div>

      {tokenMeta.description && (
        <p
          className="text-xs leading-relaxed line-clamp-2"
          style={{ color: "#6b8a7a" }}
        >
          {tokenMeta.description}
        </p>
      )}
    </div>
  );
}

function ErrorCard({
  error,
  onRetry,
  retryCount,
}: {
  error: string;
  onRetry: () => void;
  retryCount: number;
}) {
  const friendly = (() => {
    if (
      error.includes("not found on any provider") ||
      error.includes("not found on Solscan, Jupiter")
    )
      return "Token not found on any provider. Verify the address is a valid Solana SPL token and try again.";
    if (error.includes("not found") || error.includes("Token not found"))
      return "Token not found. Double-check your contract address.";
    if (error.includes("parse") || error.includes("Could not parse"))
      return "Token data could not be read. The address may be invalid.";
    if (
      error.includes("HTTP") ||
      error.includes("network error") ||
      error.includes("outcall failed")
    )
      return "Network error — lookup service temporarily unavailable. Please try again.";
    return error || "Token lookup failed. Please try again.";
  })();

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "rgba(255,80,80,0.04)",
        border: "1.5px solid rgba(255,80,80,0.28)",
        animation: "token-card-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
      data-ocid="onboarding.ca_error_state"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: "rgba(255,80,80,0.1)",
            border: "1.5px solid rgba(255,80,80,0.3)",
          }}
        >
          <WifiOff size={16} style={{ color: "#ff5050" }} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle size={12} style={{ color: "#ff8080" }} />
            <p
              className="text-sm font-bold"
              style={{
                color: "#ff8080",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              Lookup Failed
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#c0a0a0" }}>
            {friendly}
          </p>
          {retryCount > 0 && (
            <p className="text-xs" style={{ color: "#6b5050" }}>
              Retried {retryCount} time{retryCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm min-h-[44px] transition-all duration-200"
        style={{
          background: "rgba(255,80,80,0.08)",
          border: "1.5px solid rgba(255,80,80,0.3)",
          color: "#ff8080",
          fontFamily: "Space Grotesk, sans-serif",
        }}
        data-ocid="onboarding.retry_button"
      >
        Try Again
      </button>
    </div>
  );
}

// ─── Step 1 — CA Verification ─────────────────────────────────────────────────

function Step1({
  ca,
  onCaChange,
  fetchStatus,
  fetchStage,
  tokenMeta,
  fetchError,
  retryCount,
  onRetry,
  onContinue,
  onBack,
}: {
  ca: string;
  onCaChange: (v: string) => void;
  fetchStatus: FetchStatus;
  fetchStage: FetchStage;
  tokenMeta: VerifiedTokenData | null;
  fetchError: string;
  retryCount: number;
  onRetry: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const { playError } = useSoundFX();
  const caValid = isValidSolanaCA(ca);

  const handleContinue = () => {
    if (fetchStatus !== "success") {
      haptic("error");
      playError();
      return;
    }
    hapticChain("confirm", "success", 80);
    onContinue();
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <AnimatePresence mode="wait">
          {fetchStatus === "success" && tokenMeta && (
            <motion.div
              key="token-logo-header"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              className="flex justify-center mb-3"
            >
              <div className="relative">
                <TokenLogo
                  symbol={tokenMeta.symbol}
                  imageUrl={tokenMeta.image ?? tokenMeta.imageUrl}
                  size={54}
                  ringColor="#00b4ff"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.15,
                    type: "spring",
                    stiffness: 500,
                    damping: 20,
                  }}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(0,255,135,0.15)",
                    border: "1.5px solid rgba(0,255,135,0.5)",
                  }}
                >
                  <CheckCircle size={10} style={{ color: "#00ff87" }} />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <h1
          className="text-2xl font-bold leading-tight"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: "#f0f4f8" }}
        >
          Verify Your Token
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#8892a4" }}>
          Paste your Solana contract address. We'll fetch real on-chain data
          automatically.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="ob-ca"
          className="text-xs font-semibold tracking-wide uppercase"
          style={{ color: "#8892a4" }}
        >
          Contract Address (CA)
        </label>
        <div className="relative">
          <input
            id="ob-ca"
            type="text"
            value={ca}
            onChange={(e) => {
              onCaChange(e.target.value);
              haptic("tap");
            }}
            placeholder="Paste Solana token contract address…"
            data-ocid="onboarding.ca_input"
            className="w-full px-4 py-3 pr-10 rounded-xl text-sm min-h-[48px]"
            autoComplete="off"
            spellCheck={false}
            style={{
              background: "rgba(13,17,23,0.9)",
              border: `1.5px solid ${
                fetchStatus === "success"
                  ? "rgba(0,255,135,0.5)"
                  : fetchStatus === "error"
                    ? "rgba(255,80,80,0.5)"
                    : caValid
                      ? "rgba(0,180,255,0.45)"
                      : "rgba(0,180,255,0.18)"
              }`,
              color: "#f0f4f8",
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "13px",
              outline: "none",
              transition: "border-color 0.2s, box-shadow 0.25s",
            }}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {fetchStatus === "loading" && (
              <Loader2
                size={16}
                className="animate-spin"
                style={{ color: "#00b4ff" }}
              />
            )}
            {fetchStatus === "success" && (
              <CheckCircle2 size={16} style={{ color: "#00ff87" }} />
            )}
            {fetchStatus === "error" && (
              <AlertTriangle size={16} style={{ color: "#ff5050" }} />
            )}
          </div>
        </div>
        {fetchStatus === "idle" && ca.trim().length > 0 && !caValid && (
          <p
            className="text-xs"
            style={{ color: "#ff6b6b" }}
            data-ocid="onboarding.ca_field_error"
          >
            Enter a valid Solana address (base58, 32–44 chars)
          </p>
        )}
      </div>

      {fetchStatus === "loading" && <TokenInfoSkeleton />}
      {fetchStatus === "loading" && fetchStage !== "idle" && (
        <LoadingCard stage={fetchStage} />
      )}
      {fetchStatus === "success" && tokenMeta && (
        <SuccessCard tokenMeta={tokenMeta} />
      )}
      {fetchStatus === "error" && (
        <ErrorCard
          error={fetchError}
          onRetry={onRetry}
          retryCount={retryCount}
        />
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={fetchStatus !== "success"}
          className="btn-3d w-full py-3.5 rounded-xl text-sm font-bold min-h-[48px]"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            opacity: fetchStatus === "success" ? 1 : 0.4,
            cursor: fetchStatus === "success" ? "pointer" : "not-allowed",
          }}
          data-ocid="onboarding.step1_continue_button"
        >
          {fetchStatus === "loading" ? "Verifying…" : "Continue →"}
        </button>
        <button
          type="button"
          onClick={() => {
            haptic("navigation");
            onBack();
          }}
          className="flex items-center justify-center gap-1.5 text-sm py-2 min-h-[44px] transition-smooth"
          style={{ color: "#6b7a94" }}
          data-ocid="onboarding.step1_back_button"
        >
          <ChevronLeft size={15} />
          Back
        </button>
      </div>

      <p className="text-center text-xs" style={{ color: "#4a5568" }}>
        <ShieldCheck
          size={12}
          className="inline mr-1"
          style={{ color: "#4a5568" }}
        />
        We never ask for private keys or wallet access.
      </p>
    </div>
  );
}

// ─── Step 2 — Tracking Preferences ───────────────────────────────────────────

function Step2({
  visibilityEnabled,
  engagementEnabled,
  trackingWindow,
  onToggleVisibility,
  onToggleEngagement,
  onWindowChange,
  onContinue,
  onBack,
}: {
  visibilityEnabled: boolean;
  engagementEnabled: boolean;
  trackingWindow: TrackingWindow;
  onToggleVisibility: () => void;
  onToggleEngagement: () => void;
  onWindowChange: (w: TrackingWindow) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [error, setError] = useState("");
  const { playError, playSelect } = useSoundFX();

  const handleContinue = () => {
    if (!visibilityEnabled && !engagementEnabled) {
      setError("Enable at least one tracking type to continue.");
      haptic("error");
      playError();
      return;
    }
    setError("");
    hapticChain("confirm", "success", 80);
    onContinue();
  };

  const trackingOptions = [
    {
      id: "visibility" as const,
      label: "Visibility Tracking",
      description:
        "Track how widely your token is being seen and discovered across platforms.",
      icon: <Eye size={20} />,
      enabled: visibilityEnabled,
      onToggle: onToggleVisibility,
      accent: "#00b4ff",
      rgb: "0,180,255",
    },
    {
      id: "engagement" as const,
      label: "Engagement Tracking",
      description:
        "Monitor interactions, community growth, and active trader signals.",
      icon: <TrendingUp size={20} />,
      enabled: engagementEnabled,
      onToggle: onToggleEngagement,
      accent: "#b366ff",
      rgb: "179,102,255",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1
          className="text-2xl font-bold leading-tight"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: "#f0f4f8" }}
        >
          Tracking Preferences
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#8892a4" }}>
          Choose what you'd like BY8 to monitor during your token launch.
        </p>
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: role=group pattern used intentionally */}
      <div className="space-y-3" role="group" aria-label="Tracking options">
        {trackingOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            aria-pressed={opt.enabled}
            onClick={() => {
              opt.onToggle();
              setError("");
              haptic("select");
              playSelect();
            }}
            data-ocid={`onboarding.tracking_${opt.id}_toggle`}
            className="w-full text-left p-4 rounded-xl transition-all duration-200 active:scale-[0.98]"
            style={{
              background: opt.enabled
                ? `rgba(${opt.rgb},0.07)`
                : "rgba(13,17,23,0.85)",
              border: `2px solid ${opt.enabled ? opt.accent : "rgba(100,60,200,0.15)"}`,
              boxShadow: opt.enabled
                ? `0 0 20px rgba(${opt.rgb},0.08), inset 0 1px 0 rgba(${opt.rgb},0.04)`
                : "none",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  background: opt.enabled
                    ? `rgba(${opt.rgb},0.15)`
                    : "rgba(100,60,200,0.08)",
                  color: opt.enabled ? opt.accent : "#6b7a94",
                  transition: "all 200ms ease",
                }}
              >
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-bold"
                  style={{
                    color: opt.enabled ? "#f0f4f8" : "#c0c8d8",
                    fontFamily: "Space Grotesk, sans-serif",
                    transition: "color 200ms ease",
                  }}
                >
                  {opt.label}
                </p>
                <p
                  className="text-xs mt-0.5 leading-relaxed"
                  style={{ color: "#6b7a94" }}
                >
                  {opt.description}
                </p>
              </div>
              {/* Toggle indicator */}
              <div
                className="flex-shrink-0 w-12 h-6 rounded-full transition-all duration-200 relative"
                style={{
                  background: opt.enabled
                    ? `rgba(${opt.rgb},0.3)`
                    : "rgba(100,60,200,0.1)",
                  border: `1px solid ${opt.enabled ? opt.accent : "rgba(100,60,200,0.2)"}`,
                }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                  style={{
                    left: opt.enabled ? "calc(100% - 22px)" : "2px",
                    background: opt.enabled
                      ? opt.accent
                      : "rgba(100,60,200,0.25)",
                    boxShadow: opt.enabled
                      ? `0 0 8px rgba(${opt.rgb},0.5)`
                      : "none",
                  }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>

      {error && (
        <p
          className="text-xs"
          style={{ color: "#ff6b6b" }}
          data-ocid="onboarding.tracking_field_error"
        >
          {error}
        </p>
      )}

      <div className="space-y-2">
        <p
          className="text-xs font-semibold tracking-wide uppercase"
          style={{ color: "#8892a4" }}
        >
          Tracking Duration
        </p>
        {/* biome-ignore lint/a11y/useSemanticElements: role=group pattern used intentionally */}
        <div className="flex gap-2" role="group" aria-label="Tracking duration">
          {DURATIONS.map((d) => {
            const active = trackingWindow === d.id;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onWindowChange(d.id);
                  haptic("select");
                  playSelect();
                }}
                data-ocid={`onboarding.duration_${d.id}_button`}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold min-h-[44px] transition-all duration-200"
                style={{
                  background: active
                    ? "rgba(0,180,255,0.1)"
                    : "rgba(13,17,23,0.85)",
                  border: `1.5px solid ${active ? "rgba(0,180,255,0.45)" : "rgba(100,60,200,0.15)"}`,
                  color: active ? "#00b4ff" : "#6b7a94",
                  fontFamily: "Space Grotesk, sans-serif",
                  boxShadow: active ? "0 0 12px rgba(0,180,255,0.12)" : "none",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleContinue}
          className="btn-3d w-full py-3.5 rounded-xl text-sm font-bold min-h-[48px]"
          style={{ fontFamily: "Space Grotesk, sans-serif" }}
          data-ocid="onboarding.step2_continue_button"
        >
          Continue →
        </button>
        <button
          type="button"
          onClick={() => {
            haptic("navigation");
            onBack();
          }}
          className="flex items-center justify-center gap-1.5 text-sm py-2 min-h-[44px] transition-smooth"
          style={{ color: "#6b7a94" }}
          data-ocid="onboarding.step2_back_button"
        >
          <ChevronLeft size={15} />
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 — Launch Timeline ─────────────────────────────────────────────────

function Step3({
  timeline,
  onTimelineChange,
  onContinue,
  onBack,
}: {
  timeline: LaunchTimeline;
  onTimelineChange: (t: LaunchTimeline) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const { playSelect } = useSoundFX();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1
          className="text-2xl font-bold leading-tight"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: "#f0f4f8" }}
        >
          When Is Your Launch?
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#8892a4" }}>
          This helps BY8 calibrate your visibility tracking strategy.
        </p>
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: role=group pattern used intentionally */}
      <div className="space-y-3" role="group" aria-label="Launch timeline">
        {TIMELINES.map((t) => {
          const active = timeline === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onTimelineChange(t.id);
                haptic("select");
                playSelect();
              }}
              data-ocid={`onboarding.timeline_${t.id.toLowerCase().replace(/[^a-z0-9]/g, "_")}_card`}
              className="w-full text-left p-4 rounded-xl transition-all duration-200 active:scale-[0.98]"
              style={{
                background: active
                  ? "rgba(0,180,255,0.07)"
                  : "rgba(13,17,23,0.85)",
                border: `2px solid ${active ? "rgba(0,180,255,0.45)" : "rgba(100,60,200,0.15)"}`,
                boxShadow: active ? "0 0 20px rgba(0,180,255,0.08)" : "none",
                transform: active ? "translateX(2px)" : "none",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: active
                      ? "rgba(0,180,255,0.15)"
                      : "rgba(100,60,200,0.08)",
                    color: active ? "#00b4ff" : "#6b7a94",
                    transition: "all 200ms ease",
                  }}
                >
                  {t.icon}
                </div>
                <p
                  className="flex-1 text-sm font-semibold"
                  style={{
                    color: active ? "#f0f4f8" : "#c0c8d8",
                    fontFamily: "Space Grotesk, sans-serif",
                    transition: "color 200ms ease",
                  }}
                >
                  {t.label}
                </p>
                {active && (
                  <CheckCircle
                    size={16}
                    className="flex-shrink-0"
                    style={{ color: "#00b4ff" }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            hapticChain("confirm", "success", 80);
            onContinue();
          }}
          className="btn-3d w-full py-3.5 rounded-xl text-sm font-bold min-h-[48px]"
          style={{ fontFamily: "Space Grotesk, sans-serif" }}
          data-ocid="onboarding.step3_continue_button"
        >
          Continue →
        </button>
        <button
          type="button"
          onClick={() => {
            haptic("navigation");
            onBack();
          }}
          className="flex items-center justify-center gap-1.5 text-sm py-2 min-h-[44px] transition-smooth"
          style={{ color: "#6b7a94" }}
          data-ocid="onboarding.step3_back_button"
        >
          <ChevronLeft size={15} />
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Step 4 — Review & Activate ───────────────────────────────────────────────

function Step4({
  ca,
  tokenMeta,
  visibilityEnabled,
  engagementEnabled,
  trackingWindow,
  timeline,
  onComplete,
  onBack,
}: {
  ca: string;
  tokenMeta: VerifiedTokenData | null;
  visibilityEnabled: boolean;
  engagementEnabled: boolean;
  trackingWindow: TrackingWindow;
  timeline: LaunchTimeline;
  onComplete: () => void;
  onBack: () => void;
}) {
  const { playSuccess } = useSoundFX();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPulse(true), 500);
    return () => clearTimeout(t);
  }, []);

  const handleActivate = () => {
    hapticChain("confirm", "success", 80);
    playSuccess();
    onComplete();
  };

  const tracking = [
    visibilityEnabled && "Visibility",
    engagementEnabled && "Engagement",
  ]
    .filter(Boolean)
    .join(" + ");

  const summaryRows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Contract Address", value: truncateAddr(ca), mono: true },
    {
      label: "Token",
      value: tokenMeta
        ? `${tokenMeta.name} ($${tokenMeta.symbol})`
        : `${ca.slice(0, 8)}…`,
    },
    {
      label: "Supply",
      value: tokenMeta
        ? formatSupply(tokenMeta.supply, tokenMeta.decimals)
        : "—",
      mono: true,
    },
    { label: "Tracking", value: tracking || "—" },
    { label: "Duration", value: trackingWindow },
    { label: "Launch", value: timeline },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1
          className="text-2xl font-bold leading-tight"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: "#f0f4f8" }}
        >
          You're All Set
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#8892a4" }}>
          Review your setup below and activate real-time launch tracking.
        </p>
      </div>

      {/* Verified badge */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          background: "rgba(0,255,135,0.05)",
          border: "1px solid rgba(0,255,135,0.2)",
        }}
      >
        <CheckCircle2 size={13} style={{ color: "#00ff87" }} />
        <span
          className="text-xs font-semibold"
          style={{ color: "#00ff87", fontFamily: "Space Grotesk, sans-serif" }}
        >
          On-Chain Verified — Real token data confirmed
        </span>
      </div>

      {/* Token header */}
      {tokenMeta && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            background: "rgba(0,180,255,0.04)",
            border: "1px solid rgba(0,180,255,0.15)",
          }}
        >
          <TokenLogo
            symbol={tokenMeta.symbol}
            imageUrl={tokenMeta.image ?? tokenMeta.imageUrl}
            size={44}
            ringColor="#00b4ff"
          />
          <div className="min-w-0">
            <p
              className="font-bold text-base truncate"
              style={{
                color: "#f0f4f8",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              {tokenMeta.name}
            </p>
            <p
              className="text-sm"
              style={{
                color: "#00b4ff",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              ${tokenMeta.symbol}
            </p>
          </div>
          <div
            className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-semibold"
            style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.28)",
              color: "#4ade80",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            Solana
          </div>
        </div>
      )}

      {/* Summary card */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          background: "rgba(13,17,23,0.9)",
          border: "1px solid rgba(100,60,200,0.18)",
        }}
        data-ocid="onboarding.summary_card"
      >
        {summaryRows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-4"
          >
            <span
              className="text-xs font-medium flex-shrink-0"
              style={{ color: "#6b7a94" }}
            >
              {row.label}
            </span>
            <span
              className="text-xs font-semibold text-right break-all"
              style={{
                color: "#c0c8d8",
                fontFamily: row.mono
                  ? "JetBrains Mono, monospace"
                  : "Space Grotesk, sans-serif",
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Safety notice */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{
          background: "rgba(0,255,135,0.03)",
          border: "1px solid rgba(0,255,135,0.12)",
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} style={{ color: "#00ff87" }} />
          <p
            className="text-xs font-semibold"
            style={{
              color: "#00ff87",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            Read-Only Analytics — Zero Risk
          </p>
        </div>
        <ul className="space-y-1">
          {[
            "BY8 does not request private keys or seed phrases",
            "All analytics are read-only — no wallet control",
            "No funds accessed, moved, or locked at any point",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle
                size={11}
                className="flex-shrink-0 mt-0.5"
                style={{ color: "#00ff87" }}
              />
              <span
                className="text-xs leading-relaxed"
                style={{ color: "#6b8a7a" }}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleActivate}
          className="btn-3d w-full py-4 rounded-xl text-sm font-bold min-h-[52px]"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            animation: pulse
              ? "neon-border-pulse 2s ease-in-out infinite"
              : "none",
          }}
          data-ocid="onboarding.activate_button"
        >
          Start Tracking Dashboard →
        </button>
        <button
          type="button"
          onClick={() => {
            haptic("navigation");
            onBack();
          }}
          className="flex items-center justify-center gap-1.5 text-sm py-2 min-h-[44px] transition-smooth"
          style={{ color: "#6b7a94" }}
          data-ocid="onboarding.step4_back_button"
        >
          <ChevronLeft size={15} />
          Back
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  useHaptics();
  const { actor, isFetching } = useActor(createActor);
  const store = useAppStore();

  // 0 = path choice, 1 = token CA, 2 = tracking prefs, 3 = timeline, 4 = review
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<PathChoice>(null);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Step 1 state
  const [ca, setCa] = useState("");
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>("idle");
  const [fetchStage, setFetchStage] = useState<FetchStage>("idle");
  const [tokenMeta, setTokenMeta] = useState<VerifiedTokenData | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Step 2 state
  const [visibilityEnabled, setVisibilityEnabled] = useState(true);
  const [engagementEnabled, setEngagementEnabled] = useState(true);
  const [trackingWindow, setTrackingWindow] = useState<TrackingWindow>("7d");

  // Step 3 state
  const [timeline, setTimeline] = useState<LaunchTimeline>("Already launched");

  const { playSuccess, playError } = useSoundFX();
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchingCaRef = useRef("");
  const actorRef = useRef(actor);
  const playSuccessRef = useRef(playSuccess);
  const playErrorRef = useRef(playError);
  actorRef.current = actor;
  playSuccessRef.current = playSuccess;
  playErrorRef.current = playError;

  // ── Load progress from sessionStorage on mount ──
  useEffect(() => {
    if (sessionStorage.getItem(SS_ONBOARDED_KEY)) return;
    try {
      const saved = sessionStorage.getItem(SS_PROGRESS_KEY);
      if (!saved) return;
      const p = JSON.parse(saved) as SavedProgress;
      if (p.step && p.step > 0) {
        setCa(p.ca ?? "");
        setVisibilityEnabled(p.visibilityEnabled ?? true);
        setEngagementEnabled(p.engagementEnabled ?? true);
        setTrackingWindow(p.trackingWindow ?? "7d");
        setTimeline(p.timeline ?? "Already launched");
        setStep(p.step);
        setPath("token"); // only CA path saves progress
        setShowWelcomeBack(true);
        haptic("success");
      }
    } catch {
      sessionStorage.removeItem(SS_PROGRESS_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save progress to sessionStorage ──
  useEffect(() => {
    if (step === 0 || path !== "token") return;
    try {
      const p: SavedProgress = {
        step,
        ca,
        visibilityEnabled,
        engagementEnabled,
        trackingWindow,
        timeline,
        communityLink: "",
      };
      sessionStorage.setItem(SS_PROGRESS_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }, [
    step,
    ca,
    visibilityEnabled,
    engagementEnabled,
    trackingWindow,
    timeline,
    path,
  ]);

  const handleStartFresh = () => {
    sessionStorage.removeItem(SS_PROGRESS_KEY);
    setCa("");
    setFetchStatus("idle");
    setFetchStage("idle");
    setTokenMeta(null);
    setFetchError("");
    setRetryCount(0);
    setVisibilityEnabled(true);
    setEngagementEnabled(true);
    setTrackingWindow("7d");
    setTimeline("Already launched");
    setStep(0);
    setPath(null);
    setShowWelcomeBack(false);
    haptic("navigation");
  };

  // ── Direct browser fallbacks ──
  async function tryDirectFetch(
    address: string,
  ): Promise<VerifiedTokenData | null> {
    try {
      setFetchStage("direct-jupiter");
      const r = await fetch(
        `https://lite-api.jup.ag/tokens/v1/token/${address}`,
      );
      if (r.ok) {
        const d = (await r.json()) as Record<string, unknown>;
        if (d.name && d.symbol) {
          return {
            ca: address,
            mint: address,
            name: String(d.name),
            symbol: String(d.symbol),
            decimals: typeof d.decimals === "number" ? d.decimals : 9,
            supply: BigInt(0),
            description:
              typeof d.description === "string" ? d.description : undefined,
            image: typeof d.logoURI === "string" ? d.logoURI : undefined,
            imageUrl: typeof d.logoURI === "string" ? d.logoURI : undefined,
            fetchedVia: "Jupiter (direct)",
          };
        }
      }
    } catch {
      /* fall through */
    }

    try {
      setFetchStage("direct-dexscreener");
      const r = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      );
      if (r.ok) {
        const d = (await r.json()) as {
          pairs?: Array<{
            baseToken?: { name?: string; symbol?: string };
            info?: { imageUrl?: string };
          }> | null;
        };
        const pair = d?.pairs?.[0];
        if (pair?.baseToken?.name && pair?.baseToken?.symbol) {
          return {
            ca: address,
            mint: address,
            name: pair.baseToken.name,
            symbol: pair.baseToken.symbol,
            decimals: 9,
            supply: BigInt(0),
            image: pair.info?.imageUrl,
            imageUrl: pair.info?.imageUrl,
            fetchedVia: "Dexscreener (direct)",
          };
        }
      }
    } catch {
      /* fall through */
    }

    return null;
  }

  async function tryRpcFetch(
    address: string,
  ): Promise<VerifiedTokenData | null> {
    try {
      setFetchStage("solana-rpc");
      const web3 = await import("@solana/web3.js");
      const conn = new web3.Connection(
        "https://api.mainnet-beta.solana.com",
        "confirmed",
      );
      let pubkey: InstanceType<typeof web3.PublicKey>;
      try {
        pubkey = new web3.PublicKey(address);
      } catch {
        return null;
      }
      const info = await conn.getParsedAccountInfo(pubkey);
      if (!info.value) return null;
      const data = info.value.data;
      if (
        typeof data === "object" &&
        "parsed" in data &&
        data.parsed &&
        typeof data.parsed === "object" &&
        "info" in data.parsed &&
        (data.parsed as { type?: string }).type === "mint"
      ) {
        const mintInfo = (
          data.parsed as { info: { decimals: number; supply: string } }
        ).info;
        const short = `${address.slice(0, 4)}...${address.slice(-4)}`;
        return {
          ca: address,
          mint: address,
          name: short,
          symbol: "UNKNOWN",
          decimals: mintInfo.decimals ?? 9,
          supply: BigInt(mintInfo.supply ?? "0"),
          fetchedVia: "Solana RPC",
        };
      }
      return {
        ca: address,
        mint: address,
        name: `${address.slice(0, 4)}...${address.slice(-4)}`,
        symbol: "UNKNOWN",
        decimals: 9,
        supply: BigInt(0),
        fetchedVia: "Solana RPC",
      };
    } catch {
      return null;
    }
  }

  // ── Core fetch ──
  const doFetchRef = useRef<
    ((address: string, attempt: number) => Promise<void>) | undefined
  >(undefined);
  doFetchRef.current = async (address: string, attempt: number) => {
    const currentActor = actorRef.current;
    fetchingCaRef.current = address;
    setFetchStatus("loading");
    setFetchStage("solscan");
    setTokenMeta(null);
    setFetchError("");

    if (currentActor) {
      try {
        haptic("tap");
        const t1 = setTimeout(() => setFetchStage("jupiter"), 3000);
        const t2 = setTimeout(() => setFetchStage("dexscreener"), 7000);
        const result = await currentActor.fetchTokenMetadata(address);
        clearTimeout(t1);
        clearTimeout(t2);
        if (fetchingCaRef.current !== address) return;
        if (result.__kind__ === "ok") {
          const meta: VerifiedTokenData = {
            ...result.ok,
            ca: address,
            image: result.ok.imageUrl,
            fetchedVia: "Solscan",
          };
          setTokenMeta(meta);
          setFetchStatus("success");
          setFetchStage("idle");
          setRetryCount(0);
          hapticChain("confirm", "success", 80);
          playSuccessRef.current();
          currentActor.notifyCaPasted(address).catch(() => {
            /* silent */
          });
          return;
        }
      } catch {
        /* fall through */
      }
    }

    if (fetchingCaRef.current !== address) return;

    const directResult = await tryDirectFetch(address);
    if (fetchingCaRef.current !== address) return;
    if (directResult) {
      setTokenMeta(directResult);
      setFetchStatus("success");
      setFetchStage("idle");
      setRetryCount(0);
      hapticChain("confirm", "success", 80);
      playSuccessRef.current();
      actorRef.current?.notifyCaPasted(address).catch(() => {
        /* silent */
      });
      return;
    }

    if (fetchingCaRef.current !== address) return;

    const rpcResult = await tryRpcFetch(address);
    if (fetchingCaRef.current !== address) return;
    if (rpcResult) {
      setTokenMeta(rpcResult);
      setFetchStatus("success");
      setFetchStage("idle");
      setRetryCount(0);
      hapticChain("confirm", "success", 80);
      playSuccessRef.current();
      actorRef.current?.notifyCaPasted(address).catch(() => {
        /* silent */
      });
      return;
    }

    if (attempt < 2) {
      setRetryCount(attempt);
      setFetchStage("solscan");
      retryTimeoutRef.current = setTimeout(() => {
        if (fetchingCaRef.current === address)
          doFetchRef.current?.(address, attempt + 1);
      }, 1500 * attempt);
    } else {
      setFetchError(
        "Token not found on Solscan, Jupiter, Dexscreener, or Solana RPC. Please verify the address is a valid Solana SPL token.",
      );
      setFetchStatus("error");
      setFetchStage("idle");
      setRetryCount(attempt);
      haptic("error");
      playErrorRef.current();
    }
  };

  const doFetch = useCallback((address: string, attempt: number) => {
    return doFetchRef.current?.(address, attempt) ?? Promise.resolve();
  }, []);

  // ── Debounced auto-fetch on CA change ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    const trimmed = ca.trim();
    if (!isValidSolanaCA(trimmed)) {
      setFetchStatus("idle");
      setFetchStage("idle");
      setTokenMeta(null);
      setFetchError("");
      fetchingCaRef.current = "";
      return;
    }
    if (!actor || isFetching) {
      setFetchStatus("idle");
      return;
    }
    const isLikelyPaste = trimmed.length >= 43;
    setFetchStatus("loading");
    setRetryCount(0);
    debounceRef.current = setTimeout(
      () => {
        doFetch(trimmed, 1);
      },
      isLikelyPaste ? 80 : 600,
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [ca, actor, isFetching, doFetch]);

  // ── Re-trigger when actor becomes ready ──
  const fetchStatusRef = useRef(fetchStatus);
  const tokenMetaCaRef = useRef(tokenMeta?.ca);
  fetchStatusRef.current = fetchStatus;
  tokenMetaCaRef.current = tokenMeta?.ca;
  useEffect(() => {
    if (!actor || isFetching) return;
    const trimmed = ca.trim();
    if (!isValidSolanaCA(trimmed)) return;
    if (
      fetchStatusRef.current === "success" &&
      tokenMetaCaRef.current === trimmed
    )
      return;
    if (fetchStatusRef.current === "loading") return;
    setRetryCount(0);
    doFetch(trimmed, 1);
  }, [actor, isFetching, ca, doFetch]);

  const handleRetry = useCallback(() => {
    const trimmed = ca.trim();
    if (!isValidSolanaCA(trimmed)) return;
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    setRetryCount(0);
    haptic("tap");
    doFetch(trimmed, 1);
  }, [ca, doFetch]);

  const handleCaChange = (v: string) => {
    setCa(v);
    setFetchStatus("idle");
    setFetchStage("idle");
    setTokenMeta(null);
    setFetchError("");
    setRetryCount(0);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  // ── Step navigation (no auto-advance) ──
  const navigate = (nextStep: number, dir: "forward" | "back") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 260);
  };

  const handleNext = () => navigate(step + 1, "forward");
  const handleBack = () => navigate(step - 1, "back");

  const handleChooseToken = () => {
    setPath("token");
    navigate(1, "forward");
  };
  const handleChooseCommunity = () => {
    setPath("community");
    navigate(-1, "forward");
  };

  const handleComplete = () => {
    const tokenData = {
      ca,
      name: tokenMeta?.name ?? ca.slice(0, 8),
      symbol: tokenMeta?.symbol ?? "???",
      supply: tokenMeta ? tokenMeta.supply.toString() : "0",
      decimals: tokenMeta?.decimals ?? 0,
      image: tokenMeta?.image ?? tokenMeta?.imageUrl,
      visibilityEnabled,
      engagementEnabled,
      trackingWindow,
      timeline,
      verifiedOnChain: true,
    };
    sessionStorage.removeItem(SS_PROGRESS_KEY);
    sessionStorage.setItem(SS_ONBOARDED_KEY, "true");
    sessionStorage.setItem(SS_TOKEN_KEY, JSON.stringify(tokenData));
    // Sync to store
    store.setOnboardingPath("token");
    store.setOnboardingCa(ca);
    if (tokenMeta) store.setOnboardingTokenMeta(tokenMeta);
    store.setOnboardingTimeline(timeline);
    store.setTrackingWindow(trackingWindow);
    router.navigate({ to: "/tool" });
  };

  // ── Inject keyframe styles once ──
  useEffect(() => {
    const id = "ob-slide-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes ob-slide-in-right { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
      @keyframes ob-slide-in-left  { from { opacity:0; transform:translateX(-40px); } to { opacity:1; transform:translateX(0); } }
      .ob-enter-forward { animation: ob-slide-in-right 260ms cubic-bezier(0.4,0,0.2,1) both; }
      .ob-enter-back    { animation: ob-slide-in-left  260ms cubic-bezier(0.4,0,0.2,1) both; }
      @keyframes token-card-pop { 0% { opacity:0; transform:scale(0.88) translateY(8px); } 60% { opacity:1; transform:scale(1.03) translateY(-2px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
      @keyframes token-ring-pulse { 0%,100% { opacity:0.25; transform:scale(1); } 50% { opacity:0.7; transform:scale(1.12); } }
    `;
    document.head.appendChild(style);
  }, []);

  const enterClass = !animating
    ? direction === "forward"
      ? "ob-enter-forward"
      : "ob-enter-back"
    : "";

  // Community path selected — render inline
  if (path === "community") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
        style={{ background: "#0a0e1a" }}
        data-ocid="onboarding.page"
      >
        <div className="w-full max-w-[480px] space-y-4">
          <div className="flex items-center justify-center gap-2 pb-1">
            <img
              src="/assets/logo.png"
              alt="BY8"
              className="h-7 w-auto object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 8px rgba(0,180,255,0.4)) drop-shadow(0 0 3px rgba(179,102,255,0.25))",
              }}
            />
            <span
              className="text-sm font-bold"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                color: "#f0f4f8",
              }}
            >
              BY8 Launch Tool
            </span>
          </div>
          <div
            className="rounded-2xl p-6 overflow-hidden"
            style={{
              background: "rgba(13,17,23,0.92)",
              border: "1px solid rgba(100,60,200,0.14)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div className="ob-enter-forward">
              <CommunityPath
                onBack={() => {
                  setPath(null);
                  setStep(0);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "#0a0e1a" }}
      data-ocid="onboarding.page"
    >
      <div className="w-full max-w-[480px] space-y-4">
        {/* Welcome-back banner */}
        <AnimatePresence>
          {showWelcomeBack && (
            <motion.div
              key="welcome-back"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: "rgba(0,255,135,0.06)",
                border: "1px solid rgba(0,255,135,0.22)",
              }}
              data-ocid="onboarding.welcome_back_banner"
            >
              <CheckCircle2
                size={14}
                style={{ color: "#00ff87", flexShrink: 0 }}
              />
              <p
                className="text-xs flex-1"
                style={{
                  color: "#6bba8a",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                <span style={{ color: "#00ff87", fontWeight: 600 }}>
                  Welcome back!
                </span>{" "}
                Continuing where you left off.
              </p>
              <button
                type="button"
                onClick={handleStartFresh}
                className="text-[10px] underline underline-offset-2 flex-shrink-0 min-h-[24px] px-1"
                style={{
                  color: "#4a7a5a",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
                data-ocid="onboarding.start_fresh_button"
              >
                Start fresh
              </button>
              <button
                type="button"
                onClick={() => setShowWelcomeBack(false)}
                aria-label="Dismiss welcome back banner"
                className="flex-shrink-0 min-h-[24px] min-w-[24px] flex items-center justify-center"
                style={{ color: "#4a5568" }}
                data-ocid="onboarding.welcome_banner_close_button"
              >
                <CheckCircle size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        {step === 0 ? (
          <div className="flex items-center justify-center gap-2 pb-1">
            <img
              src="/assets/logo.png"
              alt="BY8"
              className="h-7 w-auto object-contain"
              style={{
                filter:
                  "drop-shadow(0 0 8px rgba(0,180,255,0.4)) drop-shadow(0 0 3px rgba(179,102,255,0.25))",
              }}
            />
            <span
              className="text-sm font-bold tracking-tight"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                color: "#f0f4f8",
              }}
            >
              BY8 Launch Tool
            </span>
          </div>
        ) : (
          <ProgressBar step={step} />
        )}

        <div
          className="rounded-2xl p-6 overflow-hidden"
          style={{
            background: "rgba(13,17,23,0.92)",
            border: "1px solid rgba(100,60,200,0.14)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(100,60,200,0.04)",
          }}
        >
          <div key={step} className={enterClass}>
            {step === 0 && (
              <Step0
                onChooseToken={handleChooseToken}
                onChooseCommunity={handleChooseCommunity}
              />
            )}
            {step === 1 && (
              <Step1
                ca={ca}
                onCaChange={handleCaChange}
                fetchStatus={fetchStatus}
                fetchStage={fetchStage}
                tokenMeta={tokenMeta}
                fetchError={fetchError}
                retryCount={retryCount}
                onRetry={handleRetry}
                onContinue={handleNext}
                onBack={handleBack}
              />
            )}
            {step === 2 && (
              <Step2
                visibilityEnabled={visibilityEnabled}
                engagementEnabled={engagementEnabled}
                trackingWindow={trackingWindow}
                onToggleVisibility={() => setVisibilityEnabled((v) => !v)}
                onToggleEngagement={() => setEngagementEnabled((v) => !v)}
                onWindowChange={setTrackingWindow}
                onContinue={handleNext}
                onBack={handleBack}
              />
            )}
            {step === 3 && (
              <Step3
                timeline={timeline}
                onTimelineChange={setTimeline}
                onContinue={handleNext}
                onBack={handleBack}
              />
            )}
            {step === 4 && (
              <Step4
                ca={ca}
                tokenMeta={tokenMeta}
                visibilityEnabled={visibilityEnabled}
                engagementEnabled={engagementEnabled}
                trackingWindow={trackingWindow}
                timeline={timeline}
                onComplete={handleComplete}
                onBack={handleBack}
              />
            )}
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-2">
          {(step === 0 ? [0] : [1, 2, 3, 4, 5]).map((s) => (
            <div
              key={s}
              className="rounded-full transition-smooth"
              style={{
                width: s === step ? "20px" : "6px",
                height: "6px",
                background:
                  s === step
                    ? "linear-gradient(90deg,#00b4ff,#b366ff)"
                    : s < step
                      ? "rgba(0,180,255,0.35)"
                      : "rgba(100,60,200,0.15)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
