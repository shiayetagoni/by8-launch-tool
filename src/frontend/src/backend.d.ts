import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AllocationBreakdown {
    marketing: bigint;
    team: bigint;
    liquidity: bigint;
    community: bigint;
    reserve: bigint;
}
export interface LeaderboardEntry {
    totalSol: number;
    tokensBoosted: Array<string>;
    lastBoostTimestamp: bigint;
    wallet: string;
    boostCount: bigint;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface AnalyticsResult {
    avgBoostSol: number;
    totalBoosts: bigint;
    topWallet?: string;
    recentBoosts: Array<BoostRecord>;
    uniqueTokens: bigint;
    totalSolCollected: number;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface BoostRecord {
    mint: string;
    tier: number;
    timestamp: bigint;
    txHash: string;
    wallet: string;
}
export interface WhaleSnapshot {
    airdropClaimed: boolean;
    walletAddress: string;
    nftCount: bigint;
    isVerified: boolean;
    timestamp: bigint;
    txHash?: string;
    tokenMint: string;
    tokenBalance: number;
    solBalance: number;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface LaunchSnapshot {
    id: string;
    status: string;
    decimals: number;
    selectedChain: string;
    selectedPlatform: string;
    description: string;
    supply: bigint;
    timestamp: bigint;
    allocationBreakdown: AllocationBreakdown;
    tokenName: string;
    paymentTxHash: string;
    launchType: string;
    paymentWallet: string;
    symbol: string;
}
export interface TokenMetadata {
    decimals: number;
    twitter?: string;
    chain: string;
    mint: string;
    name: string;
    description?: string;
    website?: string;
    imageUrl?: string;
    supply: bigint;
    chainId: bigint;
    telegram?: string;
    symbol: string;
}
export interface LaunchData {
    decimals: number;
    selectedChain: string;
    selectedPlatform: string;
    description: string;
    supply: bigint;
    allocationBreakdown: AllocationBreakdown;
    tokenName: string;
    paymentTxHash: string;
    launchType: string;
    paymentWallet: string;
    symbol: string;
}
export interface WalletStats {
    totalSol: number;
    tokensBoosted: Array<string>;
    lastBoostTimestamp: bigint;
    wallet: string;
    recentBoosts: Array<BoostRecord>;
    boostCount: bigint;
}
export interface TelegramStatus {
    lastResponse: string;
    connected: boolean;
    chatId?: bigint;
    errorLog: Array<string>;
}
export interface WhaleStats {
    airdropClaimsCount: bigint;
    totalVerifiedWhales: bigint;
    totalWhalesConnected: bigint;
    totalTokenBalance: number;
}
export interface backendInterface {
    autoDiscoverChatId(): Promise<bigint | null>;
    claimAirdrop(walletAddress: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    connectWhaleWallet(walletAddress: string, tokenMint: string, tokenBalance: number, solBalance: number, nftCount: bigint): Promise<{
        __kind__: "ok";
        ok: WhaleSnapshot;
    } | {
        __kind__: "err";
        err: string;
    }>;
    createLaunchRecord(data: LaunchData): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    debugTelegramStatus(): Promise<string>;
    /**
     * / Fetch real on-chain token metadata using a three-source Solana cascade:
     * /   1. Solscan (primary)  2. Jupiter (fallback)  3. Dexscreener (fallback)
     */
    fetchTokenMetadata(ca: string): Promise<{
        __kind__: "ok";
        ok: TokenMetadata;
    } | {
        __kind__: "err";
        err: string;
    }>;
    forceSetChatId(id: bigint): Promise<void>;
    getAnalytics(): Promise<AnalyticsResult>;
    getChatId(): Promise<bigint | null>;
    getCurrentChatId(): Promise<bigint | null>;
    getDebugInfo(): Promise<string>;
    getLastTelegramError(): Promise<string>;
    getLaunchRecord(id: string): Promise<LaunchSnapshot | null>;
    getRawUpdates(): Promise<string>;
    getRecentBoosts(limit: bigint): Promise<Array<BoostRecord>>;
    getTelegramStatus(): Promise<TelegramStatus>;
    getTelegramUpdates(): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getTokenDetail(mint: string): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getTokenHistory(mint: string): Promise<Array<BoostRecord>>;
    getTopBoosters(limit: bigint): Promise<Array<LeaderboardEntry>>;
    getTopBoostersByPeriod(limit: bigint, periodDays: bigint): Promise<Array<LeaderboardEntry>>;
    getTrendingTokens(limit: bigint): Promise<{
        __kind__: "ok";
        ok: string;
    } | {
        __kind__: "err";
        err: string;
    }>;
    getWalletStats(wallet: string): Promise<WalletStats | null>;
    getWhaleInfo(walletAddress: string): Promise<WhaleSnapshot | null>;
    getWhaleLeaderboard(limit: bigint): Promise<Array<WhaleSnapshot>>;
    getWhaleRecord(walletAddress: string): Promise<WhaleSnapshot | null>;
    getWhaleStats(): Promise<WhaleStats>;
    handleTelegramUpdate(body: string): Promise<void>;
    initSeedData(): Promise<void>;
    initializeTelegram(forceChatId: bigint | null): Promise<bigint | null>;
    /**
     * / Multi-chain token lookup: auto-detects Solana vs EVM from CA format.
     * / chainHint (optional): "ethereum", "base", "bsc", "polygon", "arbitrum", "avalanche"
     */
    lookupTokenMultiChain(ca: string, chainHint: string | null): Promise<{
        __kind__: "ok";
        ok: TokenMetadata;
    } | {
        __kind__: "err";
        err: string;
    }>;
    notifyBoostSubmitted(mint: string, packageName: string, sol: string, txHash: string): Promise<void>;
    notifyCaPasted(ca: string): Promise<void>;
    notifyPackageSelected(packageName: string, sol: string): Promise<void>;
    notifySiteVisit(details: string): Promise<void>;
    notifyTxHashEntered(txHash: string, mint: string): Promise<void>;
    recordAction(action: string, details: string): Promise<void>;
    recordBoost(mint: string, tier: number, txHash: string, timestamp: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    recordBoostWithWallet(mint: string, tier: number, txHash: string, timestamp: bigint, wallet: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    recordWhaleConnect(walletAddress: string, tokenMint: string, tokenBalance: number, _timestamp: bigint): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    registerWhaleAirdrop(walletAddress: string, txHash: string): Promise<{
        __kind__: "ok";
        ok: WhaleSnapshot;
    } | {
        __kind__: "err";
        err: string;
    }>;
    sendTelegramMessage(msg: string): Promise<boolean>;
    sendTestMessage(): Promise<string>;
    setChatId(id: bigint): Promise<void>;
    setChatIdFromGroup(): Promise<string>;
    submitWhaleVerification(walletAddress: string, txHash: string): Promise<{
        __kind__: "ok";
        ok: null;
    } | {
        __kind__: "err";
        err: string;
    }>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    transformDexscreener(input: TransformationInput): Promise<TransformationOutput>;
    transformHelius(input: TransformationInput): Promise<TransformationOutput>;
    transformJupiter(input: TransformationInput): Promise<TransformationOutput>;
    transformSolscan(input: TransformationInput): Promise<TransformationOutput>;
}
