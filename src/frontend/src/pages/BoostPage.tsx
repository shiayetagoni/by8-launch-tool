import { createActor } from "@/backend";
import BoostProgress from "@/components/BoostProgress";
import BottomNav from "@/components/BottomNav";
import { LiveDataBadge, UsersOnlineBadge } from "@/components/LiveDataBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { haptic, hapticChain, primeHaptics } from "@/hooks/use-haptics";
import { usePreferences } from "@/hooks/use-preferences";
import { useSolanaPrice } from "@/hooks/use-solana-price";
import { useSoundFX } from "@/hooks/use-sound-fx";
import { isValidSolanaCA, useTokenLookup } from "@/hooks/use-token-lookup";
import { cn } from "@/lib/utils";
import { useActor } from "@caffeineai/core-infrastructure";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Flame,
  Loader2,
  Rocket,
  Share2,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const PAYMENT_WALLET = "4VNDpgK6umWjRr3p4823b5bBUK65QR48e6igkXZ7Qmz8";
const MIN_TX_LENGTH = 43;

// ─── Boost tiers (3 packages as specified) ─────────────────────────────────────

interface BoostTier {
  id: string;
  name: string;
  sol: number;
  tagline: string;
  features: string[];
  color: string;
  glow: string;
  icon: React.ReactNode;
  recommended?: boolean;
}

const BOOST_TIERS: BoostTier[] = [
  {
    id: "starter",
    name: "Starter",
    sol: 0.5,
    tagline: "Basic visibility boost",
    features: [
      "12h active visibility",
      "25+ trader impressions",
      "pump.fun entry placement",
      "Live tracking dashboard",
    ],
    color: "#8892a4",
    glow: "rgba(136,146,164,0.18)",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    id: "growth",
    name: "Growth",
    sol: 1.0,
    tagline: "Enhanced visibility + analytics priority",
    features: [
      "24h enhanced visibility",
      "80+ targeted impressions",
      "Analytics priority feed",
      "Trending placement",
      "Boost badge on token",
    ],
    color: "#00b4ff",
    glow: "rgba(0,180,255,0.22)",
    icon: <TrendingUp className="w-4 h-4" />,
    recommended: true,
  },
  {
    id: "pro",
    name: "Pro",
    sol: 2.0,
    tagline: "Premium placement + engagement boost",
    features: [
      "48h premium placement",
      "250+ high-intent impressions",
      "Top trending priority",
      "Full analytics suite",
      "Discord community blast",
      "Priority support",
    ],
    color: "#a855f7",
    glow: "rgba(168,85,247,0.22)",
    icon: <Rocket className="w-4 h-4" />,
  },
];

// ─── Step indicator ─────────────────────────────────────────────────────────────

