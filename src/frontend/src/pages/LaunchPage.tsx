import { createActor } from "@/backend";
import BottomNav from "@/components/BottomNav";
import { useActor } from "@caffeineai/core-infrastructure";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Disc3,
  MessageCircle,
  Rocket,
  Shield,
  Wallet,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

/* ── Types ─────────────────────────────────────────────── */

interface LaunchFormData {
  tokenName: string;
  symbol: string;
  supply: string;
  decimals: number;
  description: string;
  selectedChain: string;
  selectedPlatform: string;
  launchType: string;
  teamPct: string;
  liquidityPct: string;
  communityPct: string;
  marketingPct: string;
  cliffMonths: number;
  vestingMonths: number;
  paymentTxHash: string;
}

const CHAINS = [
  { id: "solana", label: "Solana", icon: "☉" },
  { id: "ethereum", label: "Ethereum", icon: "◈" },
  { id: "base", label: "Base", icon: "◉" },
  { id: "bsc", label: "BSC", icon: "◎" },
  { id: "polygon", label: "Polygon", icon: "⬡" },
  { id: "arbitrum", label: "Arbitrum", icon: "◆" },
  { id: "avalanche", label: "Avalanche", icon: "▲" },
] as const;

const PLATFORM_MAP: Record<string, string[]> = {
  solana: ["pump.fun", "Raydium"],
  ethereum: ["Uniswap", "1inch"],
  base: ["Uniswap", "Aerodrome"],
  bsc: ["PancakeSwap"],
  polygon: ["Quickswap"],
  arbitrum: ["Camelot"],
  avalanche: ["Trader Joe"],
};

const LAUNCH_TYPES = [
  { id: "fair", label: "Fair Launch", desc: "Open to everyone, no presale" },
  { id: "presale", label: "Presale", desc: "Early backers get allocation" },
  { id: "stealth", label: "Stealth", desc: "Quiet launch, organic growth" },
] as const;

const NATIVE_PRICES: Record<string, number> = {
  solana: 170,
  ethereum: 3500,
  base: 3500,
  bsc: 600,
  polygon: 0.8,
  arbitrum: 3500,
  avalanche: 35,
};

const PAYMENT_WALLET = "4VNDpgK6umWjRr3p4823b5bBUK65QR48e6igkXZ7Qmz8";
const DISCORD_URL = "https://discord.gg/DAAHMM4t";
const STORAGE_KEY = "by8_launch_draft";

const STEPS = [
  "Token Basics",
  "Network",
  "Tokenomics",
  "Fees",
  "Summary",
  "Payment",
  "Success",
];

/* ── Helpers ───────────────────────────────────────────── */

function loadDraft(): Partial<LaunchFormData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDraft(data: Partial<LaunchFormData>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function formatNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString();
}

/* ── Pie Chart SVG ─────────────────────────────────────── */

function PieChart({
  team,
  liquidity,
  community,
  marketing,
}: {
  team: number;
  liquidity: number;
  community: number;
  marketing: number;
}) {
  const total = team + liquidity + community + marketing || 1;
  const data = [
    { value: team, color: "#00c4ff" },
    { value: liquidity, color: "#b56fff" },
    { value: community, color: "#00ff87" },
    { value: marketing, color: "#fbbf24" },
  ];

  let cumulative = 0;
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  const paths = data.map((slice) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += slice.value;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = slice.value / total > 0.5 ? 1 : 0;

    return (
      <path
        key={slice.color}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={slice.color}
        opacity={0.85}
        stroke="rgba(8,13,22,0.9)"
        strokeWidth={2}
      />
    );
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Tokenomics chart"
    >
      {paths}
      <circle cx={cx} cy={cy} r={r * 0.45} fill="rgba(8,13,22,0.95)" />
    </svg>
  );
}

