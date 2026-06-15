import { createActor } from "@/backend";
import BottomNav from "@/components/BottomNav";
import LiveTickerFade, { TOKEN_LOGOS } from "@/components/LiveTicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { haptic, hapticChain, primeHaptics } from "@/hooks/use-haptics";
import { useDriftingCounter } from "@/hooks/use-live-counter";
import { useSolanaPrice } from "@/hooks/use-solana-price";
import { cn } from "@/lib/utils";
import { useActor } from "@caffeineai/core-infrastructure";
import {
  Activity,
  BarChart2,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Flame,
  LayoutDashboard,
  Link2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  ThumbsUp,
  TrendingUp,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiDiscord } from "react-icons/si";
import { toast } from "sonner";

const BOOST_WALLET_ADDRESS = "4VNDpgK6umWjRr3p4823b5bBUK65QR48e6igkXZ7Qmz8";
const MIN_TX_HASH_LENGTH = 43;

type BoosterMode = "dex" | "pumpfun";

interface CommunityTier {
  id: string;
  name: string;
  sol: number;
  members: string;
  duration: string;
  badge?: string;
  color: string;
  glow: string;
  icon: string;
}

const COMMUNITY_TIERS: CommunityTier[] = [
  {
    id: "starter",
    name: "Starter",
    sol: 0.5,
    members: "~500",
    duration: "12h push",
    color: "#8892a4",
    glow: "rgba(136,146,164,0.15)",
    icon: "🌱",
  },
  {
    id: "basic",
    name: "Basic",
    sol: 1.0,
    members: "~1,200",
    duration: "24h push",
    color: "#00d4ff",
    glow: "rgba(0,212,255,0.15)",
    icon: "💧",
  },
  {
    id: "standard",
    name: "Standard",
    sol: 2.5,
    members: "~3,000",
    duration: "48h push",
    badge: "POPULAR",
    color: "#00ff87",
    glow: "rgba(0,255,135,0.15)",
    icon: "⚡",
  },
  {
    id: "growth",
    name: "Growth",
    sol: 5.0,
    members: "~6,000",
    duration: "72h push",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.15)",
    icon: "📈",
  },
  {
    id: "pro",
    name: "Pro",
    sol: 10.0,
    members: "~14,000",
    duration: "5-day push",
    badge: "BEST VALUE",
    color: "#fbbf24",
    glow: "rgba(251,191,36,0.15)",
    icon: "🔥",
  },
  {
    id: "elite",
    name: "Elite",
    sol: 17.0,
    members: "~25,000",
    duration: "7-day push",
    color: "#f97316",
    glow: "rgba(249,115,22,0.15)",
    icon: "💎",
  },
  {
    id: "ultra",
    name: "Ultra",
    sol: 25.0,
    members: "~40,000",
    duration: "14-day push",
    color: "#ec4899",
    glow: "rgba(236,72,153,0.15)",
    icon: "🚀",
  },
  {
    id: "whale",
    name: "Whale",
    sol: 35.0,
    members: "~60,000",
    duration: "30-day push",
    badge: "WHALE",
    color: "#00ff87",
    glow: "rgba(0,255,135,0.2)",
    icon: "🐋",
  },
];

const DEX_FEATURES = [
  "Organic trading volume across DEX platforms",
  "Real wallet interactions, no bot farms",
  "Trending push on major DEX screeners",
  "Natural price discovery support",
  "Community-driven momentum",
];

const PUMPFUN_FEATURES = [
  "Organic pump.fun community engagement",
  "Real holders, not programmatic wallets",
  "Trending boost on pump.fun discover page",
  "Authentic community momentum",
  "Zero bot activity — 100% organic",
];

const FEATURE_HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Zero Bot Farms",
    desc: "Only verified human wallets",
    color: "#00ff87",
  },
  {
    icon: Users,
    title: "Real Community",
    desc: "Genuine engaged members",
    color: "#00d4ff",
  },
  {
    icon: TrendingUp,
    title: "Organic Growth",
    desc: "Natural market momentum",
    color: "#a78bfa",
  },
];

// ─── Activity Feed ─────────────────────────────────────────────────────────────

const TOKEN_POOL = [
  { symbol: "BONK", color: "#fbbf24" },
  { symbol: "WIF", color: "#00d4ff" },
  { symbol: "POPCAT", color: "#f97316" },
  { symbol: "BOME", color: "#9d5fea" },
  { symbol: "MEW", color: "#00ff87" },
  { symbol: "JUP", color: "#00d4ff" },
  { symbol: "PYTH", color: "#a78bfa" },
  { symbol: "RNDR", color: "#f97316" },
  { symbol: "RAY", color: "#00ff87" },
  { symbol: "FIDA", color: "#00d4ff" },
  { symbol: "MNGO", color: "#9d5fea" },
  { symbol: "SAMO", color: "#fbbf24" },
  { symbol: "MYRO", color: "#00d4ff" },
  { symbol: "SLERF", color: "#f97316" },
];

type FeedActionType = "tracking" | "added" | "dashboard" | "exported" | "whale";

const WHALE_AMOUNTS = [
  "7.2M",
  "8.5M",
  "9.1M",
  "11.4M",
  "14.2M",
  "7.8M",
  "10.3M",
  "12.6M",
];

interface FeedItem {
  id: number;
  action: FeedActionType;
  token: { symbol: string; color: string };
  whaleAmount?: string;
  createdAt: number;
}

let _feedIdCounter = 1000;
function makeFeedItem(): FeedItem {
  const actions: FeedActionType[] = [
    "tracking",
    "added",
    "dashboard",
    "exported",
    "whale",
  ];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const token = TOKEN_POOL[Math.floor(Math.random() * TOKEN_POOL.length)];
  const whaleAmount =
    action === "whale"
      ? WHALE_AMOUNTS[Math.floor(Math.random() * WHALE_AMOUNTS.length)]
      : undefined;
  return {
    id: _feedIdCounter++,
    action,
    token,
    whaleAmount,
    createdAt: Date.now(),
  };
}

function feedActionLabel(item: FeedItem): string {
  switch (item.action) {
    case "tracking":
      return `User started tracking ${item.token.symbol}`;
    case "added":
      return `New token added: ${item.token.symbol}`;
    case "dashboard":
      return `Dashboard activated for ${item.token.symbol}`;
    case "exported":
      return `Analytics report exported for ${item.token.symbol}`;
    case "whale":
      return `Whale verified with ${item.whaleAmount} ${item.token.symbol} tokens`;
  }
}

function feedActionColor(action: FeedActionType): string {
  switch (action) {
    case "tracking":
      return "#00d4ff";
    case "added":
      return "#9d5fea";
    case "dashboard":
      return "#00ff87";
    case "exported":
      return "#fbbf24";
    case "whale":
      return "#f97316";
  }
}

function FeedActionIcon({ action }: { action: FeedActionType }) {
  const color = feedActionColor(action);
  const cls = "w-3.5 h-3.5 flex-shrink-0";
  switch (action) {
    case "tracking":
      return <Activity className={cls} style={{ color }} />;
    case "added":
      return <Zap className={cls} style={{ color }} />;
    case "dashboard":
      return <LayoutDashboard className={cls} style={{ color }} />;
    case "exported":
      return <FileText className={cls} style={{ color }} />;
    case "whale":
      return <TrendingUp className={cls} style={{ color }} />;
  }
}