const STEP_LABELS = ["Package", "Token", "Payment"];

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div
      className="flex items-center justify-center gap-0"
      aria-label={`Step ${step} of 3`}
    >
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: done
                    ? "#00ff87"
                    : active
                      ? "rgba(0,255,135,0.14)"
                      : "rgba(255,255,255,0.04)",
                  border: done
                    ? "none"
                    : active
                      ? "1.5px solid #00ff87"
                      : "1px solid rgba(255,255,255,0.09)",
                  color: done ? "#080b12" : active ? "#00ff87" : "#4a5568",
                  boxShadow: active ? "0 0 12px rgba(0,255,135,0.28)" : "none",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span
                className="text-[9px] font-semibold tracking-wide uppercase"
                style={{
                  color: active ? "#00ff87" : done ? "#8892a4" : "#4a5568",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className="w-12 sm:w-20 h-px mx-1 -mt-4 transition-all duration-300"
                style={{
                  background:
                    step > n
                      ? "rgba(0,255,135,0.45)"
                      : "rgba(255,255,255,0.07)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Package card ───────────────────────────────────────────────────────────────

function TierCard({
  tier,
  selected,
  onSelect,
  usd,
}: {
  tier: BoostTier;
  selected: boolean;
  onSelect: () => void;
  usd: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ y: 2, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      className="relative"
    >
      {tier.recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span
            className="text-[9px] font-bold px-2.5 py-0.5 rounded-full tracking-wider whitespace-nowrap"
            style={{
              background: "rgba(0,180,255,0.14)",
              border: "1px solid rgba(0,180,255,0.5)",
              color: "#00b4ff",
              boxShadow: "0 0 10px rgba(0,180,255,0.18)",
            }}
          >
            ✦ RECOMMENDED
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left"
        data-ocid={`package.${tier.id}_card`}
        aria-pressed={selected}
      >
        <Card
          className="overflow-hidden transition-all duration-100"
          style={{
            background: selected
              ? `linear-gradient(135deg, rgba(13,17,23,0.98), ${tier.glow.replace(/[\d.]+\)$/, "0.1)")})`
              : "linear-gradient(180deg, rgba(18,22,30,0.97) 0%, rgba(13,17,23,0.93) 100%)",
            border: selected
              ? `2px solid ${tier.color}`
              : tier.recommended
                ? "1px solid rgba(0,180,255,0.28)"
                : "1px solid rgba(0,255,135,0.08)",
            boxShadow: selected
              ? `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 28px ${tier.glow}, 0 6px 24px rgba(0,0,0,0.55)`
              : "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          {selected && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              animate={{ opacity: [0.03, 0.08, 0.03] }}
              transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
              style={{
                background: `radial-gradient(circle at 50% 0%, ${tier.color}, transparent 70%)`,
              }}
            />
          )}
          <CardContent className="p-4">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${tier.glow.replace(/[\d.]+\)$/, "0.14)")}`,
                    color: tier.color,
                    border: `1px solid ${tier.color}28`,
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.3)",
                  }}
                >
                  {tier.icon}
                </div>
                <div>
                  <p
                    className="font-bold text-sm"
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      color: selected ? tier.color : "#f0f4f8",
                    }}
                  >
                    {tier.name}
                  </p>
                  <p className="text-[10px]" style={{ color: "#4a5568" }}>
                    {tier.tagline}
                  </p>
                </div>
              </div>
              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                >
                  <CheckCircle2
                    className="w-5 h-5"
                    style={{ color: tier.color }}
                  />
                </motion.div>
              )}
            </div>

            {/* Price */}
            <div className="mb-3">
              <div className="flex items-baseline gap-1.5">
                <span
                  className="font-bold"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#f0f4f8",
                    fontSize: "28px",
                    lineHeight: 1,
                  }}
                >
                  {tier.sol}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#00ff87",
                  }}
                >
                  SOL
                </span>
                <span
                  className="text-xs ml-1"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#4a5568",
                  }}
                >
                  ≈ {usd}
                </span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-1.5 mb-4">
              {tier.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-1.5 text-[11px] leading-[1.3]"
                  style={{ color: "#8892a4" }}
                >
                  <Check
                    className="w-3 h-3 mt-0.5 flex-shrink-0"
                    style={{ color: tier.color }}
                  />
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div
              className="w-full py-2.5 rounded-lg text-xs font-bold tracking-wide text-center min-h-[40px] flex items-center justify-center"
              style={
                selected
                  ? {
                      background: `linear-gradient(180deg, ${tier.color}ee 0%, ${tier.color}bb 100%)`,
                      color: "#080b12",
                      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 0 rgba(0,0,0,0.2), 0 4px 12px ${tier.glow}, 0 1px 3px rgba(0,0,0,0.4)`,
                    }
                  : {
                      background: "transparent",
                      color: tier.color,
                      border: `1px solid ${tier.color}40`,
                      boxShadow: `inset 0 1px 0 ${tier.color}18, 0 1px 3px rgba(0,0,0,0.2)`,
                    }
              }
              data-ocid={`package.${tier.id}_select_button`}
            >
              {selected ? "✓ SELECTED" : "SELECT PACKAGE"}
            </div>
          </CardContent>
        </Card>
      </button>
    </motion.div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function BoostPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [caInput, setCaInput] = useState("");
  const [txHash, setTxHash] = useState("");
  const [txShake, setTxShake] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [confirmedTxHash, setConfirmedTxHash] = useState("");

  const { soundEnabled } = usePreferences();
  const { data: solPrice } = useSolanaPrice();
  const { playSound, unlockAudio } = useSoundFX({ soundEnabled });
  const { actor } = useActor(createActor);
  const {
    status: tokenStatus,
    tokenMeta,
    error: tokenError,
    trigger: lookupToken,
    reset: resetToken,
  } = useTokenLookup();

  const selectedTier = BOOST_TIERS.find((t) => t.id === selectedTierId);
  const isTxValid = txHash.trim().length >= MIN_TX_LENGTH;
  const caDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Telegram helpers ──────────────────────────────────────────────────────
  const tgPackage = useCallback(
    (name: string, sol: number) => {
      actor
        ?.notifyPackageSelected(name, String(sol))
        .catch((e: unknown) => console.error("[TG] package:", e));
    },
    [actor],
  );
  const tgCa = useCallback(
    (ca: string) => {
      actor
        ?.notifyCaPasted(ca)
        .catch((e: unknown) => console.error("[TG] ca:", e));
    },
    [actor],
  );
  const tgSubmit = useCallback(
    (mint: string, name: string, sol: number, hash: string) => {
      actor
        ?.notifyBoostSubmitted(mint, name, String(sol), hash)
        .catch((e: unknown) => console.error("[TG] submit:", e));
    },
    [actor],
  );

  // ── CA input handler ──────────────────────────────────────────────────────
  const handleCaChange = useCallback(
    (val: string) => {
      setCaInput(val);
      resetToken();
      haptic("tap");
      if (caDebounceRef.current) clearTimeout(caDebounceRef.current);
      const trimmed = val.trim();
      if (trimmed.length >= 32) {
        caDebounceRef.current = setTimeout(() => tgCa(trimmed), 1500);
      }
    },
    [resetToken, tgCa],
  );

  const handleFetchToken = useCallback(() => {
    const trimmed = caInput.trim();
    if (!isValidSolanaCA(trimmed)) return;
    haptic("tap");
    playSound("click");
    lookupToken(trimmed);
  }, [caInput, lookupToken, playSound]);

  const handlePasteCa = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleCaChange(text.trim());
      haptic("tap");
      playSound("click");
    } catch {}
  }, [handleCaChange, playSound]);

  const handlePasteTx = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTxHash(text.trim());
      haptic("tap");
      playSound("click");
    } catch {}
  }, [playSound]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToStep2 = useCallback(() => {
    if (!selectedTierId) return;
    unlockAudio();
    hapticChain("confirm", "success", 60);
    playSound("select");
    setStep(2);
  }, [selectedTierId, unlockAudio, playSound]);

  const goToStep3 = useCallback(() => {
    if (!caInput.trim()) return;
    unlockAudio();
    hapticChain("confirm", "success", 60);
    playSound("select");
    setStep(3);
  }, [caInput, unlockAudio, playSound]);

  const handleSelectTier = useCallback(
    (id: string) => {
      unlockAudio();
      playSound("select");
      hapticChain("select", "confirm", 50);
      setSelectedTierId(id);
      const tier = BOOST_TIERS.find((t) => t.id === id);
      if (tier) tgPackage(tier.name, tier.sol);
    },
    [unlockAudio, playSound, tgPackage],
  );

  const handleSubmit = useCallback(async () => {
    if (!isTxValid || !selectedTier || !caInput.trim()) return;
    unlockAudio();
    playSound("boost");
    hapticChain("confirm", "success", 80);
    const hash = txHash.trim();
    const mint = caInput.trim();
    setConfirmedTxHash(hash);
    setStep(4);
    if (actor) {
      actor
        .recordBoost(mint, selectedTier.sol, hash, BigInt(Date.now()))
        .catch((err: unknown) => console.error("[Boost] recordBoost:", err));
    }
    tgSubmit(mint, selectedTier.name, selectedTier.sol, hash);
  }, [
    isTxValid,
    selectedTier,
    caInput,
    unlockAudio,
    playSound,
    txHash,
    actor,
    tgSubmit,
  ]);

  const handleReset = useCallback(() => {
    unlockAudio();
    playSound("click");
    haptic("tap");
    setStep(1);
    setSelectedTierId(null);
    setCaInput("");
    setTxHash("");
    setConfirmedTxHash("");
    resetToken();
  }, [unlockAudio, playSound, resetToken]);

  const handleCopyWallet = useCallback(() => {
    unlockAudio();
    navigator.clipboard.writeText(PAYMENT_WALLET).then(() => {
      playSound("select");
      haptic("copy");
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2200);
      toast.success("Wallet address copied!");
    });
  }, [unlockAudio, playSound]);

  const handleCopyTx = useCallback(() => {
    navigator.clipboard.writeText(confirmedTxHash).then(() => {
      haptic("copy");
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2200);
    });
  }, [confirmedTxHash]);

  // Auto-fetch if CA is valid and user navigates back then re-enters
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs only on step change
  useEffect(() => {
    if (
      step === 2 &&
      isValidSolanaCA(caInput.trim()) &&
      tokenStatus === "idle"
    ) {
      lookupToken(caInput.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const usdFor = (sol: number) =>
    solPrice ? `$${(sol * solPrice).toFixed(0)}` : "—";

  const currentStepDots = step < 4 ? (step as 1 | 2 | 3) : 3;

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: "#080b12" }}
      onPointerDown={() => primeHaptics()}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% -10%, rgba(0,255,135,0.045) 0%, transparent 60%)",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          background: "rgba(8, 11, 18, 0.94)",
          borderBottom: "1px solid rgba(157, 95, 234, 0.18)",
          boxShadow:
            "0 1px 0 rgba(157,95,234,0.06), 0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.05 }}>
              <img
                src="/assets/logo.png"
                alt="BY8 Launch Tool"
                className="h-8 w-auto object-contain"
                style={{
                  filter:
                    "drop-shadow(0 0 8px rgba(100,60,200,0.5)) drop-shadow(0 0 3px rgba(0,180,255,0.2))",
                }}
              />
            </motion.div>
            <div className="flex flex-col">
              <span
                className="font-bold text-base leading-tight"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  letterSpacing: "-0.02em",
                }}
              >
                BY8 <span style={{ color: "#00b4ff" }}>Launch</span>
                <span style={{ color: "#b366ff" }}> Tool</span>
              </span>
              <span
                className="text-[10px] hidden sm:block"
                style={{
                  color: "#4a5568",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                Visibility Engine
              </span>
            </div>
          </div>
          <UsersOnlineBadge className="hidden sm:inline-flex" />
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">
          {step === 4 ? (
            /* ── Step 4: Success ────────────────────────────────────── */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -16 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              data-ocid="boost_success.section"
            >
              <Card
                style={{
                  background:
                    "linear-gradient(135deg, rgba(13,17,23,0.98), rgba(0,255,135,0.04))",
                  border: "1px solid rgba(0, 255, 135, 0.3)",
                  boxShadow:
                    "0 0 48px rgba(0,255,135,0.1), 0 0 80px rgba(0,255,135,0.04)",
                }}
                data-ocid="boost_success.card"
              >
                <CardContent className="p-6 sm:p-8 space-y-6 text-center">
                  {/* Animated check */}
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 18,
                      delay: 0.1,
                    }}
                    className="flex justify-center"
                  >
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center relative"
                      style={{
                        background: "rgba(0, 255, 135, 0.1)",
                        border: "2px solid rgba(0, 255, 135, 0.4)",
                        boxShadow:
                          "0 0 28px rgba(0,255,135,0.22), 0 0 60px rgba(0,255,135,0.06)",
                      }}
                    >
                      <CheckCircle2
                        className="w-10 h-10"
                        style={{
                          color: "#00ff87",
                          filter: "drop-shadow(0 0 8px #00ff87)",
                        }}
                      />
                      {[0.3, 0.5, 0.7].map((delay, i) => (
                        <motion.div
                          key={delay}
                          className="absolute inset-0 rounded-full"
                          animate={{
                            scale: [1, 1.6 + i * 0.4, 1.6 + i * 0.4],
                            opacity: [0.35, 0, 0],
                          }}
                          transition={{
                            duration: 1.6,
                            repeat: Number.POSITIVE_INFINITY,
                            delay,
                          }}
                          style={{
                            border: `1px solid rgba(0,255,135,${0.4 - i * 0.1})`,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>

                  <div>
                    <h2
                      className="text-2xl font-bold"
                      style={{
                        fontFamily: "Space Grotesk, sans-serif",
                        color: "#f0f4f8",
                      }}
                    >
                      Boost Activated! 🚀
                    </h2>
                    <p className="text-sm mt-1" style={{ color: "#8892a4" }}>
                      Your{" "}
                      <span style={{ color: selectedTier?.color }}>
                        {selectedTier?.name}
                      </span>{" "}
                      boost is live — visibility increasing now.
                    </p>
                  </div>

                  {/* Summary pills */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Package", value: selectedTier?.name ?? "—" },
                      {
                        label: "Amount",
                        value: `${selectedTier?.sol ?? "—"} SOL`,
                      },
                      { label: "Status", value: "Active" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="p-3 rounded-xl text-center"
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(0,255,135,0.1)",
                        }}
                      >
                        <p
                          className="text-[9px] uppercase tracking-widest mb-1"
                          style={{ color: "#4a5568" }}
                        >
                          {item.label}
                        </p>
                        <p
                          className="font-bold text-xs"
                          style={{
                            color:
                              item.label === "Amount"
                                ? "#00ff87"
                                : item.label === "Status"
                                  ? "#00b4ff"
                                  : "#f0f4f8",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* TX hash */}
                  {confirmedTxHash && (
                    <div
                      className="flex items-center gap-2 p-3 rounded-xl text-left"
                      style={{
                        background: "rgba(0,0,0,0.35)",
                        border: "1px solid rgba(0,255,135,0.08)",
                      }}
                    >
                      <span
                        className="flex-1 text-xs font-mono truncate"
                        style={{ color: "#8892a4" }}
                        data-ocid="boost_success.tx_hash"
                      >
                        {confirmedTxHash.slice(0, 10)}…
                        {confirmedTxHash.slice(-10)}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyTx}
                        className="p-1.5 rounded transition-all"
                        style={{ color: copiedTx ? "#00ff87" : "#4a5568" }}
                        aria-label="Copy TX hash"
                        data-ocid="boost_success.copy_tx_button"
                      >
                        {copiedTx ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <ClipboardCopy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <a
                        href={`https://solscan.io/tx/${confirmedTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded transition-all"
                        style={{ color: "#4a5568" }}
                        aria-label="View on Solscan"
                        data-ocid="boost_success.solscan_link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Trust + activation message */}
                  <div className="flex items-center justify-center gap-2">
                    <LiveDataBadge source="Solana" isLive />
                    <span className="text-[11px]" style={{ color: "#4a5568" }}>
                      Verified on-chain · activates in ~60s
                    </span>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <motion.a
                      href="/analytics"
                      whileHover={{ y: -2 }}
                      whileTap={{ y: 2, scale: 0.98 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className="flex-1 py-3 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 min-h-[48px]"
                      style={{
                        background:
                          "linear-gradient(180deg, #1aff9a 0%, #00e87a 45%, #00cc6a 100%)",
                        color: "#080b12",
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.2), 0 4px 18px rgba(0,255,135,0.45), 0 2px 6px rgba(0,0,0,0.5)",
                      }}
                      data-ocid="boost_success.view_analytics_button"
                    >
                      <TrendingUp className="w-4 h-4" />
                      View Analytics
                    </motion.a>
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ y: 2, scale: 0.98 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Shareable link copied!");
                      }}
                      className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 min-h-[48px]"
                      style={{
                        background: "rgba(0,180,255,0.1)",
                        border: "1px solid rgba(0,180,255,0.3)",
                        color: "#00b4ff",
                        boxShadow:
                          "inset 0 1px 0 rgba(0,180,255,0.12), 0 2px 8px rgba(0,0,0,0.3)",
                      }}
                      data-ocid="boost_success.share_button"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Boost
                    </motion.button>
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs transition-opacity hover:opacity-80"
                    style={{ color: "#4a5568" }}
                    data-ocid="boost_success.reset_button"
                  >
                    Boost another token →
                  </button>
                </CardContent>
              </Card>

              {/* Boost progress */}
              <div className="mt-5">
                <BoostProgress isVisible progressPct={25} activeStep="verify" />
              </div>
            </motion.div>
          ) : (
            /* ── Steps 1-3 ─────────────────────────────────────────── */
            <motion.div
              key="wizard"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="space-y-7"
            >
              {/* Hero */}
              <div className="text-center space-y-2 pt-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-semibold"
                  style={{
                    background: "rgba(0, 180, 255, 0.08)",
                    border: "1px solid rgba(0, 180, 255, 0.25)",
                    color: "#00b4ff",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: "#00b4ff",
                      boxShadow: "0 0 6px #00b4ff",
                      animation: "pulse-dot 1.8s ease-in-out infinite",
                    }}
                  />
                  Live Visibility Engine
                </motion.div>
                <h1
                  className="text-3xl sm:text-4xl font-bold tracking-tight"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    letterSpacing: "-0.03em",
                  }}
                >
                  <span className="text-gradient">Launch Smarter.</span> Get
                  Seen Faster.
                </h1>
                <p
                  className="text-sm max-w-md mx-auto"
                  style={{ color: "#8892a4" }}
                >
                  Select a visibility package and activate real-time launch
                  analytics for your token.
                </p>
              </div>

              {/* Step dots */}
              <StepDots step={currentStepDots} />

              {/* ── Step panel ── */}
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    data-ocid="boost.step1.section"
                  >
                    <StepHeader
                      n={1}
                      title="Select Your Package"
                      subtitle="Choose the power level for your token launch"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                      {BOOST_TIERS.map((tier) => (
                        <TierCard
                          key={tier.id}
                          tier={tier}
                          selected={selectedTierId === tier.id}
                          onSelect={() => handleSelectTier(tier.id)}
                          usd={usdFor(tier.sol)}
                        />
                      ))}
                    </div>

                    <div className="mt-6">
                      <ActionButton
                        label="Continue to Token Info →"
                        disabled={!selectedTierId}
                        onClick={goToStep2}
                        ocid="step1.next_button"
                      />
                      {!selectedTierId && (
                        <p
                          className="text-center text-[11px] mt-2"
                          style={{ color: "#4a5568" }}
                          data-ocid="step1.error_state"
                        >
                          Select a package to continue
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    data-ocid="boost.step2.section"
                  >
                    <StepHeader
                      n={2}
                      title="Enter Your Token"
                      subtitle="Paste your Solana contract address to auto-fetch token details"
                      onBack={() => {
                        haptic("tap");
                        setStep(1);
                      }}
                    />

                    <Card
                      className="mt-4"
                      style={{
                        background: "rgba(13, 17, 23, 0.95)",
                        border: "1px solid rgba(0,255,135,0.08)",
                      }}
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="ca-input"
                            className="text-xs font-medium"
                            style={{ color: "#8892a4" }}
                          >
                            Contract Address (CA)
                          </Label>
                          <div className="relative">
                            <input
                              id="ca-input"
                              type="text"
                              placeholder="Paste Solana token address…"
                              value={caInput}
                              onChange={(e) => handleCaChange(e.target.value)}
                              className="input-neon w-full h-11 rounded-lg px-3 pr-24 text-sm"
                              autoComplete="off"
                              spellCheck={false}
                              data-ocid="token.ca_input"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {caInput && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCaInput("");
                                    resetToken();
                                    haptic("tap");
                                  }}
                                  className="p-1 rounded"
                                  style={{ color: "#4a5568" }}
                                  aria-label="Clear"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handlePasteCa}
                                className="h-7 px-2 rounded-md text-[10px] font-semibold"
                                style={{
                                  background:
                                    "linear-gradient(180deg, rgba(0,255,135,0.14) 0%, rgba(0,255,135,0.07) 100%)",
                                  border: "1px solid rgba(0,255,135,0.28)",
                                  color: "#00ff87",
                                  fontFamily: "JetBrains Mono, monospace",
                                  boxShadow:
                                    "inset 0 1px 0 rgba(0,255,135,0.15), 0 1px 3px rgba(0,0,0,0.35)",
                                }}
                                data-ocid="token.paste_button"
                              >
                                PASTE
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Fetch button */}
                        <motion.button
                          type="button"
                          whileHover={
                            isValidSolanaCA(caInput.trim()) ? { y: -1 } : {}
                          }
                          whileTap={
                            isValidSolanaCA(caInput.trim())
                              ? { y: 1, scale: 0.98 }
                              : {}
                          }
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                          }}
                          onClick={handleFetchToken}
                          disabled={
                            !isValidSolanaCA(caInput.trim()) ||
                            tokenStatus === "loading"
                          }
                          className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 min-h-[44px] transition-all"
                          style={
                            isValidSolanaCA(caInput.trim())
                              ? {
                                  background:
                                    "linear-gradient(180deg, rgba(0,180,255,0.18) 0%, rgba(0,180,255,0.08) 100%)",
                                  border: "1px solid rgba(0,180,255,0.38)",
                                  color: "#00b4ff",
                                  boxShadow:
                                    "inset 0 1px 0 rgba(0,180,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.15), 0 3px 10px rgba(0,0,0,0.3)",
                                }
                              : {
                                  background: "rgba(13,17,23,0.5)",
                                  border: "1px solid rgba(255,255,255,0.05)",
                                  color: "#4a5568",
                                  cursor: "not-allowed",
                                }
                          }
                          data-ocid="token.fetch_button"
                        >
                          {tokenStatus === "loading" ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Fetching token data…
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              Fetch Token Info
                            </>
                          )}
                        </motion.button>

                        {/* Token preview */}
                        <AnimatePresence>
                          {tokenStatus === "success" && tokenMeta && (
                            <motion.div
                              key="token-preview"
                              initial={{ opacity: 0, y: 8, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.97 }}
                              transition={{ duration: 0.28 }}
                              className="flex items-center gap-3 p-3 rounded-xl"
                              style={{
                                background: "rgba(0,255,135,0.05)",
                                border: "1px solid rgba(0,255,135,0.18)",
                              }}
                              data-ocid="token.preview_card"
                            >
                              {tokenMeta.imageUrl ? (
                                <img
                                  src={tokenMeta.imageUrl}
                                  alt={tokenMeta.symbol}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                  style={{
                                    border: "1.5px solid rgba(0,255,135,0.3)",
                                    boxShadow: "0 0 12px rgba(0,255,135,0.2)",
                                  }}
                                />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                                  style={{
                                    background: "rgba(0,255,135,0.1)",
                                    border: "1.5px solid rgba(0,255,135,0.2)",
                                    color: "#00ff87",
                                    fontFamily: "JetBrains Mono, monospace",
                                  }}
                                >
                                  {tokenMeta.symbol?.slice(0, 2) ?? "TK"}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p
                                  className="font-bold text-sm truncate"
                                  style={{ color: "#f0f4f8" }}
                                >
                                  {tokenMeta.name}
                                </p>
                                <p
                                  className="text-xs"
                                  style={{
                                    color: "#00ff87",
                                    fontFamily: "JetBrains Mono, monospace",
                                  }}
                                >
                                  ${tokenMeta.symbol}
                                </p>
                              </div>
                              <CheckCircle2
                                className="w-5 h-5 flex-shrink-0"
                                style={{
                                  color: "#00ff87",
                                  filter: "drop-shadow(0 0 4px #00ff87)",
                                }}
                              />
                            </motion.div>
                          )}
                          {tokenStatus === "error" && (
                            <motion.div
                              key="token-error"
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-2 p-3 rounded-xl"
                              style={{
                                background: "rgba(255,77,109,0.06)",
                                border: "1px solid rgba(255,77,109,0.25)",
                              }}
                              data-ocid="token.error_state"
                            >
                              <X
                                className="w-4 h-4 flex-shrink-0"
                                style={{ color: "#ff4d6d" }}
                              />
                              <p
                                className="text-xs"
                                style={{ color: "#ff4d6d" }}
                              >
                                {tokenError ||
                                  "Token not found. Verify the CA is a valid Solana address."}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <p
                          className="text-[10px] text-center"
                          style={{
                            color: "#4a5568",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          Read-only lookup • No wallet access • No drains
                        </p>
                      </CardContent>
                    </Card>

                    <div className="mt-4">
                      <ActionButton
                        label="Continue to Payment →"
                        disabled={!caInput.trim()}
                        onClick={goToStep3}
                        ocid="step2.next_button"
                      />
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    data-ocid="boost.step3.section"
                  >
                    <StepHeader
                      n={3}
                      title="Complete Payment"
                      subtitle={`Send ${selectedTier?.sol ?? "—"} SOL to activate your boost`}
                      onBack={() => {
                        haptic("tap");
                        setStep(2);
                      }}
                    />

                    <Card
                      className="mt-4"
                      style={{
                        background: "rgba(13, 17, 23, 0.95)",
                        border: "1px solid rgba(0,255,135,0.08)",
                      }}
                    >
                      <CardContent className="p-5 space-y-5">
                        {/* Order summary row */}
                        <div
                          className="flex items-center justify-between p-3 rounded-xl"
                          style={{
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(0,255,135,0.1)",
                          }}
                        >
                          <div>
                            <p
                              className="text-[9px] uppercase tracking-widest mb-1"
                              style={{ color: "#4a5568" }}
                            >
                              Boosting
                            </p>
                            <p
                              className="text-xs font-mono truncate max-w-[140px]"
                              style={{ color: "#8892a4" }}
                            >
                              {tokenMeta?.symbol
                                ? `$${tokenMeta.symbol}`
                                : `${caInput.slice(0, 10)}…`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-[9px] uppercase tracking-widest mb-1"
                              style={{ color: "#4a5568" }}
                            >
                              Package
                            </p>
                            <p
                              className="font-bold text-sm"
                              style={{
                                color: selectedTier?.color,
                                fontFamily: "Space Grotesk, sans-serif",
                              }}
                            >
                              {selectedTier?.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className="text-[9px] uppercase tracking-widest mb-1"
                              style={{ color: "#4a5568" }}
                            >
                              Amount
                            </p>
                            <p
                              className="font-bold text-lg"
                              style={{
                                color: "#00ff87",
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                            >
                              {selectedTier?.sol} SOL
                            </p>
                            {solPrice && selectedTier && (
                              <p
                                className="text-[10px]"
                                style={{
                                  color: "#4a5568",
                                  fontFamily: "JetBrains Mono, monospace",
                                }}
                              >
                                ≈ {usdFor(selectedTier.sol)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Wallet address */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Wallet
                              className="w-3.5 h-3.5"
                              style={{ color: "#00ff87" }}
                            />
                            <Label
                              className="text-xs font-semibold"
                              style={{ color: "#f0f4f8" }}
                            >
                              Send exactly{" "}
                              <span
                                style={{
                                  color: "#00ff87",
                                  fontFamily: "JetBrains Mono, monospace",
                                }}
                              >
                                {selectedTier?.sol} SOL
                              </span>{" "}
                              to this wallet:
                            </Label>
                          </div>
                          <div
                            className="flex items-center gap-2 rounded-xl px-3 py-3"
                            style={{
                              background: "rgba(0,0,0,0.4)",
                              border: "1.5px solid rgba(0,255,135,0.18)",
                            }}
                          >
                            <span
                              className="text-xs flex-1 break-all select-all leading-relaxed"
                              style={{
                                fontFamily: "JetBrains Mono, monospace",
                                color: "#8892a4",
                              }}
                              data-ocid="payment.wallet_address"
                            >
                              {PAYMENT_WALLET}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyWallet}
                              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg transition-all"
                              style={{
                                color: copiedWallet ? "#00ff87" : "#4a5568",
                                background: "rgba(255,255,255,0.04)",
                              }}
                              aria-label="Copy wallet address"
                              data-ocid="payment.copy_wallet_button"
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
                                background: "rgba(0,255,135,0.08)",
                                border: "1px solid rgba(0,255,135,0.3)",
                                color: "#00ff87",
                                fontFamily: "JetBrains Mono, monospace",
                              }}
                              data-ocid="payment.verified_badge"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              VERIFIED WALLET
                            </div>
                            <span
                              className="text-[10px]"
                              style={{ color: "#4a5568" }}
                            >
                              Official boost wallet
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            height: "1px",
                            background: "rgba(0,255,135,0.07)",
                          }}
                        />

                        {/* TX hash input */}
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="tx-hash-input"
                            className="text-xs font-medium"
                            style={{ color: "#8892a4" }}
                          >
                            Transaction Hash{" "}
                            <span style={{ color: "#ff4d6d" }}>*</span>
                          </Label>
                          <div className="relative">
                            <input
                              id="tx-hash-input"
                              type="text"
                              placeholder="Paste TX hash after sending SOL…"
                              value={txHash}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTxHash(val);
                                haptic("tap");
                                if (val.length > 0 && val.length < 8) {
                                  setTxShake(true);
                                  setTimeout(() => setTxShake(false), 420);
                                }
                              }}
                              className={cn(
                                "input-neon w-full h-11 rounded-lg px-3 pr-20 text-sm",
                                txShake && "input-shake",
                              )}
                              autoComplete="off"
                              spellCheck={false}
                              style={
                                isTxValid
                                  ? { borderColor: "rgba(0,255,135,0.4)" }
                                  : undefined
                              }
                              data-ocid="payment.tx_hash_input"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {txHash && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTxHash("");
                                    haptic("tap");
                                  }}
                                  className="p-1 rounded"
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
                                    "linear-gradient(180deg, rgba(0,255,135,0.14) 0%, rgba(0,255,135,0.07) 100%)",
                                  border: "1px solid rgba(0,255,135,0.28)",
                                  color: "#00ff87",
                                  fontFamily: "JetBrains Mono, monospace",
                                  boxShadow:
                                    "inset 0 1px 0 rgba(0,255,135,0.15), 0 1px 3px rgba(0,0,0,0.35)",
                                }}
                                data-ocid="payment.paste_tx_button"
                              >
                                PASTE
                              </button>
                            </div>
                          </div>
                          <AnimatePresence mode="wait">
                            {txHash.length > 0 && !isTxValid ? (
                              <motion.p
                                key="tx-error"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-[10px]"
                                style={{ color: "#ff4d6d" }}
                                data-ocid="payment.tx_hash.field_error"
                              >
                                TX hash must be at least {MIN_TX_LENGTH} chars
                              </motion.p>
                            ) : isTxValid ? (
                              <motion.p
                                key="tx-valid"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-[10px] flex items-center gap-1"
                                style={{ color: "#00ff87" }}
                              >
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Transaction hash looks valid
                              </motion.p>
                            ) : null}
                          </AnimatePresence>
                        </div>

                        {/* Trust message */}
                        <div
                          className="flex items-center justify-center gap-1.5 py-2 rounded-lg"
                          style={{
                            background: "rgba(0,180,255,0.04)",
                            border: "1px solid rgba(0,180,255,0.1)",
                          }}
                        >
                          <span
                            className="text-[11px]"
                            style={{ color: "#4a5568" }}
                          >
                            🔒 Read-only • Your funds are never at risk.
                          </span>
                        </div>

                        {/* Submit */}
                        <motion.button
                          type="button"
                          whileHover={isTxValid ? { y: -2 } : {}}
                          whileTap={isTxValid ? { y: 2, scale: 0.99 } : {}}
                          transition={{
                            type: "spring",
                            stiffness: 600,
                            damping: 35,
                          }}
                          onClick={handleSubmit}
                          disabled={!isTxValid}
                          className="w-full py-4 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 relative overflow-hidden min-h-[54px]"
                          style={
                            isTxValid
                              ? {
                                  background:
                                    "linear-gradient(180deg, #1aff9a 0%, #00e87a 45%, #00cc6a 100%)",
                                  color: "#080b12",
                                  boxShadow:
                                    "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.2), 0 5px 20px rgba(0,255,135,0.5), 0 2px 6px rgba(0,0,0,0.5), 0 0 32px rgba(0,255,135,0.28)",
                                }
                              : {
                                  background: "rgba(13,17,23,0.8)",
                                  color: "#4a5568",
                                  border: "1px solid rgba(255,255,255,0.05)",
                                  cursor: "not-allowed",
                                }
                          }
                          data-ocid="payment.submit_button"
                        >
                          {isTxValid && (
                            <motion.div
                              className="absolute inset-0"
                              animate={{ x: ["-100%", "100%"] }}
                              transition={{
                                duration: 2.5,
                                repeat: Number.POSITIVE_INFINITY,
                                ease: "linear",
                              }}
                              style={{
                                background:
                                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                              }}
                            />
                          )}
                          <Zap className="w-4 h-4 relative z-10" />
                          <span className="relative z-10">
                            Verify &amp; Submit Boost
                          </span>
                        </motion.button>

                        {!isTxValid && txHash.length === 0 && (
                          <p
                            className="text-center text-[11px]"
                            style={{ color: "#4a5568" }}
                            data-ocid="payment.instructions_hint"
                          >
                            Send {selectedTier?.sol} SOL then paste your
                            transaction hash above
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
    </div>
  );
}

// ─── Reusable sub-components ────────────────────────────────────────────────────

function StepHeader({
  n,
  title,
  subtitle,
  onBack,
}: {
  n: number;
  title: string;
  subtitle: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      {onBack && (
        <motion.button
          type="button"
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          onClick={onBack}
          className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#8892a4",
          }}
          aria-label="Go back"
          data-ocid={`step${n}.back_button`}
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
      )}
      <div className="flex items-start gap-2.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
          style={{
            background: "rgba(0,255,135,0.14)",
            border: "1.5px solid rgba(0,255,135,0.4)",
            color: "#00ff87",
            fontFamily: "JetBrains Mono, monospace",
            boxShadow: "0 0 10px rgba(0,255,135,0.2)",
          }}
        >
          {n}
        </div>
        <div>
          <h2
            className="text-lg font-bold"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "#f0f4f8",
            }}
          >
            {title}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "#4a5568" }}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  ocid,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  ocid: string;
}) {
  return (
    <motion.button
      type="button"
      whileHover={!disabled ? { y: -2 } : {}}
      whileTap={!disabled ? { y: 2, scale: 0.99 } : {}}
      transition={{ type: "spring", stiffness: 600, damping: 35 }}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 relative overflow-hidden min-h-[52px]"
      style={
        !disabled
          ? {
              background:
                "linear-gradient(180deg, #1aff9a 0%, #00e87a 45%, #00cc6a 100%)",
              color: "#080b12",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(0,255,135,0.45), 0 2px 5px rgba(0,0,0,0.5), 0 0 28px rgba(0,255,135,0.22)",
            }
          : {
              background: "rgba(13,17,23,0.8)",
              color: "#4a5568",
              border: "1px solid rgba(255,255,255,0.05)",
              cursor: "not-allowed",
            }
      }
      data-ocid={ocid}
    >
      {!disabled && (
        <motion.div
          className="absolute inset-0"
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 2.8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
          }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </motion.button>
  );
}