/* ── Step Indicator ──────────────────────────────────── */

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const active = num === step;
        const done = num < step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className="flex flex-col items-center gap-1"
              data-ocid={`launch.step_${num}`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200"
                style={{
                  background: done
                    ? "linear-gradient(135deg, #00c4ff, #b56fff)"
                    : active
                      ? "linear-gradient(135deg, #00c4ff, #0088cc)"
                      : "rgba(255,255,255,0.06)",
                  color: done || active ? "#080d16" : "rgba(136,146,164,0.5)",
                  boxShadow: active ? "0 0 16px rgba(0,196,255,0.3)" : "none",
                }}
              >
                {done ? <Check className="w-4 h-4" /> : num}
              </div>
              <span
                className="text-[9px] font-medium tracking-wide hidden sm:block"
                style={{
                  color: active
                    ? "#00c4ff"
                    : done
                      ? "rgba(0,196,255,0.7)"
                      : "rgba(136,146,164,0.35)",
                }}
              >
                {label}
              </span>
            </div>
            {num < STEPS.length && (
              <div
                className="w-6 h-[2px] rounded-full transition-colors duration-300"
                style={{
                  background: done
                    ? "linear-gradient(90deg, #00c4ff, #b56fff)"
                    : "rgba(255,255,255,0.06)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

export default function LaunchPage() {
  const navigate = useNavigate();
  const { actor } = useActor(createActor);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<LaunchFormData>(() => ({
    tokenName: "",
    symbol: "",
    supply: "",
    decimals: 9,
    description: "",
    selectedChain: "solana",
    selectedPlatform: "pump.fun",
    launchType: "fair",
    teamPct: "15",
    liquidityPct: "40",
    communityPct: "30",
    marketingPct: "15",
    cliffMonths: 0,
    vestingMonths: 12,
    paymentTxHash: "",
    ...loadDraft(),
  }));

  const update = useCallback(
    <K extends keyof LaunchFormData>(key: K, value: LaunchFormData[K]) => {
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        saveDraft(next);
        return next;
      });
    },
    [],
  );

  const totalPct = useMemo(() => {
    return (
      Number(form.teamPct || 0) +
      Number(form.liquidityPct || 0) +
      Number(form.communityPct || 0) +
      Number(form.marketingPct || 0)
    );
  }, [form.teamPct, form.liquidityPct, form.communityPct, form.marketingPct]);

  const feeEstimate = useMemo(() => {
    const baseFee = 0.5;
    const chainMult: Record<string, number> = {
      solana: 1,
      ethereum: 8,
      base: 6,
      bsc: 3,
      polygon: 1.5,
      arbitrum: 5,
      avalanche: 2,
    };
    const mult = chainMult[form.selectedChain] || 1;
    const native = baseFee * mult;
    const usd = native * (NATIVE_PRICES[form.selectedChain] || 170);
    return { native: native.toFixed(3), usd: usd.toFixed(2) };
  }, [form.selectedChain]);

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return (
          form.tokenName.trim().length >= 2 &&
          form.symbol.trim().length >= 1 &&
          Number(form.supply) > 0
        );
      case 2:
        return !!form.selectedChain && !!form.selectedPlatform;
      case 3:
        return totalPct === 100;
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return form.paymentTxHash.trim().length >= 20;
      default:
        return true;
    }
  }, [step, form, totalPct]);

  const handleNext = useCallback(() => {
    if (!canProceed) return;
    setError("");
    setStep((s) => Math.min(s + 1, 7));
  }, [canProceed]);

  const handleBack = useCallback(() => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const handleVerifyAndSubmit = useCallback(async () => {
    if (!actor) {
      setError("Backend not ready. Please wait a moment and retry.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const result = await actor.createLaunchRecord({
        tokenName: form.tokenName,
        symbol: form.symbol.toUpperCase(),
        supply: BigInt(form.supply),
        decimals: form.decimals,
        description: form.description,
        selectedChain: form.selectedChain,
        selectedPlatform: form.selectedPlatform,
        launchType: form.launchType,
        allocationBreakdown: {
          team: BigInt(form.teamPct),
          liquidity: BigInt(form.liquidityPct),
          community: BigInt(form.communityPct),
          marketing: BigInt(form.marketingPct),
          reserve: BigInt(0),
        },
        paymentTxHash: form.paymentTxHash,
        paymentWallet: PAYMENT_WALLET,
      });

      if (result.__kind__ === "ok") {
        localStorage.removeItem(STORAGE_KEY);
        setStep(7);
      } else {
        setError(result.err || "Submission failed. Please try again.");
      }
    } catch (_e) {
      setError("Network error. Please check your connection and retry.");
    } finally {
      setIsSubmitting(false);
    }
  }, [actor, form]);

  const copyWallet = useCallback(() => {
    navigator.clipboard.writeText(PAYMENT_WALLET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  /* ── Render Steps ────────────────────────────────────── */

  const renderStep1 = () => (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="token-name"
          className="block text-sm font-medium text-[rgba(136,146,164,0.8)] mb-2"
        >
          Token Name
        </label>
        <input
          id="token-name"
          type="text"
          value={form.tokenName}
          onChange={(e) => update("tokenName", e.target.value)}
          placeholder="e.g. MoonRocket"
          className="w-full px-4 py-3 rounded-xl input-neon-ultra text-sm"
          data-ocid="launch.token_name_input"
        />
      </div>
      <div>
        <label
          htmlFor="token-symbol"
          className="block text-sm font-medium text-[rgba(136,146,164,0.8)] mb-2"
        >
          Token Symbol
        </label>
        <input
          id="token-symbol"
          type="text"
          value={form.symbol}
          onChange={(e) => update("symbol", e.target.value.toUpperCase())}
          placeholder="e.g. MOON"
          className="w-full px-4 py-3 rounded-xl input-neon-ultra text-sm"
          data-ocid="launch.symbol_input"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="token-supply"
            className="block text-sm font-medium text-[rgba(136,146,164,0.8)] mb-2"
          >
            Total Supply
          </label>
          <input
            id="token-supply"
            type="number"
            value={form.supply}
            onChange={(e) => update("supply", e.target.value)}
            placeholder="1000000000"
            className="w-full px-4 py-3 rounded-xl input-neon-ultra text-sm"
            data-ocid="launch.supply_input"
          />
        </div>
        <div>
          <label
            htmlFor="token-decimals"
            className="block text-sm font-medium text-[rgba(136,146,164,0.8)] mb-2"
          >
            Decimals
          </label>
          <div className="relative">
            <select
              id="token-decimals"
              value={form.decimals}
              onChange={(e) => update("decimals", Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl input-neon-ultra text-sm appearance-none"
              data-ocid="launch.decimals_select"
            >
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={18}>18</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(136,146,164,0.5)] pointer-events-none" />
          </div>
        </div>
      </div>
      <div>
        <label
          htmlFor="token-description"
          className="block text-sm font-medium text-[rgba(136,146,164,0.8)] mb-2"
        >
          Description
        </label>
        <textarea
          id="token-description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Brief description of your token..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl input-neon-ultra text-sm resize-none"
          data-ocid="launch.description_input"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <fieldset className="border-0 p-0 m-0">
        <legend className="text-sm font-medium text-[rgba(136,146,164,0.8)] mb-3">
          Select Blockchain
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CHAINS.map((chain) => {
            const active = form.selectedChain === chain.id;
            return (
              <button
                key={chain.id}
                type="button"
                onClick={() => {
                  update("selectedChain", chain.id);
                  update("selectedPlatform", PLATFORM_MAP[chain.id][0]);
                }}
                className="glass-card-ultra rounded-xl p-3 flex flex-col items-center gap-2 transition-all duration-200"
                style={{
                  borderColor: active
                    ? "rgba(0,196,255,0.45)"
                    : "rgba(255,255,255,0.09)",
                  boxShadow: active ? "0 0 20px rgba(0,196,255,0.12)" : "none",
                }}
                data-ocid={`launch.chain_${chain.id}`}
              >
                <span className="text-xl">{chain.icon}</span>
                <span
                  className="text-xs font-semibold"
                  style={{
                    color: active ? "#00c4ff" : "rgba(136,146,164,0.7)",
                  }}
                >
                  {chain.label}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="border-0 p-0 m-0">
        <legend className="text-sm font-medium text-[rgba(136,146,164,0.8)] mb-3">
          Launch Platform
        </legend>
        <div className="flex flex-wrap gap-2">
          {(PLATFORM_MAP[form.selectedChain] || []).map((platform) => {
            const active = form.selectedPlatform === platform;
            return (
              <button
                key={platform}
                type="button"
                onClick={() => update("selectedPlatform", platform)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: active
                    ? "linear-gradient(135deg, rgba(0,196,255,0.15), rgba(181,111,255,0.1))"
                    : "rgba(255,255,255,0.04)",
                  border: active
                    ? "1px solid rgba(0,196,255,0.35)"
                    : "1px solid rgba(255,255,255,0.06)",
                  color: active ? "#00c4ff" : "rgba(136,146,164,0.6)",
                }}
                data-ocid={`launch.platform_${platform}`}
              >
                {platform}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="border-0 p-0 m-0">
        <legend className="text-sm font-medium text-[rgba(136,146,164,0.8)] mb-3">
          Launch Type
        </legend>
        <div className="space-y-3">
          {LAUNCH_TYPES.map((type) => {
            const active = form.launchType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => update("launchType", type.id)}
                className="w-full glass-card-ultra rounded-xl p-4 flex items-center gap-4 text-left transition-all duration-200"
                style={{
                  borderColor: active
                    ? "rgba(0,196,255,0.45)"
                    : "rgba(255,255,255,0.09)",
                  boxShadow: active ? "0 0 20px rgba(0,196,255,0.1)" : "none",
                }}
                data-ocid={`launch.type_${type.id}`}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{
                    borderColor: active ? "#00c4ff" : "rgba(255,255,255,0.2)",
                  }}
                >
                  {active && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00c4ff]" />
                  )}
                </div>
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: active ? "#00c4ff" : "#f0f4f8" }}
                  >
                    {type.label}
                  </div>
                  <div className="text-xs text-[rgba(136,146,164,0.5)]">
                    {type.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-center py-4">
        <PieChart
          team={Number(form.teamPct) || 0}
          liquidity={Number(form.liquidityPct) || 0}
          community={Number(form.communityPct) || 0}
          marketing={Number(form.marketingPct) || 0}
        />
      </div>

      <div className="space-y-4">
        {[
          { key: "teamPct" as const, label: "Team", color: "#00c4ff" },
          {
            key: "liquidityPct" as const,
            label: "Liquidity",
            color: "#b56fff",
          },
          {
            key: "communityPct" as const,
            label: "Community",
            color: "#00ff87",
          },
          {
            key: "marketingPct" as const,
            label: "Marketing",
            color: "#fbbf24",
          },
        ].map((item) => (
          <div key={item.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: item.color }}
                />
                {item.label}
              </span>
              <span className="text-sm font-mono text-[#00c4ff]">
                {form[item.key]}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={form[item.key]}
              onChange={(e) => update(item.key, e.target.value)}
              className="w-full accent-[#00c4ff]"
              data-ocid={`launch.${item.key}_slider`}
            />
          </div>
        ))}
      </div>

      <div
        className="text-center text-sm font-semibold py-2 rounded-lg"
        style={{
          background:
            totalPct === 100
              ? "rgba(0,255,135,0.08)"
              : "rgba(255,100,100,0.08)",
          color: totalPct === 100 ? "#00ff87" : "#ff6464",
        }}
      >
        Total: {totalPct}% {totalPct === 100 ? "✓" : "(must equal 100%)"}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="cliff-months"
            className="block text-sm font-medium text-[rgba(136,146,164,0.8)] mb-2"
          >
            Cliff (months)
          </label>
          <input
            id="cliff-months"
            type="number"
            min={0}
            max={24}
            value={form.cliffMonths}
            onChange={(e) => update("cliffMonths", Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl input-neon-ultra text-sm"
            data-ocid="launch.cliff_input"
          />
        </div>
        <div>
          <label
            htmlFor="vesting-months"
            className="block text-sm font-medium text-[rgba(136,146,164,0.8)] mb-2"
          >
            Vesting (months)
          </label>
          <input
            id="vesting-months"
            type="number"
            min={1}
            max={48}
            value={form.vestingMonths}
            onChange={(e) => update("vestingMonths", Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl input-neon-ultra text-sm"
            data-ocid="launch.vesting_input"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-5">
      <div className="glass-card-ultra rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-[#00c4ff]" />
          <span className="text-sm font-medium text-[rgba(136,146,164,0.8)]">
            Estimated Launch Fee
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gradient">
            {feeEstimate.native}
          </span>
          <span className="text-lg font-semibold text-[#00c4ff]">
            {form.selectedChain === "solana"
              ? "SOL"
              : form.selectedChain === "ethereum" ||
                  form.selectedChain === "base" ||
                  form.selectedChain === "arbitrum"
                ? "ETH"
                : form.selectedChain === "bsc"
                  ? "BNB"
                  : form.selectedChain === "polygon"
                    ? "MATIC"
                    : "AVAX"}
          </span>
        </div>
        <div className="text-sm text-[rgba(136,146,164,0.5)]">
          ≈ ${feeEstimate.usd} USD
        </div>
        <div className="h-px bg-[rgba(255,255,255,0.06)]" />
        <div className="space-y-2 text-xs text-[rgba(136,146,164,0.5)]">
          <div className="flex justify-between">
            <span>Platform fee</span>
            <span>Included</span>
          </div>
          <div className="flex justify-between">
            <span>Network gas</span>
            <span>Variable</span>
          </div>
          <div className="flex justify-between">
            <span>BY8 service</span>
            <span>Included</span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-[rgba(0,196,255,0.04)] border border-[rgba(0,196,255,0.1)]">
        <Shield className="w-4 h-4 text-[#00c4ff] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[rgba(136,146,164,0.6)] leading-relaxed">
          This is an estimate. Actual fees depend on network congestion at
          launch time. No funds are deducted until you confirm in Step 6.
        </p>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="glass-card-ultra rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#00c4ff] mb-3">
          Token Summary
        </h3>
        <SummaryRow label="Name" value={form.tokenName} />
        <SummaryRow label="Symbol" value={form.symbol.toUpperCase()} />
        <SummaryRow label="Supply" value={formatNumber(Number(form.supply))} />
        <SummaryRow label="Decimals" value={String(form.decimals)} />
        <SummaryRow label="Chain" value={form.selectedChain} />
        <SummaryRow label="Platform" value={form.selectedPlatform} />
        <SummaryRow
          label="Launch Type"
          value={LAUNCH_TYPES.find((t) => t.id === form.launchType)?.label}
        />
      </div>

      <div className="glass-card-ultra rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#b56fff]">Tokenomics</h3>
        <SummaryRow label="Team" value={`${form.teamPct}%`} />
        <SummaryRow label="Liquidity" value={`${form.liquidityPct}%`} />
        <SummaryRow label="Community" value={`${form.communityPct}%`} />
        <SummaryRow label="Marketing" value={`${form.marketingPct}%`} />
        <SummaryRow label="Cliff" value={`${form.cliffMonths} months`} />
        <SummaryRow label="Vesting" value={`${form.vestingMonths} months`} />
      </div>

      <div className="glass-card-ultra rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#fbbf24]">Fee</h3>
        <SummaryRow label="Estimated" value={`${feeEstimate.native} native`} />
        <SummaryRow label="USD Value" value={`~$${feeEstimate.usd}`} />
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-5">
      <div className="glass-card-ultra rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-[#00c4ff]" />
          <span className="text-sm font-semibold text-[#00c4ff]">
            Payment Wallet
          </span>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.06)]">
          <code className="text-xs font-mono text-[rgba(136,146,164,0.7)] flex-1 break-all">
            {PAYMENT_WALLET}
          </code>
          <button
            type="button"
            onClick={copyWallet}
            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors flex-shrink-0"
            data-ocid="launch.copy_wallet_button"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-[#00ff87]" />
            ) : (
              <Copy className="w-4 h-4 text-[rgba(136,146,164,0.6)]" />
            )}
          </button>
        </div>
        <p className="text-xs text-[rgba(136,146,164,0.5)] leading-relaxed">
          Send the estimated fee to the wallet above, then paste the transaction
          hash below to verify and complete your launch registration.
        </p>
      </div>

      <div>
        <label
          htmlFor="tx-hash"
          className="block text-sm font-medium text-[rgba(136,146,164,0.8)] mb-2"
        >
          Transaction Hash
        </label>
        <input
          id="tx-hash"
          type="text"
          value={form.paymentTxHash}
          onChange={(e) => update("paymentTxHash", e.target.value)}
          placeholder="Paste TX hash here..."
          className="w-full px-4 py-3 rounded-xl input-neon-ultra text-sm"
          data-ocid="launch.tx_hash_input"
        />
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[rgba(255,100,100,0.08)] border border-[rgba(255,100,100,0.2)] text-sm text-[#ff6464]">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleVerifyAndSubmit}
        disabled={isSubmitting || !canProceed}
        className="w-full py-4 rounded-xl btn-3d-ultra text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        data-ocid="launch.verify_button"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Disc3 className="w-4 h-4 animate-spin" />
            Verifying...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Verify & Submit Launch
          </span>
        )}
      </button>
    </div>
  );

  const renderStep7 = () => (
    <div className="text-center space-y-6 py-8">
      <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-[rgba(0,255,135,0.1)] border border-[rgba(0,255,135,0.25)]">
        <Rocket className="w-10 h-10 text-[#00ff87]" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gradient mb-2">
          Launch Submitted!
        </h2>
        <p className="text-sm text-[rgba(136,146,164,0.6)] max-w-xs mx-auto">
          Your token launch has been registered. Our team will review and
          activate tracking within 24 hours.
        </p>
      </div>
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 rounded-xl btn-3d-ultra text-sm font-bold flex items-center justify-center gap-2"
          data-ocid="launch.discord_button"
        >
          <MessageCircle className="w-4 h-4" />
          Join Discord Community
        </a>
        <button
          type="button"
          onClick={() => navigate({ to: "/tool" })}
          className="py-3 rounded-xl btn-3d-cyan text-sm font-bold flex items-center justify-center gap-2"
          data-ocid="launch.track_dashboard_button"
        >
          <BarChartIcon className="w-4 h-4" />
          Track Dashboard
        </button>
      </div>
    </div>
  );

  const stepContent = [
    renderStep1,
    renderStep2,
    renderStep3,
    renderStep4,
    renderStep5,
    renderStep6,
    renderStep7,
  ];

  return (
    <div className="min-h-screen bg-[#080d16] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[rgba(8,13,22,0.95)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              data-ocid="launch.back_button"
            >
              <ArrowLeft className="w-5 h-5 text-[rgba(136,146,164,0.6)]" />
            </button>
            <h1 className="text-lg font-bold text-gradient">Launch Token</h1>
            <div className="w-9" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-6">
        {step < 7 && <StepIndicator step={step} />}

        <div className="glass-card-ultra rounded-2xl p-5 sm:p-6 animate-card-entrance">
          {step < 7 && (
            <div className="mb-5">
              <h2 className="text-lg font-bold text-[#f0f4f8] mb-1">
                {STEPS[step - 1]}
              </h2>
              <p className="text-xs text-[rgba(136,146,164,0.5)]">
                Step {step} of {STEPS.length - 1}
              </p>
            </div>
          )}

          {stepContent[step - 1]()}

          {step < 7 && (
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-5 py-3 rounded-xl btn-3d-ghost text-sm font-bold flex items-center gap-2"
                  data-ocid="launch.back_step_button"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed}
                className="flex-1 py-3 rounded-xl btn-3d-ultra text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                data-ocid="launch.next_step_button"
              >
                {step === 6 ? "Review" : "Continue"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function SummaryRow({
  label,
  value,
}: { label: string; value?: string | number }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[rgba(136,146,164,0.5)]">{label}</span>
      <span className="text-sm font-medium text-[#f0f4f8]">{value || "—"}</span>
    </div>
  );
}

function BarChartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Bar chart"
    >
      <path d="M3 3v18h18" />
      <path d="M7 16v-3" />
      <path d="M11 16v-5" />
      <path d="M15 16v-7" />
      <path d="M19 16v-2" />
    </svg>
  );
}