function relativeTimeShort(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

const MAX_FEED = 10;

function useActivityFeed() {
  const [items, setItems] = useState<FeedItem[]>(() => {
    const actions: FeedActionType[] = [
      "tracking",
      "added",
      "dashboard",
      "exported",
      "whale",
    ];
    return Array.from({ length: MAX_FEED }, (_, i) => ({
      id: _feedIdCounter++,
      action: actions[i % actions.length],
      token: TOKEN_POOL[i % TOKEN_POOL.length],
      whaleAmount:
        actions[i % actions.length] === "whale"
          ? WHALE_AMOUNTS[i % WHALE_AMOUNTS.length]
          : undefined,
      createdAt: Date.now() - (MAX_FEED - i) * 9000 - Math.random() * 4000,
    }));
  });

  const [tick, setTick] = useState(0);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 5000 + Math.random() * 10_000;
      timeout = setTimeout(() => {
        setItems((prev) => [makeFeedItem(), ...prev].slice(0, MAX_FEED));
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let rafId: number;
    let lastTime = 0;
    const loop = (time: number) => {
      if (time - lastTime > 1000) {
        lastTime = time;
        setTick((t) => t + 1);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const refresh = useCallback(() => {
    setItems(Array.from({ length: MAX_FEED }, () => makeFeedItem()));
  }, []);

  return { items, tick, refresh };
}

// ─── Recently Tracked Tokens ──────────────────────────────────────────────────

interface TrackedToken {
  symbol: string;
  name: string;
  trackedSinceMs: number;
  colorAccent: string;
  network: string;
}

const TRACKED_TOKENS: TrackedToken[] = [
  {
    symbol: "BONK",
    name: "Bonk",
    trackedSinceMs: Date.now() - 2 * 60_000,
    colorAccent: "#fbbf24",
    network: "SOL",
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    trackedSinceMs: Date.now() - 8 * 60_000,
    colorAccent: "#00d4ff",
    network: "SOL",
  },
  {
    symbol: "POPCAT",
    name: "Popcat",
    trackedSinceMs: Date.now() - 15 * 60_000,
    colorAccent: "#f97316",
    network: "SOL",
  },
  {
    symbol: "BOME",
    name: "Book of Meme",
    trackedSinceMs: Date.now() - 22 * 60_000,
    colorAccent: "#9d5fea",
    network: "SOL",
  },
  {
    symbol: "MEW",
    name: "cat in a dogs world",
    trackedSinceMs: Date.now() - 31 * 60_000,
    colorAccent: "#00ff87",
    network: "SOL",
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    trackedSinceMs: Date.now() - 44 * 60_000,
    colorAccent: "#00d4ff",
    network: "SOL",
  },
  {
    symbol: "PYTH",
    name: "Pyth Network",
    trackedSinceMs: Date.now() - 58 * 60_000,
    colorAccent: "#a78bfa",
    network: "SOL",
  },
  {
    symbol: "RAY",
    name: "Raydium",
    trackedSinceMs: Date.now() - 72 * 60_000,
    colorAccent: "#00ff87",
    network: "SOL",
  },
];

function trackedSinceLabel(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Discussion posts ──────────────────────────────────────────────────────────

const DISCUSSION_POSTS = [
  {
    username: "trader_x8f2",
    message:
      "BONK visibility score just hit 94% — anyone else seeing this spike? Dashboard showing strong early signals.",
    timeLabel: "3 min ago",
    upvotes: 18,
    avatarColor: "#00d4ff",
  },
  {
    username: "anon_sol_9k",
    message:
      "Activated tracking on a new launch this morning. The engagement analytics are incredibly detailed — way better than manually watching Dexscreener.",
    timeLabel: "12 min ago",
    upvotes: 11,
    avatarColor: "#9d5fea",
  },
  {
    username: "launch_watcher",
    message:
      "The export report feature saved me hours of manual tracking this week. CSV export works perfectly for my spreadsheet workflow.",
    timeLabel: "1 hr ago",
    upvotes: 27,
    avatarColor: "#00ff87",
  },
  {
    username: "defi_ana1yst",
    message:
      "Been using BY8 for 3 launches now. The visibility over time graph is the clearest signal I’ve found for gauging early traction.",
    timeLabel: "2 hr ago",
    upvotes: 34,
    avatarColor: "#fbbf24",
  },
];

const TRUST_BADGES_DATA = [
  {
    label: "Real users tracking tokens in real-time",
    color: "#00d4ff",
    icon: Users,
  },
  { label: "Community-driven insights", color: "#9d5fea", icon: BarChart2 },
  { label: "99.9% uptime", color: "#00ff87", icon: CheckCircle2 },
  { label: "Read-only platform", color: "#fbbf24", icon: ShieldCheck },
] as const;

// ─── TokenAvatar ────────────────────────────────────────────────────────────────

function TokenAvatar({
  symbol,
  color,
  size = 32,
}: { symbol: string; color: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = TOKEN_LOGOS[symbol.toUpperCase()];
  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={symbol}
        onError={() => setImgError(true)}
        className="rounded-full flex-shrink-0 object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold"
      style={{
        width: size,
        height: size,
        background: `${color}18`,
        border: `1px solid ${color}44`,
        color,
        fontSize: Math.max(9, size * 0.3),
        fontFamily: "JetBrains Mono, monospace",
      }}
    >
      {symbol.slice(0, 3)}
    </div>
  );
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

function CommunityHero() {
  const liveUsers = useDriftingCounter(780, 1140, 18_000, 8);
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className="text-center space-y-4 pt-2"
      data-ocid="community.hero.section"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold"
        style={{
          background: "rgba(0,212,255,0.08)",
          border: "1px solid rgba(0,212,255,0.25)",
          color: "#00d4ff",
        }}
        data-ocid="community.hero.live_badge"
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: "#00ff87",
            boxShadow: "0 0 6px #00ff87",
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
        />
        <motion.span
          key={liveUsers}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {liveUsers.toLocaleString()}
        </motion.span>{" "}
        users tracking right now
      </motion.div>

      <h1
        className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          letterSpacing: "-0.03em",
        }}
      >
        Track Tokens{" "}
        <span
          style={{
            background: "linear-gradient(135deg, #00d4ff 0%, #9d5fea 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Together
        </span>
      </h1>

      <p
        className="text-base max-w-lg mx-auto leading-relaxed"
        style={{ color: "#8892a4" }}
      >
        Real users tracking tokens in real-time. Community-driven analytics
        insights for smarter launch decisions.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
          style={{
            background: "rgba(0,212,255,0.06)",
            border: "1px solid rgba(0,212,255,0.2)",
            color: "#00d4ff",
            fontFamily: "Space Grotesk, sans-serif",
          }}
        >
          <Users className="w-3 h-3" />
          Real users tracking tokens in real-time
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold"
          style={{
            background: "rgba(157,95,234,0.06)",
            border: "1px solid rgba(157,95,234,0.2)",
            color: "#9d5fea",
            fontFamily: "Space Grotesk, sans-serif",
          }}
        >
          <BarChart2 className="w-3 h-3" />
          Community-driven analytics insights
        </div>
      </div>
    </motion.section>
  );
}

// ─── Trust Badge Row ──────────────────────────────────────────────────────────

function TrustBadgeRow() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.22, duration: 0.4 }}
      className="flex flex-wrap gap-2 items-center justify-center"
      data-ocid="community.trust_badges.section"
    >
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
        style={{
          background: "rgba(0,255,135,0.06)",
          border: "1px solid rgba(0,255,135,0.22)",
          color: "#00ff87",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{
            background: "#00ff87",
            boxShadow: "0 0 4px #00ff87",
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
        />
        LIVE
      </div>
      {TRUST_BADGES_DATA.map((badge) => {
        const Icon = badge.icon;
        return (
          <div
            key={badge.label}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]"
            style={{
              background: `${badge.color}08`,
              border: `1px solid ${badge.color}22`,
              color: badge.color,
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            <Icon className="w-2.5 h-2.5 flex-shrink-0" />
            {badge.label}
          </div>
        );
      })}
    </motion.section>
  );
}

// ─── Live Activity Feed ────────────────────────────────────────────────────────

function LiveActivityFeedSection() {
  const { items, tick, refresh } = useActivityFeed();
  void tick;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    haptic("tap");
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.26, duration: 0.4 }}
      data-ocid="community.activity_feed.section"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: "#00ff87",
              boxShadow: "0 0 4px #00ff87",
              animation: "pulse-glow 2s ease-in-out infinite",
            }}
          />
          <h2
            className="text-sm font-bold"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "#f0f4f8",
            }}
          >
            Live Activity
          </h2>
          <span
            className="text-[9px] uppercase tracking-widest hidden sm:block"
            style={{
              color: "#4a5568",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            real-time system log
          </span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold min-h-[36px]"
          style={{
            background: "rgba(0,212,255,0.08)",
            border: "1px solid rgba(0,212,255,0.2)",
            color: "#00d4ff",
            fontFamily: "JetBrains Mono, monospace",
          }}
          data-ocid="community.activity_feed.refresh_button"
          aria-label="Refresh activity feed"
        >
          <RefreshCw
            className="w-3 h-3"
            style={{
              animation: isRefreshing ? "spin 0.5s linear" : "none",
              willChange: "transform",
            }}
          />
          Refresh Feed
        </button>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "rgba(13,17,23,0.9)",
          border: "1px solid rgba(0,212,255,0.1)",
        }}
      >
        <AnimatePresence initial={false}>
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center gap-3 px-4 py-2.5 overflow-hidden"
              style={{
                borderBottom:
                  idx < items.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
              }}
              data-ocid={`community.activity_feed.item.${idx + 1}`}
            >
              <FeedActionIcon action={item.action} />
              <span
                className="flex-1 text-xs min-w-0"
                style={{
                  color: "#8892a4",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                {feedActionLabel(item)}
              </span>
              <span
                className="text-[10px] flex-shrink-0 tabular-nums"
                style={{
                  color: "#4a5568",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {relativeTimeShort(item.createdAt)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

// ─── Recently Tracked Tokens Section ─────────────────────────────────────────

function RecentlyTrackedSection() {
  const [pulsing, setPulsing] = useState(-1);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(
        () => {
          const idx = Math.floor(Math.random() * TRACKED_TOKENS.length);
          setPulsing(idx);
          setTimeout(() => setPulsing(-1), 1200);
          schedule();
        },
        6000 + Math.random() * 4000,
      );
    };
    schedule();
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      data-ocid="community.tracked_tokens.section"
    >
      <div className="mb-3">
        <h2
          className="text-sm font-bold"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: "#f0f4f8" }}
        >
          Recently Tracked Tokens
        </h2>
        <p className="text-[10px] mt-0.5" style={{ color: "#4a5568" }}>
          Community is actively monitoring these launches
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TRACKED_TOKENS.map((token, i) => {
          const isPulsing = pulsing === i;
          return (
            <motion.div
              key={token.symbol}
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: 1,
                y: 0,
                boxShadow: isPulsing
                  ? `0 0 16px ${token.colorAccent}44, 0 2px 8px rgba(0,0,0,0.4)`
                  : "0 2px 6px rgba(0,0,0,0.3)",
              }}
              transition={{
                opacity: { delay: i * 0.04, duration: 0.35 },
                y: { delay: i * 0.04, duration: 0.35 },
                boxShadow: { duration: 0.4 },
              }}
              className="p-3 rounded-xl"
              style={{
                background: isPulsing
                  ? `${token.colorAccent}0a`
                  : "rgba(13,17,23,0.85)",
                border: isPulsing
                  ? `1px solid ${token.colorAccent}40`
                  : "1px solid rgba(255,255,255,0.05)",
                transition: "background 0.4s, border-color 0.4s",
              }}
              data-ocid={`community.tracked_tokens.item.${i + 1}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <TokenAvatar
                  symbol={token.symbol}
                  color={token.colorAccent}
                  size={28}
                />
                <div className="min-w-0">
                  <div
                    className="font-bold text-xs leading-tight truncate"
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      color: token.colorAccent,
                    }}
                  >
                    {token.symbol}
                  </div>
                  <div
                    className="text-[9px] leading-tight truncate"
                    style={{ color: "#4a5568" }}
                  >
                    {token.name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: "rgba(0,212,255,0.08)",
                    border: "1px solid rgba(0,212,255,0.2)",
                    color: "#00d4ff",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {token.network}
                </span>
                <span
                  className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: `${token.colorAccent}14`,
                    border: `1px solid ${token.colorAccent}30`,
                    color: token.colorAccent,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  Tracking Active
                </span>
              </div>
              <div className="mt-1.5">
                <span className="text-[9px]" style={{ color: "#4a5568" }}>
                  {trackedSinceLabel(token.trackedSinceMs)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

// ─── Community Discussion ─────────────────────────────────────────────────────

function CommunityUpdatesSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.34, duration: 0.4 }}
      data-ocid="community.updates.section"
    >
      <div className="mb-3">
        <h2
          className="text-sm font-bold"
          style={{ fontFamily: "Space Grotesk, sans-serif", color: "#f0f4f8" }}
        >
          Community Discussion
        </h2>
        <p className="text-[10px] mt-0.5" style={{ color: "#4a5568" }}>
          Insights from active token trackers
        </p>
      </div>
      <div className="space-y-2">
        {DISCUSSION_POSTS.map((post, i) => (
          <motion.div
            key={post.username}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="flex gap-3 p-3.5 rounded-xl"
            style={{
              background: "rgba(13,17,23,0.85)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
            data-ocid={`community.updates.item.${i + 1}`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase"
              style={{
                background: `${post.avatarColor}18`,
                border: `1px solid ${post.avatarColor}40`,
                color: post.avatarColor,
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {post.username.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="text-[11px] font-semibold"
                  style={{
                    color: post.avatarColor,
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {post.username}
                </span>
                <span className="text-[9px]" style={{ color: "#4a5568" }}>
                  {post.timeLabel}
                </span>
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "#8892a4" }}
              >
                {post.message}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ThumbsUp
                  className="w-2.5 h-2.5"
                  style={{ color: "#4a5568" }}
                />
                <span
                  className="text-[9px]"
                  style={{
                    color: "#4a5568",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {post.upvotes}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

// ─── Discord CTA ─────────────────────────────────────────────────────────────

function DiscordCTASection() {
  const memberCount = useDriftingCounter(3_200, 4_800, 45_000, 25);
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38, duration: 0.4 }}
      data-ocid="community.discord_cta.section"
    >
      <div
        className="rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(13,17,23,0.98) 0%, rgba(88,28,135,0.12) 50%, rgba(13,17,23,0.98) 100%)",
          border: "1px solid rgba(157,95,234,0.25)",
          boxShadow:
            "0 0 40px rgba(157,95,234,0.06), 0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(157,95,234,0.08) 0%, transparent 70%)",
          }}
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.5,
            type: "spring",
            stiffness: 280,
            damping: 22,
          }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
          style={{
            background: "rgba(88,101,242,0.15)",
            border: "1px solid rgba(88,101,242,0.35)",
            boxShadow: "0 0 24px rgba(88,101,242,0.2)",
          }}
        >
          <SiDiscord className="w-8 h-8" style={{ color: "#5865F2" }} />
        </motion.div>
        <h2
          className="text-xl sm:text-2xl font-bold mb-2"
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            color: "#f0f4f8",
            letterSpacing: "-0.02em",
          }}
        >
          Join the BY8 Community
        </h2>
        <p
          className="text-sm mb-4 max-w-sm mx-auto"
          style={{ color: "#8892a4" }}
        >
          Connect with real token trackers, share insights, and get notified of
          major launch signals.
        </p>
        <div className="flex items-center justify-center gap-2 mb-5">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(88,101,242,0.1)",
              border: "1px solid rgba(88,101,242,0.25)",
              color: "#7289da",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background: "#00ff87",
                boxShadow: "0 0 4px #00ff87",
                animation: "pulse-glow 2s ease-in-out infinite",
              }}
            />
            <motion.span
              key={memberCount}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {memberCount.toLocaleString()}
            </motion.span>{" "}
            members online
          </div>
        </div>
        <motion.a
          href="https://discord.gg/DAAHMM4t"
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ y: -2, scale: 1.02 }}
          whileTap={{ y: 1, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm min-h-[52px]"
          style={{
            background:
              "linear-gradient(180deg, #6470f0 0%, #5865F2 50%, #4752d4 100%)",
            color: "#fff",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(88,101,242,0.45), 0 2px 6px rgba(0,0,0,0.4)",
            fontFamily: "Space Grotesk, sans-serif",
          }}
          onClick={() => haptic("confirm")}
          data-ocid="community.discord_cta.join_button"
        >
          <SiDiscord className="w-4 h-4" />
          Join Discord
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </motion.a>
        <p className="text-[10px] mt-3" style={{ color: "#4a5568" }}>
          Free to join · No wallet required
        </p>
      </div>
    </motion.section>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function detectLinkType(url: string): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes("discord")) return "Discord";
  if (lower.includes("t.me") || lower.includes("telegram")) return "Telegram";
  if (lower.includes("twitter.com") || lower.includes("x.com"))
    return "X / Twitter";
  if (lower.match(/^https?:\/\//)) return "Community Link";
  return null;
}

function isValidLink(url: string): boolean {
  const t = url.trim();
  return (
    t.startsWith("https://") ||
    t.startsWith("http://") ||
    t.startsWith("discord.gg/") ||
    t.startsWith("t.me/")
  );
}

function LiveCommBoostedNote() {
  const count = useDriftingCounter(45, 180, 20_000, 5);
  return (
    <div
      className="inline-flex items-center gap-1.5 text-xs"
      style={{ color: "#8892a4", fontFamily: "JetBrains Mono, monospace" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: "#00d4ff",
          boxShadow: "0 0 4px #00d4ff",
          animation: "pulse-glow 2s ease-in-out infinite",
        }}
      />
      <motion.span
        key={count}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {count}
      </motion.span>{" "}
      communities boosted today
    </div>
  );
}

function StepNumber({ n, done }: { n: number; done?: boolean }) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
      style={{
        background: done ? "#00d4ff" : "rgba(0,212,255,0.15)",
        border: done ? "none" : "1px solid rgba(0,212,255,0.4)",
        color: done ? "#080b12" : "#00d4ff",
        fontFamily: "JetBrains Mono, monospace",
      }}
    >
      {done ? <CheckCircle2 className="w-3 h-3" /> : n}
    </div>
  );
}

const DIVIDER = (
  <div
    style={{
      height: "1px",
      background:
        "linear-gradient(90deg, transparent, rgba(0,212,255,0.12), transparent)",
    }}
  />
);

export default function CommunityPage() {
  const [mode, setMode] = useState<BoosterMode>("dex");
  const [communityLink, setCommunityLink] = useState("");
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [boostSuccess, setBoostSuccess] = useState(false);
  const [confirmedTxHash, setConfirmedTxHash] = useState("");
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);
  const [txHashShake, setTxHashShake] = useState(false);

  const { data: solPrice } = useSolanaPrice();
  const { actor } = useActor(createActor);

  const selectedTierData = COMMUNITY_TIERS.find((t) => t.id === selectedTier);
  const linkType = detectLinkType(communityLink);
  const linkValid = isValidLink(communityLink);
  const isTxHashValid = txHash.trim().length >= MIN_TX_HASH_LENGTH;
  const canBoost = linkValid && !!selectedTier && isTxHashValid;

  const linkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const txDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tgNotifyLink = useCallback(
    (link: string) => {
      actor
        ?.notifyCaPasted(`[Community Link] ${link}`)
        .catch((e: unknown) => console.error("[Telegram] notifyCaPasted:", e));
    },
    [actor],
  );
  const tgNotifyPackage = useCallback(
    (name: string, sol: number) => {
      actor
        ?.notifyPackageSelected(name, String(sol))
        .catch((e: unknown) =>
          console.error("[Telegram] notifyPackageSelected:", e),
        );
    },
    [actor],
  );
  const tgNotifyTxHash = useCallback(
    (hash: string, link: string) => {
      actor
        ?.notifyTxHashEntered(hash, link)
        .catch((e: unknown) =>
          console.error("[Telegram] notifyTxHashEntered:", e),
        );
    },
    [actor],
  );
  const tgNotifyBoostSubmitted = useCallback(
    (link: string, name: string, sol: number, hash: string) => {
      actor
        ?.notifyBoostSubmitted(`[Community] ${link}`, name, String(sol), hash)
        .catch((e: unknown) =>
          console.error("[Telegram] notifyBoostSubmitted:", e),
        );
    },
    [actor],
  );

  const handleLinkChange = useCallback(
    (value: string) => {
      setCommunityLink(value);
      haptic("tap");
      if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
      const trimmed = value.trim();
      if (isValidLink(trimmed) && trimmed.length >= 10) {
        haptic("select");
        linkDebounceRef.current = setTimeout(() => tgNotifyLink(trimmed), 1500);
      }
    },
    [tgNotifyLink],
  );

  const handlePasteLink = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleLinkChange(text.trim());
      haptic("tap");
    } catch {}
  }, [handleLinkChange]);
  const handlePasteTx = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTxHash(text.trim());
      haptic("tap");
    } catch {}
  }, []);

  const handleTierSelect = useCallback(
    (tierId: string) => {
      setSelectedTier(tierId);
      hapticChain("select", "confirm", 50);
      const tier = COMMUNITY_TIERS.find((t) => t.id === tierId);
      if (tier) tgNotifyPackage(tier.name, tier.sol);
    },
    [tgNotifyPackage],
  );

  const handleTxHashChange = useCallback(
    (value: string) => {
      setTxHash(value);
      haptic("tap");
      if (txDebounceRef.current) clearTimeout(txDebounceRef.current);
      const trimmed = value.trim();
      if (trimmed.length > 0 && trimmed.length < 8) {
        haptic("error");
        setTxHashShake(true);
        setTimeout(() => setTxHashShake(false), 450);
      }
      if (trimmed.length >= MIN_TX_HASH_LENGTH) {
        txDebounceRef.current = setTimeout(
          () => tgNotifyTxHash(trimmed, communityLink.trim()),
          1500,
        );
      }
    },
    [tgNotifyTxHash, communityLink],
  );

  const handleBoost = useCallback(async () => {
    if (!canBoost) return;
    hapticChain("confirm", "success", 80);
    setConfirmedTxHash(txHash.trim());
    setBoostSuccess(true);
    tgNotifyBoostSubmitted(
      communityLink.trim(),
      selectedTierData?.name ?? "",
      selectedTierData?.sol ?? 0,
      txHash.trim(),
    );
  }, [
    canBoost,
    txHash,
    communityLink,
    selectedTierData,
    tgNotifyBoostSubmitted,
  ]);

  const handleReset = useCallback(() => {
    haptic("tap");
    setCommunityLink("");
    setSelectedTier(null);
    setTxHash("");
    setBoostSuccess(false);
    setConfirmedTxHash("");
  }, []);
  const handleCopyWallet = useCallback(() => {
    navigator.clipboard.writeText(BOOST_WALLET_ADDRESS).then(() => {
      haptic("copy");
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
      toast.success("Wallet address copied!");
    });
  }, []);
  const handleCopyTxHash = useCallback(() => {
    navigator.clipboard.writeText(confirmedTxHash).then(() => {
      haptic("copy");
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    });
  }, [confirmedTxHash]);

  const selectedUsd =
    selectedTierData && solPrice
      ? `$${(selectedTierData.sol * solPrice).toFixed(2)}`
      : null;
  const features = mode === "dex" ? DEX_FEATURES : PUMPFUN_FEATURES;

  return (
    <div
      className="min-h-screen pb-20"
      style={{ background: "#080b12" }}
      onPointerDown={() => primeHaptics()}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% -10%, rgba(0,212,255,0.05) 0%, transparent 60%)",
          zIndex: 0,
        }}
      />

      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{
          background: "rgba(8, 11, 18, 0.94)",
          borderBottom: "1px solid rgba(157, 95, 234, 0.18)",
          boxShadow:
            "0 1px 0 rgba(157,95,234,0.06), 0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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
                Community<span style={{ color: "#00d4ff" }}> Hub</span>
              </span>
              <span
                className="text-[10px] hidden sm:block"
                style={{
                  color: "#4a5568",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                Real Users · Live Analytics
              </span>
            </div>
          </div>
          <a
            href="https://discord.gg/DAAHMM4t"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{
              background: "rgba(88,101,242,0.1)",
              border: "1px solid rgba(88,101,242,0.25)",
              color: "#7289da",
              fontFamily: "Space Grotesk, sans-serif",
            }}
            data-ocid="community.header.discord_link"
          >
            <SiDiscord className="w-3.5 h-3.5" />
            Discord
          </a>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <CommunityHero />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <LiveTickerFade />
        </motion.div>
        <TrustBadgeRow />
        {DIVIDER}
        <LiveActivityFeedSection />
        <RecentlyTrackedSection />
        <CommunityUpdatesSection />
        <DiscordCTASection />
        <div
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(157,95,234,0.15), transparent)",
          }}
        />

        {/* ── Feature highlights ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="grid grid-cols-3 gap-2.5"
          data-ocid="community.feature_highlights"
        >
          {FEATURE_HIGHLIGHTS.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{
                  background: "rgba(13,17,23,0.8)",
                  border: `1px solid ${feat.color}1a`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${feat.color}12`,
                    border: `1px solid ${feat.color}22`,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: feat.color }} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-bold leading-tight"
                    style={{
                      color: "#f0f4f8",
                      fontFamily: "Space Grotesk, sans-serif",
                    }}
                  >
                    {feat.title}
                  </p>
                  <p
                    className="text-[10px] leading-tight mt-0.5"
                    style={{ color: "#4a5568" }}
                  >
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Stats strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center justify-between gap-3 flex-wrap"
          data-ocid="community.stats_strip"
        >
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{
              background: "rgba(0,212,255,0.05)",
              border: "1px solid rgba(0,212,255,0.15)",
            }}
          >
            <Users className="w-3 h-3" style={{ color: "#00d4ff" }} />
            <span
              className="text-sm font-bold"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                color: "#f0f4f8",
              }}
            >
              847
            </span>
            <span className="text-[10px]" style={{ color: "#4a5568" }}>
              communities boosted
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{
              background: "rgba(0,255,135,0.05)",
              border: "1px solid rgba(0,255,135,0.15)",
            }}
          >
            <BarChart2 className="w-3 h-3" style={{ color: "#00ff87" }} />
            <span
              className="text-sm font-bold"
              style={{
                fontFamily: "JetBrains Mono, monospace",
                color: "#00ff87",
              }}
            >
              2.4M SOL
            </span>
            <span className="text-[10px]" style={{ color: "#4a5568" }}>
              volume delivered
            </span>
          </div>
          <LiveCommBoostedNote />
        </motion.div>

        {DIVIDER}

        {/* ── Mode toggle ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          data-ocid="community.mode_section"
        >
          <p
            className="text-[9px] uppercase tracking-widest mb-3 font-semibold"
            style={{
              color: "#4a5568",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            Select Booster Type
          </p>
          <div
            className="inline-flex rounded-full p-0.5"
            style={{
              background: "rgba(13,17,23,0.8)",
              border: "1px solid rgba(157,95,234,0.3)",
            }}
          >
            {(["dex", "pumpfun"] as BoosterMode[]).map((m) => {
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    haptic("select");
                  }}
                  className="flex items-center gap-2 rounded-full transition-all duration-150 min-h-[44px]"
                  style={
                    isActive
                      ? {
                          background:
                            "linear-gradient(180deg, rgba(0,212,255,0.22) 0%, rgba(157,95,234,0.18) 100%)",
                          border: "1px solid rgba(0,212,255,0.45)",
                          color: "#00d4ff",
                          padding: "8px 20px",
                          fontWeight: 700,
                          fontSize: "13px",
                          fontFamily: "Space Grotesk, sans-serif",
                        }
                      : {
                          background: "transparent",
                          border: "1px solid transparent",
                          color: "#4a5568",
                          padding: "8px 20px",
                          fontWeight: 500,
                          fontSize: "13px",
                          fontFamily: "Space Grotesk, sans-serif",
                        }
                  }
                  data-ocid={`community.mode_toggle.${m}`}
                  aria-pressed={isActive}
                >
                  {m === "dex" ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <Flame className="w-3.5 h-3.5" />
                  )}
                  {m === "dex" ? "DEX Booster" : "pump.fun Booster"}
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-3 max-w-2xl p-3 rounded-xl"
              style={{
                background: "rgba(0,212,255,0.04)",
                border: "1px solid rgba(0,212,255,0.08)",
              }}
            >
              <p className="text-sm" style={{ color: "#8892a4" }}>
                {mode === "dex" ? (
                  <>
                    <span style={{ color: "#00d4ff", fontWeight: 600 }}>
                      DEX Booster
                    </span>{" "}
                    drives organic volume across Raydium, Orca, and Jupiter.
                    Real community wallets execute natural buy patterns that
                    signal genuine market interest.
                  </>
                ) : (
                  <>
                    <span style={{ color: "#00d4ff", fontWeight: 600 }}>
                      pump.fun Booster
                    </span>{" "}
                    pushes your token up the trending page with real community
                    voters and authentic engagement — not farms, not scripts.
                  </>
                )}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.section>

        <AnimatePresence mode="wait">
          <motion.section
            key={mode}
            initial={{ opacity: 0, x: mode === "dex" ? -12 : 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="max-w-2xl"
            data-ocid="community.features.section"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {features.map((feat, i) => (
                <motion.div
                  key={feat}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 p-2.5 rounded-lg"
                  style={{
                    background: "rgba(13,17,23,0.7)",
                    border: "1px solid rgba(0,255,135,0.06)",
                  }}
                >
                  <CheckCircle2
                    className="w-3 h-3 mt-0.5 flex-shrink-0"
                    style={{ color: "#00ff87" }}
                  />
                  <span className="text-xs" style={{ color: "#8892a4" }}>
                    {feat}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </AnimatePresence>

        {DIVIDER}

        {/* Step 1 */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          data-ocid="community.link_input.section"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <StepNumber n={1} done={linkValid} />
            <h2
              className="text-base font-semibold"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                color: "#f0f4f8",
              }}
            >
              Enter Community Link
            </h2>
          </div>
          <Card
            className="max-w-2xl"
            style={{
              background: "rgba(13, 17, 23, 0.95)",
              border: linkValid
                ? "1px solid rgba(0,212,255,0.2)"
                : "1px solid rgba(0,212,255,0.08)",
              transition: "border-color 200ms",
            }}
            data-ocid="community.link_input.card"
          >
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2">
                <Label
                  htmlFor="community-link-input"
                  className="text-xs font-medium"
                  style={{ color: "#8892a4" }}
                >
                  Community Link
                </Label>
                <div className="relative">
                  <div
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "#4a5568" }}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="community-link-input"
                    type="url"
                    placeholder="Paste your Discord or community link..."
                    value={communityLink}
                    onChange={(e) => handleLinkChange(e.target.value)}
                    className="input-neon w-full h-11 rounded-lg pl-9 pr-28 text-sm"
                    autoComplete="off"
                    spellCheck={false}
                    style={
                      linkValid
                        ? { borderColor: "rgba(0,212,255,0.4)" }
                        : undefined
                    }
                    data-ocid="community.link.input"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {communityLink && (
                      <button
                        type="button"
                        onClick={() => {
                          setCommunityLink("");
                          haptic("tap");
                        }}
                        className="p-1 rounded"
                        style={{ color: "#4a5568" }}
                        aria-label="Clear"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <AnimatePresence>
                      {linkType ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap"
                          style={{
                            background: "rgba(0,212,255,0.1)",
                            border: "1px solid rgba(0,212,255,0.3)",
                            color: "#00d4ff",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          <CheckCircle2 className="w-2 h-2 flex-shrink-0" />
                          {linkType}
                        </motion.div>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePasteLink}
                          className="h-7 px-2 rounded-md text-[10px] font-semibold"
                          style={{
                            background:
                              "linear-gradient(180deg, rgba(0,212,255,0.14) 0%, rgba(0,212,255,0.07) 100%)",
                            border: "1px solid rgba(0,212,255,0.28)",
                            color: "#00d4ff",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                          data-ocid="community.link.paste_button"
                        >
                          PASTE
                        </button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {communityLink.length > 0 && !linkValid ? (
                    <motion.p
                      key="error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px]"
                      style={{ color: "#ff4d6d" }}
                      data-ocid="community.link.field_error"
                    >
                      Please enter a valid URL (starts with https://,
                      discord.gg/ or t.me/)
                    </motion.p>
                  ) : linkValid ? (
                    <motion.p
                      key="valid"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] flex items-center gap-1"
                      style={{ color: "#00d4ff" }}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Link detected — ready to boost
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>
              <div
                className="flex items-start gap-2.5 p-2.5 rounded-lg"
                style={{
                  background: "rgba(0,212,255,0.05)",
                  border: "1px solid rgba(0,212,255,0.1)",
                }}
              >
                <MessageCircle
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                  style={{ color: "#00d4ff" }}
                />
                <p
                  className="text-[10px] leading-relaxed"
                  style={{ color: "#8892a4" }}
                >
                  We'll organically grow your community — no bots, just real
                  engaged members. Your link is used to direct authentic
                  community members to your project.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {DIVIDER}

        {/* Step 2 */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          data-ocid="community.pricing.section"
        >
          <div className="flex items-center gap-2.5 mb-3">
            <StepNumber n={2} done={!!selectedTier} />
            <div>
              <h2
                className="text-base font-semibold"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  color: "#f0f4f8",
                }}
              >
                Select Boost Package
              </h2>
              <p className="text-[10px] mt-0.5" style={{ color: "#4a5568" }}>
                Choose how many community members to reach
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {COMMUNITY_TIERS.map((tier, i) => {
              const isSelected = selectedTier === tier.id;
              const usd = solPrice
                ? `≈$${(tier.sol * solPrice).toFixed(0)}`
                : null;
              return (
                <motion.button
                  key={tier.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 2, scale: 0.98 }}
                  onClick={() => handleTierSelect(tier.id)}
                  className="relative p-3.5 rounded-xl text-left overflow-hidden min-h-[44px]"
                  style={
                    isSelected
                      ? {
                          background: tier.glow,
                          border: `1.5px solid ${tier.color}55`,
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 18px ${tier.glow}, 0 4px 12px rgba(0,0,0,0.5)`,
                        }
                      : {
                          background:
                            "linear-gradient(180deg, rgba(18,22,30,0.9) 0%, rgba(13,17,23,0.8) 100%)",
                          border: "1px solid rgba(255,255,255,0.05)",
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 6px rgba(0,0,0,0.4)",
                        }
                  }
                  data-ocid={`community.tier.item.${i + 1}`}
                  aria-pressed={isSelected}
                >
                  {tier.badge && (
                    <div
                      className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider"
                      style={{
                        background: `${tier.color}22`,
                        border: `1px solid ${tier.color}44`,
                        color: tier.color,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {tier.badge}
                    </div>
                  )}
                  <div className="text-lg mb-1.5 leading-none">{tier.icon}</div>
                  <div
                    className="font-bold text-xs mb-1"
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      color: isSelected ? tier.color : "#f0f4f8",
                    }}
                  >
                    {tier.name}
                  </div>
                  <div
                    className="font-bold mb-1.5"
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      color: isSelected ? tier.color : "#8892a4",
                      fontSize: "16px",
                    }}
                  >
                    {tier.sol} SOL
                    {usd && (
                      <span
                        className="text-[10px] font-normal ml-1"
                        style={{ color: "#4a5568" }}
                      >
                        {usd}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div
                      className="text-[10px] font-semibold"
                      style={{ color: isSelected ? tier.color : "#4a5568" }}
                    >
                      <Users className="w-2.5 h-2.5 inline mr-0.5" />
                      {tier.members}
                    </div>
                    <div className="text-[10px]" style={{ color: "#4a5568" }}>
                      {tier.duration}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {DIVIDER}

        {/* Step 3 */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          data-ocid="community.confirm.section"
          className="pb-12"
        >
          <div className="flex items-center gap-2.5 mb-4">
            <StepNumber n={3} />
            <h2
              className="text-base font-semibold"
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                color: "#f0f4f8",
              }}
            >
              Complete Your Boost
            </h2>
          </div>
          <AnimatePresence mode="wait">
            {boostSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.88, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -20 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="max-w-lg mx-auto"
              >
                <Card
                  data-ocid="community.boost_success.card"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(13,17,23,0.98), rgba(0,212,255,0.04))",
                    border: "1px solid rgba(0, 212, 255, 0.3)",
                    boxShadow: "0 0 40px rgba(0,212,255,0.1)",
                  }}
                >
                  <CardContent className="p-6 text-center space-y-5">
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
                        className="w-16 h-16 rounded-full flex items-center justify-center relative"
                        style={{
                          background: "rgba(0, 212, 255, 0.1)",
                          border: "2px solid rgba(0, 212, 255, 0.4)",
                          boxShadow: "0 0 24px rgba(0,212,255,0.2)",
                        }}
                      >
                        <Users
                          className="w-8 h-8"
                          style={{
                            color: "#00d4ff",
                            filter: "drop-shadow(0 0 6px #00d4ff)",
                          }}
                        />
                        {[0.3, 0.5].map((delay) => (
                          <motion.div
                            key={delay}
                            className="absolute inset-0 rounded-full"
                            animate={{
                              scale: [1, 1.7, 1.7],
                              opacity: [0.35, 0, 0],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Number.POSITIVE_INFINITY,
                              delay,
                            }}
                            style={{ border: "1px solid rgba(0,212,255,0.4)" }}
                          />
                        ))}
                      </div>
                    </motion.div>
                    <div className="space-y-1">
                      <h3
                        className="text-xl font-bold"
                        style={{
                          fontFamily: "Space Grotesk, sans-serif",
                          color: "#f0f4f8",
                        }}
                      >
                        Community Boost Live! 🌱
                      </h3>
                      <p style={{ color: "#8892a4" }} className="text-sm">
                        Your community boost is live! Organic growth starting in
                        15–30 minutes.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-left">
                      {[
                        {
                          label: "Package",
                          value: selectedTierData?.name ?? "—",
                          mono: false,
                          color: "#f0f4f8",
                        },
                        {
                          label: "Amount",
                          value: `${selectedTierData?.sol ?? "—"} SOL`,
                          mono: true,
                          color: "#00d4ff",
                        },
                      ].map(({ label, value, mono, color }) => (
                        <div
                          key={label}
                          className="p-3 rounded-lg"
                          style={{
                            background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(0,212,255,0.1)",
                          }}
                        >
                          <p
                            className="text-[9px] uppercase tracking-widest mb-1"
                            style={{ color: "#4a5568" }}
                          >
                            {label}
                          </p>
                          <p
                            className="font-bold text-sm"
                            style={{
                              color,
                              fontFamily: mono
                                ? "JetBrains Mono, monospace"
                                : "Space Grotesk, sans-serif",
                            }}
                          >
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div
                      className="p-3 rounded-lg text-left space-y-1.5"
                      style={{
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(0,212,255,0.08)",
                      }}
                    >
                      <p
                        className="text-[9px] uppercase tracking-widest"
                        style={{ color: "#4a5568" }}
                      >
                        Transaction Hash
                      </p>
                      <div className="flex items-center gap-2">
                        <p
                          className="text-xs flex-1 break-all font-mono"
                          style={{ color: "#8892a4" }}
                          data-ocid="community.boost_success.tx_hash"
                        >
                          {confirmedTxHash}
                        </p>
                        <button
                          type="button"
                          onClick={handleCopyTxHash}
                          className="flex-shrink-0 p-1.5 rounded"
                          style={{ color: copiedTx ? "#00d4ff" : "#4a5568" }}
                          aria-label="Copy TX hash"
                        >
                          {copiedTx ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <ClipboardCopy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="pt-1">
                      <p
                        className="text-[10px] mb-3"
                        style={{ color: "#4a5568" }}
                      >
                        🌱 Organic growth activates within 15–30 minutes
                      </p>
                      <motion.button
                        type="button"
                        whileTap={{ y: 2, scale: 0.98 }}
                        transition={{
                          type: "spring",
                          stiffness: 600,
                          damping: 35,
                        }}
                        onClick={handleReset}
                        className="w-full py-3 rounded-lg font-bold text-sm min-h-[44px]"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(0,212,255,0.12) 0%, rgba(0,212,255,0.06) 100%)",
                          border: "1px solid rgba(0,212,255,0.35)",
                          color: "#00d4ff",
                        }}
                        data-ocid="community.boost_success.reset_button"
                      >
                        <Users className="w-4 h-4 inline mr-2" />
                        Boost Another Community
                      </motion.button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="order"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-lg mx-auto space-y-3"
              >
                <Card
                  style={{
                    background: "rgba(13,17,23,0.95)",
                    border: "1px solid rgba(0,212,255,0.08)",
                  }}
                  data-ocid="community.order_summary.card"
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle
                      style={{
                        fontFamily: "Space Grotesk, sans-serif",
                        color: "#4a5568",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontSize: "10px",
                      }}
                    >
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 pb-4 px-4">
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-xs" style={{ color: "#4a5568" }}>
                        Community
                      </span>
                      <span
                        className="truncate max-w-[200px] text-[11px]"
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          color: "#8892a4",
                        }}
                      >
                        {communityLink.trim() ? (
                          communityLink.trim().length > 30 ? (
                            `${communityLink.trim().slice(0, 30)}…`
                          ) : (
                            communityLink.trim()
                          )
                        ) : (
                          <span style={{ color: "#4a5568" }}>Not entered</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-xs" style={{ color: "#4a5568" }}>
                        Package
                      </span>
                      <span
                        className="text-xs"
                        style={{
                          color: selectedTierData ? "#f0f4f8" : "#4a5568",
                        }}
                      >
                        {selectedTierData
                          ? selectedTierData.name
                          : "Not selected"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: "#4a5568" }}>
                        Amount
                      </span>
                      <div className="text-right">
                        <div
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            color: selectedTierData ? "#00d4ff" : "#4a5568",
                            fontSize: "16px",
                            fontWeight: 700,
                          }}
                        >
                          {selectedTierData
                            ? `${selectedTierData.sol} SOL`
                            : "—"}
                        </div>
                        {selectedUsd && (
                          <div
                            className="text-[10px]"
                            style={{
                              color: "#4a5568",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            ≈ {selectedUsd}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "transition-opacity duration-300",
                    !linkValid || !selectedTier
                      ? "opacity-40 pointer-events-none"
                      : "",
                  )}
                  style={{
                    background: "rgba(13,17,23,0.95)",
                    border: "1px solid rgba(0,212,255,0.08)",
                  }}
                  data-ocid="community.payment_instructions.card"
                >
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: "rgba(0,212,255,0.1)",
                          border: "1px solid rgba(0,212,255,0.2)",
                        }}
                      >
                        <Wallet
                          className="w-3.5 h-3.5"
                          style={{ color: "#00d4ff" }}
                        />
                      </div>
                      <div>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "#f0f4f8" }}
                        >
                          Send exactly{" "}
                          <span
                            style={{
                              color: "#00d4ff",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {selectedTierData
                              ? `${selectedTierData.sol} SOL`
                              : "— SOL"}
                          </span>{" "}
                          to the address below
                        </p>
                        <p
                          className="text-[10px] mt-0.5"
                          style={{ color: "#4a5568" }}
                        >
                          Then paste your transaction hash to start the
                          community boost.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label
                        className="text-[9px] uppercase tracking-widest"
                        style={{ color: "#4a5568" }}
                      >
                        Destination Wallet
                      </Label>
                      <div
                        className="flex items-center gap-2 rounded-lg px-3 py-2"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(0,212,255,0.1)",
                        }}
                      >
                        <span
                          className="text-[11px] flex-1 break-all select-all"
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            color: "#8892a4",
                          }}
                          data-ocid="community.wallet_address.display"
                        >
                          {BOOST_WALLET_ADDRESS}
                        </span>
                        <button
                          type="button"
                          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded min-w-[28px]"
                          style={{
                            color: copiedWallet ? "#00d4ff" : "#4a5568",
                          }}
                          onClick={handleCopyWallet}
                          aria-label="Copy wallet address"
                          data-ocid="community.wallet_address.copy_button"
                        >
                          {copiedWallet ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <ClipboardCopy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        height: "1px",
                        background: "rgba(0,212,255,0.07)",
                      }}
                    />
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="community-tx-hash-input"
                        className="text-xs font-medium"
                        style={{ color: "#8892a4" }}
                      >
                        Transaction Hash{" "}
                        <span style={{ color: "#ff4d6d" }}>*</span>
                      </Label>
                      <div className="relative">
                        <input
                          id="community-tx-hash-input"
                          type="text"
                          placeholder="Paste TX hash after sending..."
                          value={txHash}
                          onChange={(e) => handleTxHashChange(e.target.value)}
                          className={cn(
                            "input-neon w-full h-11 rounded-lg px-3 pr-20 text-sm",
                            txHashShake && "input-shake",
                          )}
                          autoComplete="off"
                          spellCheck={false}
                          style={
                            isTxHashValid
                              ? { borderColor: "rgba(0,212,255,0.4)" }
                              : undefined
                          }
                          data-ocid="community.tx_hash.input"
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
                                "linear-gradient(180deg, rgba(0,212,255,0.14) 0%, rgba(0,212,255,0.07) 100%)",
                              border: "1px solid rgba(0,212,255,0.28)",
                              color: "#00d4ff",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                            data-ocid="community.tx_hash.paste_button"
                          >
                            PASTE
                          </button>
                        </div>
                      </div>
                      <AnimatePresence mode="wait">
                        {txHash.length > 0 && !isTxHashValid ? (
                          <motion.p
                            key="error"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px]"
                            style={{ color: "#ff4d6d" }}
                            data-ocid="community.tx_hash.field_error"
                          >
                            TX hash must be at least {MIN_TX_HASH_LENGTH} chars
                          </motion.p>
                        ) : isTxHashValid ? (
                          <motion.p
                            key="valid"
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="text-[10px] flex items-center gap-1"
                            style={{ color: "#00d4ff" }}
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Transaction hash looks valid
                          </motion.p>
                        ) : null}
                      </AnimatePresence>
                    </div>
                    <motion.div
                      whileTap={canBoost ? { y: 2, scale: 0.99 } : {}}
                      transition={{
                        type: "spring",
                        stiffness: 600,
                        damping: 35,
                      }}
                    >
                      <button
                        type="button"
                        className="w-full py-3.5 rounded-lg font-bold text-sm tracking-wide flex items-center justify-center gap-2 relative overflow-hidden min-h-[52px]"
                        style={
                          canBoost
                            ? {
                                background:
                                  "linear-gradient(180deg, #1ae8ff 0%, #00ccee 45%, #00aad4 100%)",
                                color: "#080b12",
                                boxShadow:
                                  "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(0,212,255,0.45)",
                              }
                            : {
                                background: "rgba(13,17,23,0.8)",
                                color: "#4a5568",
                                border: "1px solid rgba(255,255,255,0.05)",
                                cursor: "not-allowed",
                              }
                        }
                        onClick={handleBoost}
                        disabled={!canBoost}
                        data-ocid="community.confirm.submit_button"
                      >
                        {canBoost && (
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
                        <Users className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">
                          🌱 Start Community Boost
                        </span>
                      </button>
                    </motion.div>
                    {!canBoost && (
                      <p
                        className="text-center text-[10px]"
                        style={{ color: "#4a5568" }}
                        data-ocid="community.confirm.error_state"
                      >
                        {!linkValid
                          ? "Enter your community link in Step 1"
                          : !selectedTier
                            ? "Choose a boost package in Step 2"
                            : "Paste your transaction hash above to continue"}
                      </p>
                    )}
                    {canBoost && (
                      <p
                        className="text-center text-[10px]"
                        style={{ color: "#4a5568" }}
                      >
                        🌱 Organic growth activates within 15–30 minutes
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-3">
                      <div
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                        style={{
                          background: "rgba(0,255,135,0.06)",
                          border: "1px solid rgba(0,255,135,0.15)",
                          color: "#00ff87",
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Zero Bots Guaranteed
                      </div>
                      <a
                        href="https://discord.gg/DAAHMM4t"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px]"
                        style={{ color: "#4a5568" }}
                        data-ocid="community.discord_link"
                      >
                        Community <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </main>

      <BottomNav />
    </div>
  );
}
