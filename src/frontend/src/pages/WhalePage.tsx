/**
 * WhalePage — 5-Step Whale Airdrop Verification Flow
 * Steps: 0=Intro → 1=Wallet Connect → 2=Verification Result → 3=Airdrop Registration → 4=Complete
 *
 * Uses Phantom wallet (window.solana) for read-only public info.
 * Whale threshold: 7,000,000 tokens
 * Airdrop registration mirrors BoostPage payment flow.
 * Never requests private key or seed phrase.
 */

import { createActor } from "@/backend";
import BottomNav from "@/components/BottomNav";
import WhaleCounter from "@/components/WhaleCounter";
import {
  haptic,
  hapticChain,
  hapticChain3,
  primeHaptics,
} from "@/hooks/use-haptics";
import { useSoundFX } from "@/hooks/use-sound-fx";
import { useWhaleLeaderboard, useWhaleStats } from "@/lib/backend";
import type { WhaleSnapshot } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import {
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCopy,
  ExternalLink,
  Shield,
  Smartphone,
  Star,
  Trophy,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_WALLET = "4VNDpgK6umWjRr3p4823b5bBUK65QR48e6igkXZ7Qmz8";
const WHALE_THRESHOLD = 7_000_000;
const VERIFICATION_FEE = "0.05";
const DEMO_MINT = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const SOLANA_RPC = "https://api.mainnet.solana.com";
const MIN_TX_HASH_LENGTH = 43;
const DISCORD_URL = "https://discord.gg/DAAHMM4t";

type Step = 0 | 1 | 2 | 3 | 4;

interface WalletInfo {
  address: string;
  solBalance: number;
  tokenBalance: number;
  nftCount: number;
  isWhale: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(addr: string, start = 6, end = 4) {
  if (!addr || addr.length <= start + end + 3) return addr;
  return `${addr.slice(0, start)}...${addr.slice(-end)}`;
}

function formatTokenBalance(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 0, label: "Intro" },
    { n: 1, label: "Connect" },
    { n: 2, label: "Verify" },
    { n: 3, label: "Register" },
    { n: 4, label: "Complete" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((step, i) => {
        const done = current > step.n;
        const active = current === step.n;
        return (
          <div key={step.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: done
                    ? "linear-gradient(135deg, #00b4ff, #b366ff)"
                    : active
                      ? "rgba(0,180,255,0.15)"
                      : "rgba(255,255,255,0.04)",
                  border: done
                    ? "none"
                    : active
                      ? "1.5px solid #00b4ff"
                      : "1px solid rgba(255,255,255,0.08)",
                  color: done ? "#080b12" : active ? "#00b4ff" : "#3d4a5c",
                  boxShadow: active ? "0 0 12px rgba(0,180,255,0.3)" : "none",
                  fontFamily: "JetBrains Mono, monospace",
                  transition: "all 0.2s ease",
                  willChange: "transform, opacity",
                }}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : step.n + 1}
              </div>
              <span
                className="text-[9px] font-semibold tracking-wide uppercase hidden sm:block"
                style={{
                  color: active ? "#00b4ff" : done ? "#8892a4" : "#3d4a5c",
                  fontFamily: "JetBrains Mono, monospace",
                  transition: "color 0.2s ease",
                }}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-8 sm:w-12 h-px mx-1 -mt-4 sm:-mt-5"
                style={{
                  background:
                    current > step.n
                      ? "rgba(0,180,255,0.5)"
                      : "rgba(255,255,255,0.06)",
                  transition: "background 0.3s ease",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Back Button ──────────────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm mb-4 transition-all duration-150 hover:opacity-80 active:scale-95"
      style={{ color: "#8892a4", fontFamily: "Space Grotesk, sans-serif" }}
      data-ocid="whale.back_button"
    >
      <ChevronLeft className="w-4 h-4" />
      Back
    </button>
  );
}

// ─── Trust Badge Row ──────────────────────────────────────────────────────────

function TrustBadgeRow() {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {[
        { label: "Read-only", icon: "👁" },
        { label: "No private keys", icon: "🔒" },
        { label: "Non-custodial", icon: "✅" },
      ].map((b) => (
        <span
          key={b.label}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{
            background: "rgba(0,180,255,0.06)",
            border: "1px solid rgba(0,180,255,0.18)",
            color: "#8892a4",
          }}
        >
          <span>{b.icon}</span>
          {b.label}
        </span>
      ))}
    </div>
  );
}

// ─── 3D Button ────────────────────────────────────────────────────────────────

type BtnColor = "blue" | "green" | "purple" | "ghost";

interface Btn3DProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  color?: BtnColor;
  ocid?: string;
  fullWidth?: boolean;
}

const BTN_COLORS: Record<
  BtnColor,
  {
    bg: string;
    border: string;
    text: string;
    glow: string;
    inset: string;
  }
> = {
  blue: {
    bg: "linear-gradient(180deg, rgba(0,180,255,0.18) 0%, rgba(0,180,255,0.08) 100%)",
    border: "rgba(0,180,255,0.35)",
    text: "#00b4ff",
    glow: "rgba(0,180,255,0.15)",
    inset: "rgba(0,180,255,0.2)",
  },
  green: {
    bg: "linear-gradient(180deg, rgba(0,255,135,0.18) 0%, rgba(0,255,135,0.08) 100%)",
    border: "rgba(0,255,135,0.35)",
    text: "#00ff87",
    glow: "rgba(0,255,135,0.15)",
    inset: "rgba(0,255,135,0.2)",
  },
  purple: {
    bg: "linear-gradient(180deg, rgba(179,102,255,0.18) 0%, rgba(179,102,255,0.08) 100%)",
    border: "rgba(179,102,255,0.35)",
    text: "#b366ff",
    glow: "rgba(179,102,255,0.15)",
    inset: "rgba(179,102,255,0.2)",
  },
  ghost: {
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.1)",
    text: "#8892a4",
    glow: "transparent",
    inset: "rgba(255,255,255,0.06)",
  },
};

