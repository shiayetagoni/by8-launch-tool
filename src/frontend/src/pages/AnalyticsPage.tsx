import { createActor } from "@/backend";
import type { WhaleSnapshot } from "@/backend.d";
import BottomNav from "@/components/BottomNav";
import { TokenLogo, readTokenData } from "@/components/TokenHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useHaptics } from "@/hooks/use-haptics";
import {
  useDriftingCounter,
  useIncrementingCounter,
} from "@/hooks/use-live-counter";
import { usePreferences } from "@/hooks/use-preferences";
import { useSoundFX } from "@/hooks/use-sound-fx";
import { useAppStore } from "@/store/app-store";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Flame,
  Link2,
  RefreshCw,
  Share2,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrackingWindow = "24h" | "7d" | "30d";
type ActivityType = "positive" | "neutral" | "warning";
type LaunchStageId = "seed" | "early" | "growth" | "momentum";

interface ActivityEntry {
  id: number;
  text: string;
  type: ActivityType;
  ts: Date;
}

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  thresholdKey: string;
  color: string;
  glow: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_POOL: { text: string; type: ActivityType }[] = [
  { text: "New engagement signal detected", type: "positive" },
  { text: "Token added to discovery feed", type: "positive" },
  { text: "Visibility spike +8%", type: "positive" },
  { text: "Engagement +7% in last 10 min", type: "positive" },
  { text: "Discovery placement increased", type: "positive" },
  { text: "Organic traction signal logged", type: "positive" },
  { text: "Active view count increasing", type: "positive" },
  { text: "Launch momentum building", type: "positive" },
  { text: "Signal strength: high", type: "positive" },
  { text: "Visibility score climbing", type: "positive" },
  { text: "Low activity window detected — monitoring", type: "neutral" },
  { text: "Baseline recalibrating...", type: "neutral" },
  { text: "Visibility plateau — stable at current level", type: "neutral" },
  { text: "Signal stable — no significant change", type: "neutral" },
  { text: "Analytics engine running checks", type: "neutral" },
  { text: "Tracking window refreshed", type: "neutral" },
  { text: "Anomaly signal detected: unusual pattern", type: "warning" },
  { text: "Engagement dip: -4% vs previous hour", type: "warning" },
  { text: "Recovery signal detected after low period", type: "warning" },
  { text: "Visibility dip: -3% — under review", type: "warning" },
  { text: "Reduced engagement window — tracking", type: "warning" },
  { text: "Below-average signal period", type: "warning" },
];

const POSITIVE_POOL = ACTIVITY_POOL.filter((a) => a.type === "positive");
const NEUTRAL_POOL = ACTIVITY_POOL.filter((a) => a.type === "neutral");
const WARNING_POOL = ACTIVITY_POOL.filter((a) => a.type === "warning");

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "early_adopter",
    title: "Early Adopter",
    description: "Started tracking within 24h of launch",
    icon: Star,
    thresholdKey: "session",
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.3)",
  },
  {
    id: "visibility_milestone",
    title: "Visibility Milestone",
    description: "Reached 70%+ visibility score",
    icon: Eye,
    thresholdKey: "visibility",
    color: "#00b4ff",
    glow: "rgba(0,180,255,0.3)",
  },
  {
    id: "engagement_champion",
    title: "Engagement Champion",
    description: "Maintained high engagement rate",
    icon: Zap,
    thresholdKey: "engagement",
    color: "#00ff87",
    glow: "rgba(0,255,135,0.3)",
  },
  {
    id: "launch_explorer",
    title: "Launch Explorer",
    description: "Explored all dashboard features",
    icon: Target,
    thresholdKey: "explorer",
    color: "#b366ff",
    glow: "rgba(179,102,255,0.3)",
  },
];

const LAUNCH_STAGES: Record<
  LaunchStageId,
  {
    label: string;
    color: string;
    badgeBg: string;
    badgeBorder: string;
    next: number;
  }
> = {
  seed: {
    label: "Seed",
    color: "#8892a4",
    badgeBg: "rgba(136,146,164,0.1)",
    badgeBorder: "rgba(136,146,164,0.25)",
    next: 25,
  },
  early: {
    label: "Early Traction",
    color: "#00b4ff",
    badgeBg: "rgba(0,180,255,0.1)",
    badgeBorder: "rgba(0,180,255,0.3)",
    next: 55,
  },
  growth: {
    label: "Growth",
    color: "#00d4ff",
    badgeBg: "rgba(0,212,255,0.1)",
    badgeBorder: "rgba(0,212,255,0.3)",
    next: 80,
  },
  momentum: {
    label: "Momentum",
    color: "#b366ff",
    badgeBg: "rgba(179,102,255,0.1)",
    badgeBorder: "rgba(179,102,255,0.3)",
    next: 100,
  },
};

