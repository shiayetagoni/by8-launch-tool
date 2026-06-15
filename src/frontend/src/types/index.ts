/**
 * BY8 Launch Tool — Shared TypeScript Types
 * Mirrors the Motoko backend types from backend.d.ts
 */

// Re-export generated backend types for convenience
export type {
  TokenMetadata,
  BoostRecord,
  WhaleSnapshot,
  WhaleStats,
  AnalyticsResult,
  LeaderboardEntry,
  WalletStats,
} from "@/backend.d";

// ── Chain / Multi-chain types ──────────────────────────────────────────────────

export type ChainName =
  | "solana"
  | "ethereum"
  | "base"
  | "bsc"
  | "polygon"
  | "arbitrum"
  | "avalanche";

export interface ChainConfig {
  name: ChainName;
  id: number;
  displayName: string;
  icon: string;
  platforms: string[];
  explorerUrl: string;
  rpcUrl?: string;
}

export const CHAIN_CONFIGS: ChainConfig[] = [
  {
    name: "solana",
    id: 101,
    displayName: "Solana",
    icon: "☉",
    platforms: ["Pump.fun", "Raydium", "Jupiter", "Orca"],
    explorerUrl: "https://solscan.io/token/",
  },
  {
    name: "ethereum",
    id: 1,
    displayName: "Ethereum",
    icon: "◈",
    platforms: ["Uniswap", "SushiSwap", "1inch"],
    explorerUrl: "https://etherscan.io/token/",
  },
  {
    name: "base",
    id: 8453,
    displayName: "Base",
    icon: "◉",
    platforms: ["BaseSwap", "Aerodrome", "Uniswap V3"],
    explorerUrl: "https://basescan.org/token/",
  },
  {
    name: "bsc",
    id: 56,
    displayName: "BSC",
    icon: "◎",
    platforms: ["PancakeSwap", "Biswap", "ApeSwap"],
    explorerUrl: "https://bscscan.com/token/",
  },
  {
    name: "polygon",
    id: 137,
    displayName: "Polygon",
    icon: "◊",
    platforms: ["QuickSwap", "Uniswap V3", "SushiSwap"],
    explorerUrl: "https://polygonscan.com/token/",
  },
  {
    name: "arbitrum",
    id: 42161,
    displayName: "Arbitrum",
    icon: "◇",
    platforms: ["Camelot", "Uniswap V3", "SushiSwap"],
    explorerUrl: "https://arbiscan.io/token/",
  },
  {
    name: "avalanche",
    id: 43114,
    displayName: "Avalanche",
    icon: "△",
    platforms: ["Trader Joe", "Pangolin", "Platypus"],
    explorerUrl: "https://snowtrace.io/token/",
  },
];

export function getChainConfig(name: ChainName): ChainConfig | undefined {
  return CHAIN_CONFIGS.find((c) => c.name === name);
}

export function getNetworkBadge(chain: string): string {
  const cfg = CHAIN_CONFIGS.find(
    (c) =>
      c.name === chain || c.displayName.toLowerCase() === chain.toLowerCase(),
  );
  return cfg?.displayName ?? "Unknown";
}

// ── Unified TokenData (multi-chain) ───────────────────────────────────────────

export interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: bigint;
  description?: string;
  imageUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  chain: ChainName;
  chainId: number;
  networkBadge: string;
  ca: string;
  fetchedVia?: string;
}

// ── Launch Form types ──────────────────────────────────────────────────────────

export type LaunchStep =
  | "chain-select"
  | "token-info"
  | "ca-verify"
  | "allocation"
  | "launch-type"
  | "timeline"
  | "review"
  | "payment";

export const LAUNCH_STEP_ORDER: LaunchStep[] = [
  "chain-select",
  "token-info",
  "ca-verify",
  "allocation",
  "launch-type",
  "timeline",
  "review",
  "payment",
];

export interface AllocationBreakdown {
  marketing: number;
  team: number;
  liquidity: number;
  community: number;
  reserve: number;
}

export interface LaunchFormData {
  step: LaunchStep;
  stepIndex: number;
  chain: ChainName | null;
  platform: string | null;
  tokenName: string;
  tokenSymbol: string;
  ca: string;
  tokenMeta: TokenData | null;
  supply: string;
  decimals: number;
  description: string;
  allocation: AllocationBreakdown;
  launchType: "fair-launch" | "presale" | "stealth" | "liquidity-first" | "";
  timeline: string;
  paymentTxHash: string;
  paymentWallet: string;
}

export interface FeeEstimate {
  chain: ChainName;
  token: string;
  amount: number;
  usdValue: number;
  currency: string;
}

// ── Legacy UI types ────────────────────────────────────────────────────────────

export type Goal = "visibility" | "engagement" | "community";

export type LaunchTimelineLegacy =
  | "Already launched"
  | "Next week"
  | "Next 24 hrs or sooner"
  | "I don't know";

export type LaunchTimeline = LaunchTimelineLegacy;

export type PathChoice = "token" | "community";

export type TrackingWindow = "24h" | "7d" | "30d";

export type FetchStatus = "idle" | "loading" | "success" | "error";

export type FetchStage =
  | "idle"
  | "solscan"
  | "jupiter"
  | "dexscreener"
  | "direct-jupiter"
  | "direct-dexscreener"
  | "solana-rpc"
  | "etherscan"
  | "bscscan"
  | "polygonscan"
  | "base-explorer"
  | "arbitrum-explorer"
  | "avalanche-explorer";

export interface VerifiedTokenData {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  supply: bigint;
  description?: string;
  imageUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  /** Alias used in components */ image?: string;
  ca: string;
  fetchedVia?: string;
}

export interface OnboardingState {
  path: PathChoice | null;
  step: number;
  ca: string;
  tokenMeta: VerifiedTokenData | null;
  goal: Goal | null;
  timeline: LaunchTimelineLegacy;
  description: string;
  trackingWindow: TrackingWindow;
}

export interface AppPreferences {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

// ── Activity feed item ──────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  type: "track" | "activate" | "export" | "verify" | "whale" | "community";
  message: string;
  detail?: string;
  timestamp: number;
}

// ── Dashboard metric ────────────────────────────────────────────────────────────

export interface MetricCard {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  unit?: string;
}

// ── Achievement badge ────────────────────────────────────────────────────────────

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}