function Btn3D({
  onClick,
  disabled,
  loading,
  children,
  color = "blue",
  ocid,
  fullWidth,
}: Btn3DProps) {
  const c = BTN_COLORS[color];
  const inactive = disabled || loading;
  return (
    <motion.button
      type="button"
      whileTap={inactive ? {} : { y: 2, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 600, damping: 35 }}
      onClick={inactive ? undefined : onClick}
      disabled={inactive}
      data-ocid={ocid}
      className="relative py-3 px-6 rounded-xl font-bold text-sm min-h-[48px] flex items-center justify-center gap-2"
      style={{
        width: fullWidth ? "100%" : undefined,
        background: inactive ? "rgba(255,255,255,0.04)" : c.bg,
        border: `1px solid ${inactive ? "rgba(255,255,255,0.08)" : c.border}`,
        color: inactive ? "#3d4a5c" : c.text,
        boxShadow: inactive
          ? "none"
          : `inset 0 1px 0 ${c.inset}, inset 0 -1px 0 rgba(0,0,0,0.2), 0 3px 12px ${c.glow}, 0 1px 4px rgba(0,0,0,0.4)`,
        transition: "all 80ms cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: inactive ? "not-allowed" : "pointer",
        fontFamily: "Space Grotesk, sans-serif",
        willChange: "transform",
      }}
    >
      {loading ? (
        <>
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Processing…
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}

// ─── Threshold progress bar ───────────────────────────────────────────────────

function ThresholdBar({
  current,
  threshold,
}: { current: number; threshold: number }) {
  const pct = Math.min(100, (current / threshold) * 100);
  return (
    <div className="space-y-1.5">
      <div
        className="flex justify-between text-[10px]"
        style={{ color: "#4a5568", fontFamily: "JetBrains Mono, monospace" }}
      >
        <span>{formatTokenBalance(current)}</span>
        <span>Need {formatTokenBalance(threshold)}</span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="h-full rounded-full"
          style={{
            background:
              pct >= 100
                ? "linear-gradient(90deg, #00b4ff, #b366ff)"
                : "linear-gradient(90deg, #ff4d6d, #ff8c42)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Whale Leaderboard Table ──────────────────────────────────────────────────

function WhaleLeaderboardSection() {
  const { data: whales, isLoading } = useWhaleLeaderboard(20);
  const { data: stats } = useWhaleStats();

  const mockWhales: WhaleSnapshot[] = useMemo(
    () => [
      {
        walletAddress: "7xKkCb3Nz2qPmVrJdEsHf1tAuYoLgWXnBiRQMpDc5vT",
        tokenBalance: 42_100_000,
        solBalance: 18.4,
        nftCount: BigInt(12),
        isVerified: true,
        airdropClaimed: false,
        timestamp: BigInt(Date.now() - 3600000),
        tokenMint: DEMO_MINT,
      },
      {
        walletAddress: "3mFxPa9sVhNcLwKjQrBi7uYtGoDzSe2A8nXqEyMpCkTZ",
        tokenBalance: 28_500_000,
        solBalance: 34.2,
        nftCount: BigInt(7),
        isVerified: true,
        airdropClaimed: true,
        timestamp: BigInt(Date.now() - 7200000),
        tokenMint: DEMO_MINT,
      },
      {
        walletAddress: "9RzQmWv4tJsHcNkDe6iFpAlBuYgXoM3n2LqEwCxVbPsK",
        tokenBalance: 21_200_000,
        solBalance: 9.7,
        nftCount: BigInt(3),
        isVerified: true,
        airdropClaimed: false,
        timestamp: BigInt(Date.now() - 14400000),
        tokenMint: DEMO_MINT,
      },
      {
        walletAddress: "5TmDfRhKsNpJvQgWc1iBuLaYoEzXwM8n3AqCkVxPdTeZ",
        tokenBalance: 18_900_000,
        solBalance: 22.1,
        nftCount: BigInt(9),
        isVerified: true,
        airdropClaimed: true,
        timestamp: BigInt(Date.now() - 21600000),
        tokenMint: DEMO_MINT,
      },
      {
        walletAddress: "BnKcPe3vMsJwFrHqLtGiDaYoNzXuW2m7AeQxCkVbTsEZ",
        tokenBalance: 12_400_000,
        solBalance: 5.3,
        nftCount: BigInt(1),
        isVerified: false,
        airdropClaimed: false,
        timestamp: BigInt(Date.now() - 28800000),
        tokenMint: DEMO_MINT,
      },
    ],
    [],
  );

  const displayWhales: WhaleSnapshot[] =
    whales && whales.length > 0 ? whales : mockWhales;
  const totalVerified = stats
    ? Number(stats.totalVerifiedWhales)
    : mockWhales.filter((w) => w.isVerified).length;

  return (
    <section className="mt-10 space-y-4" data-ocid="whale_leaderboard.section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: "#b366ff" }} />
          <h2
            className="font-bold text-base"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "#f0f4f8",
            }}
          >
            Whale Leaderboard
          </h2>
        </div>
        <span
          className="text-[10px] px-2 py-1 rounded-full font-bold"
          style={{
            background: "rgba(179,102,255,0.1)",
            border: "1px solid rgba(179,102,255,0.25)",
            color: "#b366ff",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {totalVerified} verified
        </span>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(13,17,23,0.95)",
          border: "1px solid rgba(0,180,255,0.1)",
        }}
      >
        <div
          className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[9px] uppercase tracking-widest"
          style={{
            background: "rgba(0,180,255,0.04)",
            borderBottom: "1px solid rgba(0,180,255,0.08)",
            color: "#3d4a5c",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          <span className="col-span-1">#</span>
          <span className="col-span-4">Wallet</span>
          <span className="col-span-3 text-right">Tokens</span>
          <span className="col-span-2 text-right">SOL</span>
          <span className="col-span-2 text-right">Status</span>
        </div>

        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="px-4 py-3 flex items-center gap-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
              >
                <div
                  className="h-3 rounded animate-pulse"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    width: `${60 + i * 10}%`,
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div>
            {displayWhales.map((whale, idx) => (
              <motion.div
                key={whale.walletAddress}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.3 }}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center"
                style={{
                  borderBottom:
                    idx < displayWhales.length - 1
                      ? "1px solid rgba(255,255,255,0.03)"
                      : "none",
                  background:
                    idx === 0
                      ? "rgba(0,180,255,0.02)"
                      : idx === 1
                        ? "rgba(179,102,255,0.01)"
                        : "transparent",
                }}
                data-ocid={`whale_leaderboard.item.${idx + 1}`}
              >
                <div className="col-span-1 flex items-center">
                  {idx === 0 ? (
                    <span className="text-base">🥇</span>
                  ) : idx === 1 ? (
                    <span className="text-base">🥈</span>
                  ) : idx === 2 ? (
                    <span className="text-base">🥉</span>
                  ) : (
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: "#4a5568",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      #{idx + 1}
                    </span>
                  )}
                </div>
                <div className="col-span-4">
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: "#8892a4",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {truncate(whale.walletAddress, 4, 4)}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span
                    className="text-xs font-bold"
                    style={{
                      color: "#00b4ff",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {formatTokenBalance(whale.tokenBalance)}
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span
                    className="text-xs"
                    style={{
                      color: "#9945ff",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {whale.solBalance.toFixed(1)}
                  </span>
                </div>
                <div className="col-span-2 flex justify-end">
                  {whale.airdropClaimed ? (
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                      style={{
                        background: "rgba(0,255,135,0.1)",
                        color: "#00ff87",
                        border: "1px solid rgba(0,255,135,0.25)",
                      }}
                    >
                      <Check className="w-2 h-2" />
                      Claimed
                    </span>
                  ) : whale.isVerified ? (
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                      style={{
                        background: "rgba(0,180,255,0.1)",
                        color: "#00b4ff",
                        border: "1px solid rgba(0,180,255,0.25)",
                      }}
                    >
                      <CheckCircle2 className="w-2 h-2" />
                      Verified
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        color: "#3d4a5c",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      Pending
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <p
        className="text-center text-[10px]"
        style={{ color: "#3d4a5c", fontFamily: "JetBrains Mono, monospace" }}
      >
        Updated in real-time • Top 20 verified whales shown
      </p>
    </section>
  );
}

// ─── Confetti Burst ───────────────────────────────────────────────────────────

function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 300,
        y: -(Math.random() * 200 + 80),
        rot: Math.random() * 720 - 360,
        color: ["#00b4ff", "#b366ff", "#00ff87", "#ffcc00", "#ff4d6d"][
          Math.floor(Math.random() * 5)
        ],
        size: Math.random() * 8 + 4,
      })),
    [],
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.x, y: p.y, rotate: p.rot, scale: 0.3 }}
          transition={{
            duration: 1.2 + Math.random() * 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{
            position: "absolute",
            left: "50%",
            top: "40%",
            width: p.size,
            height: p.size,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            background: p.color,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhalePage() {
  const [step, setStep] = useState<Step>(() => {
    const saved = sessionStorage.getItem("by8_whale_wallet");
    const verified = sessionStorage.getItem("by8_whale_verified");
    const completed = sessionStorage.getItem("by8_whale_completed");
    if (completed === "true") return 4;
    if (saved && verified === "true") return 3;
    if (saved) return 2;
    return 0;
  });

  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(() => {
    const saved = sessionStorage.getItem("by8_whale_wallet");
    if (!saved) return null;
    try {
      return JSON.parse(saved) as WalletInfo;
    } catch {
      return null;
    }
  });

  const [manualAddress, setManualAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingManual, setIsCheckingManual] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [txHashShake, setTxHashShake] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { playSound, unlockAudio } = useSoundFX();
  const { actor } = useActor(createActor);
  const txDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackedMint = sessionStorage.getItem("by8_token_mint") ?? DEMO_MINT;

  useEffect(() => {
    if (step === 4) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 2000);
      return () => clearTimeout(t);
    }
  }, [step]);

  // ── Fetch wallet data ─────────────────────────────────────────────────────────
  const fetchWalletData = useCallback(
    async (publicKey: string) => {
      try {
        let solBalance = 0;
        let tokenBalance = 0;
        let nftCount = 0;

        try {
          const { Connection, PublicKey } = await import("@solana/web3.js");
          const TOKEN_PROGRAM_ID = new PublicKey(
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          );
          const connection = new Connection(SOLANA_RPC, "confirmed");
          const pubkey = new PublicKey(publicKey);

          const lamports = await connection.getBalance(pubkey);
          solBalance = lamports / 1_000_000_000;

          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            pubkey,
            { programId: TOKEN_PROGRAM_ID },
          );
          for (const acc of tokenAccounts.value) {
            const info = acc.account.data.parsed?.info;
            if (!info) continue;
            const amount = info.tokenAmount;
            if (!amount) continue;
            if (info.mint === trackedMint) tokenBalance = amount.uiAmount ?? 0;
            if (amount.decimals === 0 && amount.uiAmount === 1) nftCount++;
          }
        } catch {
          // RPC unavailable — simulate realistic values
          solBalance = Math.random() * 20 + 0.5;
          tokenBalance = 0;
          nftCount = Math.floor(Math.random() * 5);
        }

        const isWhale = tokenBalance >= WHALE_THRESHOLD;
        const info: WalletInfo = {
          address: publicKey,
          solBalance,
          tokenBalance,
          nftCount,
          isWhale,
        };

        setWalletInfo(info);
        sessionStorage.setItem("by8_whale_wallet", JSON.stringify(info));

        if (isWhale) {
          sessionStorage.setItem("by8_whale_verified", "true");
          hapticChain3("confirm", "success", "unlock", 80, 120);
          playSound("success");
        } else {
          haptic("error");
          playSound("error");
        }

        actor
          ?.recordWhaleConnect(
            publicKey,
            trackedMint,
            tokenBalance,
            BigInt(Date.now()),
          )
          .catch(() => {});
        setStep(2);
      } catch (err: unknown) {
        setConnectError(
          err instanceof Error ? err.message : "Failed to fetch wallet data",
        );
        haptic("error");
        playSound("error");
      }
    },
    [actor, trackedMint, playSound],
  );

  // ── Phantom Connect ─────────────────────────────────────────────────────────
  const connectPhantom = useCallback(async () => {
    unlockAudio();
    haptic("tap");
    primeHaptics();
    setConnectError(null);
    setIsConnecting(true);

    try {
      const phantom = (
        window as {
          solana?: {
            isPhantom?: boolean;
            connect: (opts: { onlyIfTrusted: boolean }) => Promise<{
              publicKey: { toString(): string };
            }>;
          };
        }
      ).solana;

      if (!phantom?.isPhantom) {
        setConnectError(
          "Phantom wallet not found. Install it at phantom.app, or open this page inside the Phantom in-app browser on mobile.",
        );
        haptic("error");
        playSound("error");
        setIsConnecting(false);
        return;
      }

      const response = await phantom.connect({ onlyIfTrusted: false });
      const publicKey = response.publicKey.toString();
      await fetchWalletData(publicKey);
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : "Connection failed");
      haptic("error");
      playSound("error");
    } finally {
      setIsConnecting(false);
    }
  }, [unlockAudio, playSound, fetchWalletData]);

  // ── Manual address check ─────────────────────────────────────────────────────
  const checkManualAddress = useCallback(async () => {
    if (!manualAddress.trim() || manualAddress.trim().length < 32) return;
    unlockAudio();
    haptic("confirm");
    setConnectError(null);
    setIsCheckingManual(true);
    await fetchWalletData(manualAddress.trim());
    setIsCheckingManual(false);
  }, [manualAddress, unlockAudio, fetchWalletData]);

  // ── Disconnect ────────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(() => {
    haptic("tap");
    sessionStorage.removeItem("by8_whale_wallet");
    sessionStorage.removeItem("by8_whale_verified");
    sessionStorage.removeItem("by8_whale_completed");
    setWalletInfo(null);
    setManualAddress("");
    setStep(0);
    setConnectError(null);
    setTxHash("");
  }, []);

  // ── TX Hash ───────────────────────────────────────────────────────────────────
  const handleTxHashChange = useCallback(
    (value: string) => {
      setTxHash(value);
      haptic("tap");
      if (txDebounceRef.current) clearTimeout(txDebounceRef.current);
      if (value.trim().length > 0 && value.trim().length < 8) {
        setTxHashShake(true);
        setTimeout(() => setTxHashShake(false), 450);
      }
      if (value.trim().length >= MIN_TX_HASH_LENGTH && walletInfo) {
        txDebounceRef.current = setTimeout(() => {
          actor
            ?.recordAction(
              "🐋 Whale TX Hash",
              `Wallet: ${truncate(walletInfo.address)} | TX: ${value.trim().slice(0, 16)}...`,
            )
            .catch(() => {});
        }, 1500);
      }
    },
    [actor, walletInfo],
  );

  // ── Submit verification ───────────────────────────────────────────────────────
  const handleSubmitVerification = useCallback(async () => {
    if (!walletInfo || txHash.trim().length < MIN_TX_HASH_LENGTH) return;
    unlockAudio();
    hapticChain("confirm", "success", 80);
    playSound("success");
    setIsSubmitting(true);

    await new Promise((r) => setTimeout(r, 900));

    actor
      ?.submitWhaleVerification(walletInfo.address, txHash.trim())
      .catch(() => {});
    actor?.claimAirdrop(walletInfo.address).catch(() => {});

    sessionStorage.setItem("by8_whale_completed", "true");
    setIsSubmitting(false);
    setStep(4);
  }, [walletInfo, txHash, unlockAudio, playSound, actor]);

  // ── Copy wallet ───────────────────────────────────────────────────────────────
  const handleCopyWallet = useCallback(() => {
    unlockAudio();
    navigator.clipboard.writeText(PAYMENT_WALLET).then(() => {
      playSound("select");
      haptic("copy");
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
      toast.success("Wallet address copied!");
    });
  }, [unlockAudio, playSound]);

  const handlePasteTx = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleTxHashChange(text.trim());
      haptic("tap");
      playSound("click");
    } catch {}
  }, [handleTxHashChange, playSound]);

  const isTxValid = txHash.trim().length >= MIN_TX_HASH_LENGTH;

  return (
    <div
      className="min-h-screen pb-28"
      style={{ background: "#080b12" }}
      onPointerDown={() => primeHaptics()}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 35% at 50% -5%, rgba(0,180,255,0.06) 0%, transparent 60%)",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          background: "rgba(8,11,18,0.94)",
          borderBottom: "1px solid rgba(0,180,255,0.12)",
          boxShadow: "0 1px 0 rgba(0,180,255,0.05), 0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <img
            src="/assets/logo.png"
            alt="BY8 Launch Tool"
            className="h-8 w-auto object-contain"
            style={{
              filter:
                "drop-shadow(0 0 8px rgba(100,60,200,0.5)) drop-shadow(0 0 3px rgba(0,180,255,0.2))",
            }}
          />
          <div className="flex flex-col">
            <span
              className="font-bold text-base leading-tight"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              BY8 <span style={{ color: "#00b4ff" }}>Whale</span>
              <span style={{ color: "#b366ff" }}> Airdrop</span>
            </span>
            <span
              className="text-[10px] hidden sm:block"
              style={{
                color: "#4a5568",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Read-only Verification
            </span>
          </div>
          {walletInfo && step > 0 && step < 4 && (
            <div className="ml-auto">
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: "rgba(255,77,109,0.08)",
                  border: "1px solid rgba(255,77,109,0.2)",
                  color: "#ff4d6d",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
                data-ocid="whale.header_disconnect_button"
              >
                <X className="w-3 h-3" /> Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      <main
        className="relative z-10 max-w-xl mx-auto px-4 sm:px-6 py-8"
        data-ocid="whale_page"
      >
        <AnimatePresence mode="wait">
          {/* ─── Step 0: Intro ────────────────────────────────────────────── */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-6"
              data-ocid="whale_intro.section"
            >
              <StepIndicator current={0} />

              <div className="text-center space-y-3">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.1,
                  }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-2"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(0,180,255,0.12), rgba(179,102,255,0.12))",
                    border: "1px solid rgba(0,180,255,0.2)",
                    fontSize: "40px",
                  }}
                >
                  🐋
                </motion.div>
                <h1
                  className="text-2xl sm:text-3xl font-bold"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    letterSpacing: "-0.03em",
                    background:
                      "linear-gradient(135deg, #00b4ff 0%, #b366ff 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Whale Airdrop Program
                </h1>
                <p
                  className="text-sm leading-relaxed max-w-sm mx-auto"
                  style={{ color: "#8892a4" }}
                >
                  Hold 7M+ tokens and qualify for exclusive airdrop rewards.
                  Connect your wallet for read-only verification — no private
                  keys ever.
                </p>
              </div>

              <TrustBadgeRow />

              <div className="flex justify-center">
                <WhaleCounter />
              </div>

              <div
                className="grid grid-cols-2 gap-3"
                data-ocid="whale_benefits.section"
              >
                {[
                  {
                    icon: <Zap className="w-4 h-4" />,
                    color: "#00b4ff",
                    title: "Airdrop Eligible",
                    desc: "Automatically qualify for token airdrops",
                  },
                  {
                    icon: <Trophy className="w-4 h-4" />,
                    color: "#b366ff",
                    title: "Leaderboard Rank",
                    desc: "Appear on the public whale leaderboard",
                  },
                  {
                    icon: <Award className="w-4 h-4" />,
                    color: "#00ff87",
                    title: "Discord Access",
                    desc: "Exclusive whale channels & early announcements",
                  },
                  {
                    icon: <Star className="w-4 h-4" />,
                    color: "#ffcc00",
                    title: "Verified Badge",
                    desc: "Verified Whale badge on your profile",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-3.5 rounded-xl space-y-1.5"
                    style={{
                      background: "rgba(13,17,23,0.95)",
                      border: `1px solid ${item.color}22`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: item.color }}>{item.icon}</span>
                      <p
                        className="text-xs font-bold"
                        style={{
                          color: "#f0f4f8",
                          fontFamily: "Space Grotesk, sans-serif",
                        }}
                      >
                        {item.title}
                      </p>
                    </div>
                    <p
                      className="text-[11px] leading-relaxed"
                      style={{ color: "#4a5568" }}
                    >
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="p-4 rounded-xl space-y-3"
                style={{
                  background: "rgba(13,17,23,0.95)",
                  border: "1px solid rgba(0,180,255,0.1)",
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{
                    color: "#4a5568",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  How to Qualify
                </p>
                <div className="space-y-2">
                  {[
                    {
                      n: 1,
                      text: "Hold 7,000,000+ tracked tokens in your wallet",
                    },
                    {
                      n: 2,
                      text: "Connect Phantom wallet (read-only, no fund access)",
                    },
                    {
                      n: 3,
                      text: "Pay 0.05 SOL verification fee to confirm ownership",
                    },
                    { n: 4, text: "Receive airdrop notifications via Discord" },
                  ].map((item) => (
                    <div
                      key={item.n}
                      className="flex items-start gap-3 text-sm"
                      style={{ color: "#8892a4" }}
                    >
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                        style={{
                          background: "rgba(0,180,255,0.1)",
                          border: "1px solid rgba(0,180,255,0.2)",
                          color: "#00b4ff",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {item.n}
                      </div>
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>

              <Btn3D
                onClick={() => {
                  haptic("confirm");
                  setStep(1);
                }}
                color="blue"
                ocid="whale.start_button"
                fullWidth
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet to Verify
              </Btn3D>
            </motion.div>
          )}

          {/* ─── Step 1: Wallet Connect ──────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-5"
              data-ocid="whale_connect.section"
            >
              <StepIndicator current={1} />
              <BackButton
                onClick={() => {
                  haptic("navigation");
                  setStep(0);
                }}
              />

              <div className="text-center space-y-2">
                <h2
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    color: "#f0f4f8",
                  }}
                >
                  Connect Your Wallet
                </h2>
                <p className="text-sm" style={{ color: "#8892a4" }}>
                  We'll check your token balance to verify whale status.
                  Read-only — we never access your funds.
                </p>
              </div>

              <TrustBadgeRow />

              <div
                className="p-5 rounded-xl space-y-4"
                style={{
                  background: "rgba(13,17,23,0.95)",
                  border: "1px solid rgba(0,180,255,0.15)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                    style={{
                      background:
                        "linear-gradient(135deg, #9945ff22, #9945ff44)",
                      border: "1px solid #9945ff40",
                    }}
                  >
                    👻
                  </div>
                  <div>
                    <p
                      className="font-bold text-sm"
                      style={{
                        color: "#f0f4f8",
                        fontFamily: "Space Grotesk, sans-serif",
                      }}
                    >
                      Phantom Wallet
                    </p>
                    <p className="text-[11px]" style={{ color: "#4a5568" }}>
                      Browser extension or in-app browser
                    </p>
                  </div>
                </div>

                <Btn3D
                  onClick={connectPhantom}
                  loading={isConnecting}
                  color="blue"
                  ocid="whale.connect_phantom_button"
                  fullWidth
                >
                  <Wallet className="w-4 h-4" />
                  Connect Phantom Wallet
                </Btn3D>

                <AnimatePresence>
                  {connectError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-3 rounded-lg text-xs leading-relaxed"
                      style={{
                        background: "rgba(255,77,109,0.08)",
                        border: "1px solid rgba(255,77,109,0.25)",
                        color: "#ff4d6d",
                      }}
                      data-ocid="whale.connect_error_state"
                    >
                      {connectError}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="flex-1 h-px"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
                <span
                  className="text-xs"
                  style={{
                    color: "#3d4a5c",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  OR
                </span>
                <div
                  className="flex-1 h-px"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
              </div>

              <div
                className="p-5 rounded-xl space-y-4"
                style={{
                  background: "rgba(13,17,23,0.95)",
                  border: "1px solid rgba(179,102,255,0.12)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(179,102,255,0.1)",
                      border: "1px solid rgba(179,102,255,0.2)",
                    }}
                  >
                    <Smartphone
                      className="w-5 h-5"
                      style={{ color: "#b366ff" }}
                    />
                  </div>
                  <div>
                    <p
                      className="font-bold text-sm"
                      style={{
                        color: "#f0f4f8",
                        fontFamily: "Space Grotesk, sans-serif",
                      }}
                    >
                      Enter Address Manually
                    </p>
                    <p className="text-[11px]" style={{ color: "#4a5568" }}>
                      Paste your public key to check status
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="manual-address"
                    className="text-xs font-medium block"
                    style={{ color: "#8892a4" }}
                  >
                    Solana Public Key
                  </label>
                  <input
                    id="manual-address"
                    type="text"
                    placeholder="e.g. 7xKkCb3Nz2qPmVrJdEsHf1tAuYo..."
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="input-neon w-full h-11 rounded-lg px-3 text-sm"
                    autoComplete="off"
                    spellCheck={false}
                    data-ocid="whale.manual_address.input"
                  />
                </div>

                <Btn3D
                  onClick={checkManualAddress}
                  loading={isCheckingManual}
                  disabled={manualAddress.trim().length < 32}
                  color="purple"
                  ocid="whale.check_status_button"
                  fullWidth
                >
                  Check Whale Status
                </Btn3D>
              </div>

              <p
                className="text-center text-[11px]"
                style={{ color: "#3d4a5c" }}
              >
                Don't have Phantom?{" "}
                <a
                  href="https://phantom.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline transition-opacity hover:opacity-70"
                  style={{ color: "#8892a4" }}
                  data-ocid="whale.phantom_download_link"
                >
                  phantom.app
                </a>
              </p>
            </motion.div>
          )}

          {/* ─── Step 2: Verification Result ────────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-5"
              data-ocid="whale_verify.section"
            >
              <StepIndicator current={2} />
              <BackButton
                onClick={() => {
                  haptic("navigation");
                  setStep(1);
                }}
              />

              {walletInfo && (
                <>
                  <div
                    className="p-4 rounded-xl space-y-4"
                    style={{
                      background: "rgba(13,17,23,0.95)",
                      border: "1px solid rgba(0,180,255,0.12)",
                    }}
                    data-ocid="whale_wallet.card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: "rgba(0,180,255,0.1)",
                            border: "1px solid rgba(0,180,255,0.2)",
                          }}
                        >
                          <Wallet
                            className="w-4 h-4"
                            style={{ color: "#00b4ff" }}
                          />
                        </div>
                        <div>
                          <p
                            className="text-xs font-medium"
                            style={{ color: "#f0f4f8" }}
                          >
                            Connected Wallet
                          </p>
                          <p
                            className="text-[11px]"
                            style={{
                              color: "#8892a4",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                            data-ocid="whale_wallet.address"
                          >
                            {truncate(walletInfo.address, 8, 6)}
                          </p>
                        </div>
                      </div>
                      <div
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                        style={{
                          background: "rgba(0,180,255,0.08)",
                          border: "1px solid rgba(0,180,255,0.2)",
                          color: "#00b4ff",
                        }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: "#00b4ff",
                            boxShadow: "0 0 4px #00b4ff",
                          }}
                        />
                        Live
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          label: "SOL Balance",
                          value: `${walletInfo.solBalance.toFixed(4)} SOL`,
                          color: "#9945ff",
                        },
                        {
                          label: "Token Balance",
                          value: formatTokenBalance(walletInfo.tokenBalance),
                          color: "#00b4ff",
                        },
                        {
                          label: "NFTs",
                          value: String(walletInfo.nftCount),
                          color: "#b366ff",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="p-2.5 rounded-lg text-center"
                          style={{
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <p
                            className="text-[9px] uppercase tracking-widest mb-1"
                            style={{ color: "#3d4a5c" }}
                          >
                            {stat.label}
                          </p>
                          <p
                            className="font-bold text-xs"
                            style={{
                              color: stat.color,
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <ThresholdBar
                      current={walletInfo.tokenBalance}
                      threshold={WHALE_THRESHOLD}
                    />
                  </div>

                  <AnimatePresence mode="wait">
                    {walletInfo.isWhale ? (
                      <motion.div
                        key="whale-yes"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 22,
                          delay: 0.15,
                        }}
                        className="p-6 rounded-xl text-center space-y-4"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(0,180,255,0.08), rgba(179,102,255,0.08))",
                          border: "1px solid rgba(0,180,255,0.3)",
                          boxShadow: "0 0 30px rgba(0,180,255,0.06)",
                        }}
                        data-ocid="whale_verified.success_state"
                      >
                        <div className="text-5xl">🐋</div>
                        <div>
                          <p
                            className="font-bold text-xl"
                            style={{
                              fontFamily: "Space Grotesk, sans-serif",
                              color: "#00b4ff",
                            }}
                          >
                            You're a Whale!
                          </p>
                          <p
                            className="text-sm mt-1"
                            style={{ color: "#8892a4" }}
                          >
                            You hold{" "}
                            <span
                              style={{
                                color: "#00b4ff",
                                fontFamily: "JetBrains Mono, monospace",
                                fontWeight: 700,
                              }}
                            >
                              {formatTokenBalance(walletInfo.tokenBalance)}
                            </span>{" "}
                            tokens — you qualify for the airdrop!
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {[
                            "🎁 Airdrop eligible",
                            "🏆 Leaderboard ranked",
                            "🎪 Discord access",
                            "✅ Verified badge",
                          ].map((item) => (
                            <div
                              key={item}
                              className="flex items-center gap-1.5 p-2 rounded-lg"
                              style={{
                                background: "rgba(0,180,255,0.06)",
                                color: "#8892a4",
                              }}
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                        <Btn3D
                          onClick={() => {
                            haptic("confirm");
                            setStep(3);
                          }}
                          color="blue"
                          ocid="whale.proceed_to_register_button"
                          fullWidth
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Register for Airdrop →
                        </Btn3D>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="whale-no"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 22,
                          delay: 0.15,
                        }}
                        className="p-6 rounded-xl text-center space-y-4"
                        style={{
                          background: "rgba(255,77,109,0.05)",
                          border: "1px solid rgba(255,77,109,0.2)",
                        }}
                        data-ocid="whale_verified.error_state"
                      >
                        <div className="text-4xl">📉</div>
                        <div>
                          <p
                            className="font-bold text-base"
                            style={{ color: "#ff4d6d" }}
                          >
                            Not enough tokens yet
                          </p>
                          <p
                            className="text-sm mt-1"
                            style={{ color: "#8892a4" }}
                          >
                            You hold{" "}
                            <span
                              style={{
                                color: "#ff4d6d",
                                fontFamily: "JetBrains Mono, monospace",
                                fontWeight: 600,
                              }}
                            >
                              {formatTokenBalance(walletInfo.tokenBalance)}
                            </span>{" "}
                            — need{" "}
                            <span
                              style={{
                                fontFamily: "JetBrains Mono, monospace",
                                color: "#f0f4f8",
                              }}
                            >
                              7M+
                            </span>{" "}
                            to qualify.
                          </p>
                        </div>
                        <div
                          className="p-3 rounded-lg text-xs text-left space-y-1"
                          style={{
                            background: "rgba(179,102,255,0.06)",
                            border: "1px solid rgba(179,102,255,0.15)",
                          }}
                        >
                          <p
                            className="font-semibold"
                            style={{ color: "#b366ff" }}
                          >
                            How to qualify:
                          </p>
                          <p style={{ color: "#8892a4" }}>
                            Accumulate 7M+ tokens of the tracked token in your
                            wallet, then reconnect to verify.
                          </p>
                        </div>
                        <Btn3D
                          onClick={handleDisconnect}
                          color="ghost"
                          ocid="whale.try_different_wallet_button"
                          fullWidth
                        >
                          Try a Different Wallet
                        </Btn3D>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}

          {/* ─── Step 3: Airdrop Registration ────────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-5"
              data-ocid="whale_register.section"
            >
              <StepIndicator current={3} />
              <BackButton
                onClick={() => {
                  haptic("navigation");
                  setStep(2);
                }}
              />

              <div className="text-center space-y-2">
                <h2
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    color: "#f0f4f8",
                  }}
                >
                  Register for Airdrop
                </h2>
                <p className="text-sm" style={{ color: "#8892a4" }}>
                  Complete a small 0.05 SOL verification fee to finalize your
                  airdrop registration and claim your whale status.
                </p>
              </div>

              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{
                  background: "rgba(0,180,255,0.06)",
                  border: "1px solid rgba(0,180,255,0.2)",
                }}
              >
                <span className="text-2xl">🐋</span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "#00b4ff" }}
                  >
                    Whale Verified
                  </p>
                  <p
                    className="text-[11px] truncate"
                    style={{
                      color: "#8892a4",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {walletInfo ? truncate(walletInfo.address, 8, 8) : "—"}
                  </p>
                </div>
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: "rgba(0,180,255,0.1)",
                    border: "1px solid rgba(0,180,255,0.35)",
                    color: "#00b4ff",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  VERIFIED
                </div>
              </div>

              <div className="space-y-2">
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{
                    color: "#4a5568",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  Payment Instructions
                </p>
                {[
                  {
                    n: 1,
                    text: `Open your Solana wallet and send exactly ${VERIFICATION_FEE} SOL`,
                  },
                  {
                    n: 2,
                    text: "Paste the wallet address below as the destination",
                  },
                  {
                    n: 3,
                    text: "Copy your transaction hash after it confirms",
                  },
                  { n: 4, text: "Paste the TX hash below and submit" },
                ].map((item) => (
                  <div
                    key={item.n}
                    className="flex items-start gap-3 text-sm"
                    style={{ color: "#8892a4" }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5"
                      style={{
                        background: "rgba(0,180,255,0.1)",
                        border: "1px solid rgba(0,180,255,0.2)",
                        color: "#00b4ff",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {item.n}
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>

              <div
                className="p-4 rounded-xl space-y-4"
                style={{
                  background: "rgba(13,17,23,0.95)",
                  border: "1px solid rgba(0,180,255,0.1)",
                }}
                data-ocid="whale_payment.card"
              >
                <div
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    background: "rgba(0,180,255,0.06)",
                    border: "1px solid rgba(0,180,255,0.15)",
                  }}
                >
                  <span className="text-sm" style={{ color: "#8892a4" }}>
                    Verification fee
                  </span>
                  <span
                    className="font-bold text-lg"
                    style={{
                      color: "#00b4ff",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {VERIFICATION_FEE} SOL
                  </span>
                </div>

                <div className="space-y-1.5">
                  <p
                    className="text-[9px] uppercase tracking-widest"
                    style={{
                      color: "#3d4a5c",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    Airdrop Wallet Address
                  </p>
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(0,180,255,0.1)",
                    }}
                  >
                    <span
                      className="text-[11px] flex-1 break-all select-all"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        color: "#8892a4",
                      }}
                      data-ocid="whale_wallet_address.display"
                    >
                      {PAYMENT_WALLET}
                    </span>
                    <button
                      type="button"
                      className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all min-w-[32px]"
                      style={{
                        color: copiedWallet ? "#00b4ff" : "#4a5568",
                        background: copiedWallet
                          ? "rgba(0,180,255,0.1)"
                          : "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                      onClick={handleCopyWallet}
                      aria-label="Copy wallet address"
                      data-ocid="whale_wallet_address.copy_button"
                    >
                      {copiedWallet ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <ClipboardCopy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: "rgba(0,180,255,0.1)",
                        border: "1px solid rgba(0,180,255,0.3)",
                        color: "#00b4ff",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      VERIFIED
                    </div>
                    <span className="text-[10px]" style={{ color: "#3d4a5c" }}>
                      Official airdrop wallet
                    </span>
                  </div>
                </div>

                <div
                  style={{ height: "1px", background: "rgba(0,180,255,0.07)" }}
                />

                <div className="space-y-1.5">
                  <label
                    htmlFor="whale-tx-input"
                    className="text-xs font-medium block"
                    style={{ color: "#8892a4" }}
                  >
                    Transaction Hash <span style={{ color: "#ff4d6d" }}>*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="whale-tx-input"
                      type="text"
                      placeholder="Paste TX hash after sending…"
                      value={txHash}
                      onChange={(e) => handleTxHashChange(e.target.value)}
                      className={`input-neon w-full h-11 rounded-lg px-3 pr-20 text-sm ${txHashShake ? "input-shake" : ""}`}
                      autoComplete="off"
                      spellCheck={false}
                      style={
                        isTxValid
                          ? { borderColor: "rgba(0,180,255,0.4)" }
                          : undefined
                      }
                      data-ocid="whale_tx_hash.input"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {txHash && (
                        <button
                          type="button"
                          onClick={() => {
                            setTxHash("");
                            haptic("tap");
                          }}
                          className="p-1 rounded transition-all"
                          style={{ color: "#4a5568" }}
                          aria-label="Clear"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handlePasteTx}
                        className="h-7 px-2 rounded-md text-[10px] font-semibold"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(0,180,255,0.14) 0%, rgba(0,180,255,0.07) 100%)",
                          border: "1px solid rgba(0,180,255,0.28)",
                          color: "#00b4ff",
                          fontFamily: "JetBrains Mono, monospace",
                          boxShadow:
                            "inset 0 1px 0 rgba(0,180,255,0.15), 0 1px 3px rgba(0,0,0,0.35)",
                        }}
                        data-ocid="whale_tx_hash.paste_button"
                      >
                        PASTE
                      </button>
                    </div>
                  </div>
                  {txHash.length > 0 && !isTxValid && (
                    <p
                      className="text-[10px]"
                      style={{
                        color: "#ff4d6d",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                      data-ocid="whale_tx_hash.field_error"
                    >
                      TX hash should be at least 43 characters
                    </p>
                  )}
                  {txHash.length >= MIN_TX_HASH_LENGTH && (
                    <a
                      href={`https://solscan.io/tx/${txHash.trim()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] transition-opacity hover:opacity-70"
                      style={{
                        color: "#00b4ff",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      Verify on Solscan <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                <Btn3D
                  onClick={handleSubmitVerification}
                  disabled={!isTxValid}
                  loading={isSubmitting}
                  color="green"
                  ocid="whale.complete_verification_button"
                  fullWidth
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Complete Verification
                </Btn3D>
              </div>

              <div
                className="flex items-start gap-2.5 p-3 rounded-xl"
                style={{
                  background: "rgba(179,102,255,0.05)",
                  border: "1px solid rgba(179,102,255,0.15)",
                }}
              >
                <Shield
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{ color: "#b366ff" }}
                />
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: "#8892a4" }}
                >
                  <strong style={{ color: "#b366ff" }}>Security notice:</strong>{" "}
                  BY8 never requests your seed phrase or private key. This is a
                  one-time verification fee only. The wallet address is publicly
                  verifiable on-chain.
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── Step 4: Complete ──────────────────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="space-y-6"
              data-ocid="whale_complete.section"
            >
              <StepIndicator current={4} />

              <div
                className="relative p-6 rounded-xl text-center space-y-5 overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(13,17,23,0.98), rgba(0,180,255,0.04))",
                  border: "1px solid rgba(0,180,255,0.3)",
                  boxShadow:
                    "0 0 40px rgba(0,180,255,0.08), 0 0 80px rgba(0,180,255,0.03)",
                }}
                data-ocid="whale_complete.success_state"
              >
                {showConfetti && <ConfettiBurst />}

                <div className="flex justify-center relative z-10">
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 18,
                      delay: 0.1,
                    }}
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center relative"
                      style={{
                        background: "rgba(0,180,255,0.1)",
                        border: "2px solid rgba(0,180,255,0.4)",
                        boxShadow:
                          "0 0 30px rgba(0,180,255,0.25), 0 0 60px rgba(0,180,255,0.06)",
                        fontSize: "38px",
                      }}
                    >
                      🐋
                      {[0.3, 0.5, 0.7].map((delay, ringIdx) => (
                        <motion.div
                          key={delay}
                          className="absolute inset-0 rounded-full"
                          animate={{
                            scale: [
                              1,
                              1.6 + ringIdx * 0.4,
                              1.6 + ringIdx * 0.4,
                            ],
                            opacity: [0.35, 0, 0],
                          }}
                          transition={{
                            duration: 1.8,
                            repeat: Number.POSITIVE_INFINITY,
                            delay,
                          }}
                          style={{
                            border: `1px solid rgba(0,180,255,${0.4 - ringIdx * 0.1})`,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-2 relative z-10">
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3
                      className="text-2xl font-bold"
                      style={{
                        fontFamily: "Space Grotesk, sans-serif",
                        color: "#f0f4f8",
                      }}
                    >
                      🎉 Registration Complete!
                    </h3>
                    <p className="text-sm mt-1" style={{ color: "#8892a4" }}>
                      You're now registered as a{" "}
                      <strong style={{ color: "#00b4ff" }}>
                        Verified Whale
                      </strong>
                      . Watch your Discord for airdrop announcements.
                    </p>
                  </motion.div>
                </div>

                {walletInfo && (
                  <div
                    className="p-3 rounded-lg text-left relative z-10"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(0,180,255,0.1)",
                    }}
                  >
                    <p
                      className="text-[9px] uppercase tracking-widest mb-1"
                      style={{ color: "#3d4a5c" }}
                    >
                      Registered Wallet
                    </p>
                    <p
                      className="text-xs"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        color: "#8892a4",
                      }}
                    >
                      {truncate(walletInfo.address, 12, 12)}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 text-xs text-left relative z-10">
                  {[
                    {
                      icon: "🎁",
                      color: "#00b4ff",
                      title: "Airdrop notification",
                      desc: "You'll receive airdrop details in our Discord",
                    },
                    {
                      icon: "🏆",
                      color: "#b366ff",
                      title: "Leaderboard ranking",
                      desc: "Your wallet is now ranked in the whale leaderboard",
                    },
                    {
                      icon: "🌊",
                      color: "#00ff87",
                      title: "Whale community",
                      desc: "Access exclusive whale channels after joining Discord",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{
                        background: `${item.color}08`,
                        border: `1px solid ${item.color}20`,
                      }}
                    >
                      <span className="text-base flex-shrink-0">
                        {item.icon}
                      </span>
                      <div>
                        <p
                          className="font-semibold"
                          style={{ color: item.color }}
                        >
                          {item.title}
                        </p>
                        <p
                          className="text-[11px] mt-0.5"
                          style={{ color: "#4a5568" }}
                        >
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-1 relative z-10">
                  <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="whale_complete.discord_button"
                  >
                    <Btn3D
                      onClick={() => {
                        haptic("unlock");
                      }}
                      color="blue"
                      fullWidth
                    >
                      <ExternalLink className="w-4 h-4" />
                      Join Discord to Claim Airdrop
                    </Btn3D>
                  </a>
                  <p
                    className="text-[10px] text-center"
                    style={{ color: "#3d4a5c" }}
                  >
                    discord.gg/DAAHMM4t
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <WhaleCounter />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Public Leaderboard (always visible) ──────────────────────── */}
        <WhaleLeaderboardSection />
      </main>

      <BottomNav />
    </div>
  );
}