const STAGE_ORDER: LaunchStageId[] = ["seed", "early", "growth", "momentum"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTs(ts: Date): string {
  const diffSec = Math.floor((Date.now() - ts.getTime()) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

function activityColor(type: ActivityType): string {
  if (type === "positive") return "#00ff87";
  if (type === "neutral") return "#f59e0b";
  return "#ff4d6d";
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getStageFromVisibility(v: number): LaunchStageId {
  if (v >= 80) return "momentum";
  if (v >= 55) return "growth";
  if (v >= 25) return "early";
  return "seed";
}

function truncateAddr(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

// ─── Generate realistic chart data ───────────────────────────────────────────

function generateChartData(
  window: TrackingWindow,
  baseVisibility: number,
): { time: string; visibility: number; engagement: number }[] {
  const points = window === "24h" ? 24 : window === "7d" ? 28 : 30;
  const labels: string[] = [];

  if (window === "24h") {
    for (let i = points - 1; i >= 0; i--) {
      const h = new Date(Date.now() - i * 3600_000);
      labels.push(`${h.getHours()}:00`);
    }
  } else if (window === "7d") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 6 * 3600_000);
      labels.push(days[d.getDay()]);
    }
  } else {
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
  }

  let v = Math.max(20, baseVisibility - 35);
  return labels.map((time, i) => {
    // Natural variation: gradual rise with realistic dips and plateaus
    const phase = i / points;
    const trend = phase < 0.3 ? 1.8 : phase < 0.6 ? 0.9 : 1.4;
    const noise =
      i % 7 === 0
        ? -5 // periodic dip
        : i % 11 === 0
          ? -3.5 // mini dip
          : i % 5 === 4
            ? 0 // plateau
            : Math.sin(i * 1.7) * 2 + Math.cos(i * 0.9) * 1.5;
    v = Math.min(98, Math.max(8, v + trend + noise));
    const engagement = Math.min(
      95,
      Math.max(5, v * 0.82 + Math.sin(i * 2.3) * 4),
    );
    return {
      time,
      visibility: Math.round(v),
      engagement: Math.round(engagement),
    };
  });
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg"
      style={{
        background: "rgba(8,11,18,0.96)",
        border: "1px solid rgba(0,180,255,0.2)",
        fontFamily: "JetBrains Mono, monospace",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      <p className="text-[10px] mb-1" style={{ color: "#4a5568" }}>
        {label}
      </p>
      {payload.map((p) => (
        <p
          key={p.name}
          className="text-xs font-bold"
          style={{ color: p.name === "visibility" ? "#00d9ff" : "#00ff87" }}
        >
          {p.name === "visibility" ? "Visibility" : "Engagement"}: {p.value}%
        </p>
      ))}
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  delay?: number;
  pulse?: boolean;
  description?: string;
}

function MetricCard({
  label,
  value,
  delta,
  deltaPositive = true,
  icon: Icon,
  accent,
  delay = 0,
  pulse,
  description,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      <div
        className="h-full p-4 rounded-xl"
        style={{
          background: accent
            ? "linear-gradient(135deg, rgba(13,17,23,0.95), rgba(0,217,255,0.06))"
            : "rgba(13,17,23,0.9)",
          border: accent
            ? "1px solid rgba(0,217,255,0.25)"
            : "1px solid rgba(0,255,135,0.08)",
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{
                color: "#4a5568",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              {label}
            </span>
            {pulse && (
              <motion.span
                animate={{ opacity: [1, 0.25, 1], scale: [1, 1.4, 1] }}
                transition={{
                  duration: 1.8,
                  repeat: Number.POSITIVE_INFINITY,
                }}
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "#00ff87", boxShadow: "0 0 5px #00ff87" }}
              />
            )}
          </div>
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
            style={{
              background: accent
                ? "rgba(0,217,255,0.12)"
                : "rgba(255,255,255,0.04)",
              border: accent
                ? "1px solid rgba(0,217,255,0.2)"
                : "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <Icon
              className={`w-3.5 h-3.5 ${
                accent ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
        </div>

        <p
          className="text-2xl font-bold tracking-tight"
          style={{
            fontFamily: "JetBrains Mono, monospace",
            color: accent ? "#00d9ff" : "#f0f4f8",
            textShadow: accent ? "0 0 20px rgba(0,217,255,0.3)" : "none",
          }}
        >
          {value}
        </p>

        {description && (
          <p
            className="text-[11px] mt-0.5"
            style={{
              color: "#4a5568",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {description}
          </p>
        )}

        {delta && (
          <p
            className="text-[10px] mt-1.5 font-bold flex items-center gap-0.5"
            style={{
              fontFamily: "JetBrains Mono, monospace",
              color: deltaPositive ? "#00ff87" : "#ff4d6d",
            }}
          >
            {deltaPositive ? (
              <TrendingUp className="w-2.5 h-2.5" />
            ) : (
              <TrendingDown className="w-2.5 h-2.5" />
            )}
            {delta} vs last 24h
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Achievement Badge ────────────────────────────────────────────────────────

function AchievementBadgeCard({
  def,
  unlocked,
  justUnlocked,
}: {
  def: AchievementDef;
  unlocked: boolean;
  justUnlocked: boolean;
}) {
  const Icon = def.icon;
  return (
    <motion.div
      animate={
        justUnlocked
          ? {
              scale: [1, 1.12, 0.96, 1.04, 1],
              boxShadow: [
                "0 0 0px 0px transparent",
                `0 0 30px 8px ${def.glow}`,
                `0 0 15px 4px ${def.glow}`,
                `0 0 8px 2px ${def.glow}`,
                "0 0 0px 0px transparent",
              ],
            }
          : {}
      }
      transition={{ duration: 0.6 }}
      className="p-3 rounded-xl flex flex-col items-center text-center gap-2"
      style={{
        background: unlocked
          ? `linear-gradient(135deg, rgba(13,17,23,0.95), ${def.glow.replace(
              "0.3",
              "0.06",
            )})`
          : "rgba(13,17,23,0.7)",
        border: unlocked
          ? `1px solid ${def.glow.replace("0.3", "0.35")}`
          : "1px solid rgba(255,255,255,0.05)",
        opacity: unlocked ? 1 : 0.45,
        filter: unlocked ? "none" : "grayscale(1)",
        transition: "all 0.4s ease",
      }}
      data-ocid={`analytics.badge.${def.id}`}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: unlocked
            ? `${def.glow.replace("0.3", "0.15")}`
            : "rgba(255,255,255,0.04)",
          border: unlocked
            ? `1px solid ${def.glow.replace("0.3", "0.4")}`
            : "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Icon
          className="w-4 h-4"
          style={{ color: unlocked ? def.color : "#4a5568" }}
        />
      </div>
      <div>
        <p
          className="text-[11px] font-bold leading-tight"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            color: unlocked ? "#f0f4f8" : "#4a5568",
          }}
        >
          {def.title}
        </p>
        <p
          className="text-[9px] mt-0.5 leading-tight"
          style={{ color: unlocked ? "#8892a4" : "#4a5568" }}
        >
          {def.description}
        </p>
      </div>
      {unlocked && (
        <CheckCircle2
          className="w-3 h-3"
          style={{ color: def.color, opacity: 0.8 }}
        />
      )}
    </motion.div>
  );
}

// ─── Whale Leaderboard Row ────────────────────────────────────────────────────

function WhaleRow({ whale, rank }: { whale: WhaleSnapshot; rank: number }) {
  return (
    <tr
      className="border-b"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
      data-ocid={`analytics.whale.item.${rank}`}
    >
      <td
        className="py-2.5 pl-4 text-xs font-bold"
        style={{
          fontFamily: "JetBrains Mono, monospace",
          color: "#4a5568",
          width: 32,
        }}
      >
        {rank}
      </td>
      <td
        className="py-2.5 text-xs truncate max-w-[110px]"
        style={{ fontFamily: "JetBrains Mono, monospace", color: "#8892a4" }}
      >
        {truncateAddr(whale.walletAddress)}
      </td>
      <td
        className="py-2.5 text-xs text-right"
        style={{ fontFamily: "JetBrains Mono, monospace", color: "#00ff87" }}
      >
        {whale.tokenBalance >= 1_000_000
          ? `${(whale.tokenBalance / 1_000_000).toFixed(1)}M`
          : whale.tokenBalance.toLocaleString()}
      </td>
      <td
        className="py-2.5 text-xs text-right pr-4"
        style={{ fontFamily: "JetBrains Mono, monospace", color: "#00b4ff" }}
      >
        {whale.solBalance.toFixed(2)} SOL
      </td>
      <td className="py-2.5 pr-4 text-right">
        {whale.airdropClaimed ? (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
            style={{
              background: "rgba(0,255,135,0.1)",
              color: "#00ff87",
              border: "1px solid rgba(0,255,135,0.25)",
            }}
          >
            Claimed
          </span>
        ) : (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{
              color: "#4a5568",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            Pending
          </span>
        )}
      </td>
    </tr>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

function ActivityFeed() {
  const counterRef = useRef(200);
  const [messages, setMessages] = useState<ActivityEntry[]>(() => {
    const seeds = [
      ACTIVITY_POOL[0],
      ACTIVITY_POOL[1],
      ACTIVITY_POOL[12],
      ACTIVITY_POOL[2],
      ACTIVITY_POOL[16],
      ACTIVITY_POOL[3],
      ACTIVITY_POOL[13],
      ACTIVITY_POOL[4],
    ];
    return seeds.map((a, i) => ({
      id: i,
      text: a.text,
      type: a.type,
      ts: new Date(Date.now() - (8 - i) * 15_000),
    }));
  });

  const [autoEnabled, setAutoEnabled] = useState(true);
  const autoRef = useRef(autoEnabled);
  autoRef.current = autoEnabled;

  const addEntry = useCallback(() => {
    const roll = Math.random();
    const pool =
      roll < 0.5 ? POSITIVE_POOL : roll < 0.75 ? NEUTRAL_POOL : WARNING_POOL;
    const picked = pickRandom(pool);
    counterRef.current += 1;
    setMessages((prev) => [
      {
        id: counterRef.current,
        text: picked.text,
        type: picked.type,
        ts: new Date(),
      },
      ...prev.slice(0, 7),
    ]);
  }, []);

  // Auto-refresh every 8-15s
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    function schedule() {
      const delay = 8_000 + Math.random() * 7_000;
      timeoutId = setTimeout(() => {
        if (autoRef.current) addEntry();
        schedule();
      }, delay);
    }
    schedule();
    return () => clearTimeout(timeoutId);
  }, [addEntry]);

  return (
    <div
      className="rounded-2xl overflow-hidden h-full flex flex-col"
      style={{
        background: "rgba(13,17,23,0.9)",
        border: "1px solid rgba(0,180,255,0.1)",
      }}
      data-ocid="analytics.activity_feed"
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(0,180,255,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" style={{ color: "#00b4ff" }} />
          <span
            className="font-semibold text-sm"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "#f0f4f8",
            }}
          >
            Activity Feed
          </span>
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#00b4ff", boxShadow: "0 0 5px #00b4ff" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoEnabled((v) => !v)}
            className="text-[10px] px-2 py-0.5 rounded-full transition-colors duration-150"
            style={{
              color: autoEnabled ? "#00ff87" : "#4a5568",
              border: `1px solid ${
                autoEnabled ? "rgba(0,255,135,0.25)" : "rgba(255,255,255,0.08)"
              }`,
              background: "transparent",
              fontFamily: "JetBrains Mono, monospace",
            }}
            data-ocid="analytics.activity_auto_toggle"
          >
            {autoEnabled ? "● Live" : "○ Paused"}
          </button>
          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors duration-150"
            style={{
              color: "#00b4ff",
              border: "1px solid rgba(0,180,255,0.2)",
              background: "transparent",
              fontFamily: "JetBrains Mono, monospace",
            }}
            data-ocid="analytics.activity_refresh_button"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Feed items */}
      <div className="p-3 space-y-1.5 flex-1 overflow-y-auto scroll-ios">
        <AnimatePresence initial={false}>
          {messages.map((entry) => {
            const color = activityColor(entry.type);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28 }}
                className="flex items-start gap-2 py-2 px-3 rounded-lg"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}
                data-ocid={`analytics.activity_item.${entry.id}`}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                  style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs leading-snug"
                    style={{ color, fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {entry.text}
                  </p>
                </div>
                <p
                  className="text-[10px] flex-shrink-0 mt-0.5"
                  style={{
                    color: "#4a5568",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {fmtTs(entry.ts)}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Export Dropdown ──────────────────────────────────────────────────────────

function ExportDropdown({
  tokenSymbol,
  tokenCa,
  visibilityScore,
  activeViews,
  engagementRate,
  trendDelta,
}: {
  tokenSymbol: string;
  tokenCa: string;
  visibilityScore: number;
  activeViews: number;
  engagementRate: number;
  trendDelta: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handlePdf = useCallback(() => {
    setOpen(false);
    // Add print styles
    const style = document.createElement("style");
    style.id = "by8-print-styles";
    style.textContent = `
      @media print {
        body > *:not(.by8-print-target) { display: none !important; }
        .by8-print-target { display: block !important; }
        nav, header, footer, [data-ocid="bottom_nav"] { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => {
      const el = document.getElementById("by8-print-styles");
      if (el) el.remove();
    }, 1500);
    toast.success("Print dialog opened — save as PDF");
  }, []);

  const handleCsv = useCallback(() => {
    setOpen(false);
    const rows = [
      ["Metric", "Value", "Timestamp"],
      ["Token", tokenSymbol, new Date().toISOString()],
      ["Contract Address", tokenCa || "—", ""],
      ["Visibility Score", `${visibilityScore}%`, ""],
      ["Active Views", `${activeViews}`, ""],
      ["Engagement Rate", `${engagementRate.toFixed(1)}%`, ""],
      [
        "Trend Direction",
        `${trendDelta > 0 ? "+" : ""}${trendDelta.toFixed(1)}%`,
        "",
      ],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `by8-report-${tokenSymbol || "token"}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV report downloaded");
  }, [
    tokenSymbol,
    tokenCa,
    visibilityScore,
    activeViews,
    engagementRate,
    trendDelta,
  ]);

  const handleShareLink = useCallback(async () => {
    setOpen(false);
    const params = new URLSearchParams({
      token: tokenSymbol,
      ca: tokenCa || "",
      vis: String(visibilityScore),
      eng: String(Math.round(engagementRate)),
      ref: "by8-share",
    });
    const link = `${window.location.origin}/dashboard?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Shareable link copied to clipboard");
    } catch {
      toast.error("Could not copy — try again");
    }
  }, [tokenSymbol, tokenCa, visibilityScore, engagementRate]);

  return (
    <div className="relative" ref={ref}>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs h-8"
        style={{
          background: "rgba(0,217,255,0.07)",
          borderColor: "rgba(0,217,255,0.25)",
          color: "#00d9ff",
        }}
        data-ocid="analytics.export_button"
      >
        <Download className="w-3.5 h-3.5" />
        Export Report
        <ChevronDown className="w-3 h-3" />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden min-w-[180px]"
            style={{
              background: "rgba(11,15,24,0.98)",
              border: "1px solid rgba(0,217,255,0.2)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
            }}
            data-ocid="analytics.export_dropdown"
          >
            <button
              type="button"
              onClick={handlePdf}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors duration-150 hover:bg-white/5"
              style={{
                color: "#f0f4f8",
                fontFamily: "Space Grotesk, sans-serif",
              }}
              data-ocid="analytics.export_pdf_button"
            >
              <Download className="w-3.5 h-3.5" style={{ color: "#00d9ff" }} />
              Download PDF
            </button>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
            <button
              type="button"
              onClick={handleCsv}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors duration-150 hover:bg-white/5"
              style={{
                color: "#f0f4f8",
                fontFamily: "Space Grotesk, sans-serif",
              }}
              data-ocid="analytics.export_csv_button"
            >
              <BarChart3 className="w-3.5 h-3.5" style={{ color: "#00ff87" }} />
              Download CSV
            </button>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
            <button
              type="button"
              onClick={handleShareLink}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors duration-150 hover:bg-white/5"
              style={{
                color: "#f0f4f8",
                fontFamily: "Space Grotesk, sans-serif",
              }}
              data-ocid="analytics.export_share_button"
            >
              <Link2 className="w-3.5 h-3.5" style={{ color: "#b366ff" }} />
              Copy Shareable Link
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { actor, isFetching } = useActor(createActor);
  const onboarding = useAppStore((s) => s.onboarding);
  const tokenMeta = onboarding.tokenMeta;
  const storedToken = readTokenData();
  const { soundEnabled } = usePreferences();
  const { playSound } = useSoundFX({ soundEnabled });
  const { triggerHaptic } = useHaptics();
  const queryClient = useQueryClient();

  // Prefer store meta, fall back to sessionStorage
  const displayToken = tokenMeta
    ? {
        name: tokenMeta.name,
        symbol: tokenMeta.symbol,
        ca: tokenMeta.ca || tokenMeta.mint,
        imageUrl: tokenMeta.imageUrl ?? tokenMeta.image,
      }
    : storedToken
      ? {
          name: storedToken.name,
          symbol: storedToken.symbol,
          ca: storedToken.ca,
          imageUrl: storedToken.image,
        }
      : {
          name: "BY8 Analytics",
          symbol: "BY8",
          ca: "",
          imageUrl: undefined,
        };

  // ── Tracking window ──
  const [trackingWindow, setTrackingWindow] = useState<TrackingWindow>(
    (onboarding.trackingWindow as TrackingWindow) ?? "7d",
  );

  // ── Live metrics ──
  const visibilityBase = useDriftingCounter(58, 88, 45_000, 3);
  const activeViews = useIncrementingCounter(1247, 72_000);
  const engagementBase = useDriftingCounter(52, 78, 50_000, 4);
  const trendSignal = useDriftingCounter(-8, 18, 35_000, 2);
  const sessionViews = useIncrementingCounter(activeViews, 90_000);
  const displayViews = sessionViews;

  // Trend direction (positive = up, negative = down)
  const trendDelta = trendSignal;
  const trendPositive = trendDelta >= 0;

  // ── Launch stage derived from visibility ──
  const currentStage = getStageFromVisibility(visibilityBase);
  const stageIdx = STAGE_ORDER.indexOf(currentStage);
  const stageDef = LAUNCH_STAGES[currentStage];
  // Progress within this stage
  const prevThreshold =
    stageIdx > 0 ? LAUNCH_STAGES[STAGE_ORDER[stageIdx - 1]].next : 0;
  const stageProgress = Math.round(
    ((visibilityBase - prevThreshold) / (stageDef.next - prevThreshold)) * 100,
  );

  // ── Chart data ──
  const chartData = useMemo(
    () => generateChartData(trackingWindow, visibilityBase),
    [trackingWindow, visibilityBase],
  );

  // ── Achievement unlock state ──
  const [unlockedBadges, setUnlockedBadges] = useState<Set<string>>(
    new Set(["early_adopter"]),
  );
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);

  const unlock = useCallback(
    (id: string) => {
      if (unlockedBadges.has(id)) return;
      setUnlockedBadges((prev) => new Set([...prev, id]));
      setJustUnlocked(id);
      triggerHaptic("success");
      playSound("success");
      toast.success(
        `Achievement unlocked: ${ACHIEVEMENTS.find((a) => a.id === id)?.title}`,
      );
      setTimeout(() => setJustUnlocked(null), 1500);
    },
    [unlockedBadges, triggerHaptic, playSound],
  );

  // Auto-unlock badges as metrics cross thresholds
  useEffect(() => {
    if (visibilityBase >= 70) unlock("visibility_milestone");
  }, [visibilityBase, unlock]);

  useEffect(() => {
    if (engagementBase >= 65) unlock("engagement_champion");
  }, [engagementBase, unlock]);

  // ── Whale leaderboard data ──
  const { data: whaleData, isLoading: whaleLoading } = useQuery({
    queryKey: ["whaleLeaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWhaleLeaderboard(BigInt(10));
    },
    enabled: !!actor && !isFetching,
    staleTime: 120_000,
    placeholderData: [],
  });

  const whales = (whaleData ?? []).slice(0, 5);

  // ── Insight text based on trend ──
  const insightText = trendPositive
    ? "Your token is gaining early traction. Maintain consistent visibility to stabilize growth signals."
    : "A minor visibility dip detected. This is normal \u2014 sustained tracking helps recovery and signals confidence to the market.";

  // ── Refresh handler ──
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    triggerHaptic("click");
    playSound("click");
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["whaleLeaderboard"] });
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Data refreshed");
      unlock("launch_explorer");
    }, 800);
  }, [triggerHaptic, playSound, queryClient, unlock]);

  return (
    <div className="min-h-screen pb-24" style={{ background: "#080b12" }}>
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% -10%, rgba(0,217,255,0.04) 0%, transparent 60%)",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          background: "rgba(8,11,18,0.92)",
          borderBottom: "1px solid rgba(0,217,255,0.14)",
          boxShadow: "0 1px 0 rgba(0,217,255,0.04), 0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Token identity */}
          <div className="flex items-center gap-3">
            <TokenLogo
              symbol={displayToken.symbol}
              imageUrl={displayToken.imageUrl}
              size={32}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span
                  className="font-bold text-sm leading-tight"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    color: "#f0f4f8",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {displayToken.name}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: "rgba(0,217,255,0.08)",
                    border: "1px solid rgba(0,217,255,0.22)",
                    color: "#00d9ff",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  ${displayToken.symbol}
                </span>
                {/* Network badge */}
                <span
                  className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded-full items-center gap-1"
                  style={{
                    background: "rgba(157,95,234,0.1)",
                    border: "1px solid rgba(157,95,234,0.25)",
                    color: "#b56fff",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  Solana
                </span>
              </div>
              <span
                className="text-[10px]"
                style={{
                  color: "#4a5568",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                Launch Analytics
              </span>
            </div>
          </div>

          {/* Live status */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(0,255,135,0.07)",
              border: "1px solid rgba(0,255,135,0.2)",
            }}
            data-ocid="analytics.live_badge"
          >
            <motion.span
              animate={{ opacity: [1, 0.2, 1], scale: [1, 1.35, 1] }}
              transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#00ff87", boxShadow: "0 0 6px #00ff87" }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{
                color: "#00ff87",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Active Tracking
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ── 5 Metric Cards ── */}
        <section data-ocid="analytics.metrics_section">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard
              label="Visibility Score"
              value={`${visibilityBase}%`}
              delta="+5.2%"
              deltaPositive
              icon={Eye}
              accent
              delay={0}
              pulse
              description="Live score"
            />
            <MetricCard
              label="Active Views"
              value={displayViews.toLocaleString()}
              delta="+18.4%"
              deltaPositive
              icon={BarChart3}
              delay={0.06}
              description="Unique sessions"
            />
            <MetricCard
              label="Engagement Rate"
              value={`${engagementBase.toFixed(1)}%`}
              delta="+3.1%"
              deltaPositive
              icon={Flame}
              delay={0.12}
              description="Signal quality"
            />
            <MetricCard
              label="Trend Direction"
              value={`${trendPositive ? "+" : ""}${trendDelta.toFixed(1)}%`}
              delta={trendPositive ? "+12.4%" : "-3.1%"}
              deltaPositive={trendPositive}
              icon={trendPositive ? TrendingUp : TrendingDown}
              delay={0.18}
              description={trendPositive ? "Upward trend" : "Minor dip"}
            />
            <MetricCard
              label="Launch Stage"
              value={stageDef.label}
              icon={Award}
              delay={0.24}
              description={`${stageProgress}% to next`}
            />
          </div>
        </section>

        {/* ── Main Panel: Chart (left) + Activity Feed (right) ── */}
        <section
          className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4"
          data-ocid="analytics.main_panel"
        >
          {/* Left: Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(13,17,23,0.9)",
              border: "1px solid rgba(0,217,255,0.12)",
            }}
            data-ocid="analytics.visibility_chart"
          >
            {/* Chart header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(0,217,255,0.06)" }}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: "#00d9ff" }} />
                <span
                  className="font-semibold text-sm"
                  style={{
                    fontFamily: "Space Grotesk, sans-serif",
                    color: "#f0f4f8",
                  }}
                >
                  Visibility Over Time
                </span>
              </div>
              {/* Window tab switcher */}
              <div
                className="flex gap-0.5 p-0.5 rounded-lg"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                data-ocid="analytics.chart_window_tabs"
              >
                {(["24h", "7d", "30d"] as TrackingWindow[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      triggerHaptic("click");
                      setTrackingWindow(w);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all duration-200"
                    style={
                      trackingWindow === w
                        ? {
                            background: "rgba(0,217,255,0.14)",
                            color: "#00d9ff",
                            border: "1px solid rgba(0,217,255,0.28)",
                          }
                        : {
                            color: "#4a5568",
                            background: "transparent",
                            border: "1px solid transparent",
                          }
                    }
                    data-ocid={`analytics.chart_tab.${w}`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart body */}
            <div className="p-4 pb-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={trackingWindow}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ height: 220 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
                    >
                      <defs>
                        <linearGradient
                          id="visGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#00d9ff"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="#00d9ff"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="engGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#00ff87"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="100%"
                            stopColor="#00ff87"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="time"
                        tick={{
                          fill: "#4a5568",
                          fontSize: 10,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{
                          fill: "#4a5568",
                          fontSize: 10,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => `${v}%`}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="engagement"
                        stroke="#00ff87"
                        strokeWidth={1.5}
                        fill="url(#engGradient)"
                        strokeOpacity={0.7}
                        dot={false}
                        activeDot={{ r: 4, fill: "#00ff87" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="visibility"
                        stroke="#00d9ff"
                        strokeWidth={2.5}
                        fill="url(#visGradient)"
                        dot={false}
                        activeDot={{ r: 5, fill: "#00d9ff" }}
                        style={{
                          filter: "drop-shadow(0 0 4px rgba(0,217,255,0.5))",
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-0.5 rounded"
                    style={{ background: "#00d9ff" }}
                  />
                  <span
                    className="text-[10px]"
                    style={{
                      color: "#4a5568",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    Visibility
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-0.5 rounded"
                    style={{ background: "#00ff87" }}
                  />
                  <span
                    className="text-[10px]"
                    style={{
                      color: "#4a5568",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    Engagement
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
          >
            <ActivityFeed />
          </motion.div>
        </section>

        {/* ── Control Row ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="flex flex-wrap items-center gap-3"
          data-ocid="analytics.control_row"
        >
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs h-8"
            style={{
              background: "rgba(0,255,135,0.06)",
              borderColor: "rgba(0,255,135,0.22)",
              color: "#00ff87",
            }}
            data-ocid="analytics.refresh_button"
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={{
                duration: 0.7,
                repeat: isRefreshing ? Number.POSITIVE_INFINITY : 0,
                ease: "linear",
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </motion.div>
            Refresh Data
          </Button>

          <ExportDropdown
            tokenSymbol={displayToken.symbol}
            tokenCa={displayToken.ca}
            visibilityScore={visibilityBase}
            activeViews={displayViews}
            engagementRate={engagementBase}
            trendDelta={trendDelta}
          />

          {/* Tracking Window pill selector */}
          <div
            className="flex gap-0.5 p-0.5 rounded-xl ml-auto"
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            data-ocid="analytics.tracking_window"
          >
            {(["24h", "7d", "30d"] as TrackingWindow[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  triggerHaptic("click");
                  setTrackingWindow(w);
                }}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all duration-200"
                style={
                  trackingWindow === w
                    ? {
                        background: "rgba(0,217,255,0.12)",
                        color: "#00d9ff",
                        border: "1px solid rgba(0,217,255,0.25)",
                      }
                    : {
                        color: "#4a5568",
                        background: "transparent",
                        border: "1px solid transparent",
                      }
                }
                data-ocid={`analytics.window_pill.${w}`}
              >
                {w}
              </button>
            ))}
          </div>
        </motion.section>

        {/* ── Insight Box ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          data-ocid="analytics.insight_box"
        >
          <div
            className="flex items-start gap-3 px-5 py-4 rounded-xl"
            style={{
              background: trendPositive
                ? "linear-gradient(135deg, rgba(0,255,135,0.05), rgba(0,217,255,0.04))"
                : "linear-gradient(135deg, rgba(255,77,109,0.05), rgba(245,158,11,0.04))",
              border: trendPositive
                ? "1px solid rgba(0,255,135,0.18)"
                : "1px solid rgba(255,77,109,0.18)",
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: trendPositive
                  ? "rgba(0,255,135,0.1)"
                  : "rgba(255,77,109,0.1)",
                border: trendPositive
                  ? "1px solid rgba(0,255,135,0.2)"
                  : "1px solid rgba(255,77,109,0.2)",
              }}
            >
              {trendPositive ? (
                <Zap className="w-4 h-4" style={{ color: "#00ff87" }} />
              ) : (
                <AlertTriangle
                  className="w-4 h-4"
                  style={{ color: "#f59e0b" }}
                />
              )}
            </div>
            <div>
              <p
                className="text-xs font-bold mb-0.5"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: trendPositive ? "#00ff87" : "#f59e0b",
                }}
              >
                Launch Insight
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{
                  color: "#8892a4",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                {insightText}
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── Achievement Badges ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          data-ocid="analytics.badges_section"
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(13,17,23,0.9)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <Trophy className="w-4 h-4" style={{ color: "#fbbf24" }} />
              <span
                className="font-semibold text-sm"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: "#f0f4f8",
                }}
              >
                Achievements
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(251,191,36,0.08)",
                  color: "#fbbf24",
                  border: "1px solid rgba(251,191,36,0.2)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {unlockedBadges.size}/{ACHIEVEMENTS.length}
              </span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ACHIEVEMENTS.map((def) => (
                <AchievementBadgeCard
                  key={def.id}
                  def={def}
                  unlocked={unlockedBadges.has(def.id)}
                  justUnlocked={justUnlocked === def.id}
                />
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Whale Leaderboard Compact ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          data-ocid="analytics.whale_leaderboard"
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(13,17,23,0.9)",
              border: "1px solid rgba(179,102,255,0.12)",
            }}
          >
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ borderBottom: "1px solid rgba(179,102,255,0.06)" }}
            >
              <Share2 className="w-4 h-4" style={{ color: "#b366ff" }} />
              <span
                className="font-semibold text-sm"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: "#f0f4f8",
                }}
              >
                Verified Whales
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(179,102,255,0.08)",
                  color: "#b366ff",
                  border: "1px solid rgba(179,102,255,0.2)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                Top 5
              </span>
            </div>

            {whaleLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : whales.length === 0 ? (
              <div
                className="text-center py-10 space-y-2"
                data-ocid="analytics.whale_empty_state"
              >
                <p
                  className="text-sm"
                  style={{
                    color: "#4a5568",
                    fontFamily: "Space Grotesk, sans-serif",
                  }}
                >
                  No verified whales yet
                </p>
                <p
                  className="text-xs"
                  style={{
                    color: "#4a5568",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  Whales holding 7M+ tokens appear here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      {["#", "Wallet", "Token Balance", "SOL", "Airdrop"].map(
                        (h) => (
                          <th
                            key={h}
                            className={`py-2 text-[10px] font-bold uppercase tracking-widest ${
                              h === "#"
                                ? "pl-4 text-left"
                                : h === "Wallet"
                                  ? "text-left"
                                  : h === "Airdrop"
                                    ? "text-right pr-4"
                                    : "text-right"
                            }`}
                            style={{
                              color: "#4a5568",
                              fontFamily: "Space Grotesk, sans-serif",
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {whales.map((w, i) => (
                      <WhaleRow key={w.walletAddress} whale={w} rank={i + 1} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.section>

        {/* ── Launch Stage Progress ── */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          data-ocid="analytics.launch_stage_section"
        >
          <div
            className="p-4 rounded-xl"
            style={{
              background: "rgba(13,17,23,0.9)",
              border: `1px solid ${stageDef.badgeBorder}`,
              boxShadow: `0 0 24px 0 ${stageDef.badgeBg}`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{
                  color: "#4a5568",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                Launch Stage Progression
              </span>
              <span
                className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                style={{
                  background: stageDef.badgeBg,
                  border: `1px solid ${stageDef.badgeBorder}`,
                  color: stageDef.color,
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                {stageDef.label}
              </span>
            </div>
            <div
              className="w-full rounded-full h-1.5 overflow-hidden mb-2"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${stageProgress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                  background: `linear-gradient(90deg, ${stageDef.color}, ${stageDef.color}aa)`,
                  boxShadow: `0 0 8px ${stageDef.color}66`,
                }}
              />
            </div>
            <div className="flex items-center gap-1">
              {STAGE_ORDER.map((s, i) => (
                <div
                  key={s}
                  className="h-1 flex-1 rounded-full transition-all duration-500"
                  style={{
                    background:
                      i < stageIdx
                        ? LAUNCH_STAGES[s].color
                        : i === stageIdx
                          ? stageDef.color
                          : "rgba(255,255,255,0.06)",
                    opacity: i <= stageIdx ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between mt-1.5">
              {STAGE_ORDER.map((s) => (
                <span
                  key={s}
                  className="text-[9px]"
                  style={{
                    color: s === currentStage ? stageDef.color : "#4a5568",
                    fontFamily: "JetBrains Mono, monospace",
                    fontWeight: s === currentStage ? 700 : 400,
                  }}
                >
                  {LAUNCH_STAGES[s].label.split(" ")[0]}
                </span>
              ))}
            </div>
          </div>
        </motion.section>
      </main>

      <BottomNav />
    </div>
  );
}
