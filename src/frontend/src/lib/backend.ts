/**
 * BY8 Launch Tool — Typed backend client wrapper
 * Provides typed, convenience methods around the generated actor bindings.
 * All methods use the actor from useActor(createActor).
 */

import { createActor } from "@/backend";
import type {
  AnalyticsResult,
  BoostRecord,
  LeaderboardEntry,
  TokenMetadata,
  WhaleSnapshot,
  WhaleStats,
} from "@/backend.d";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Query keys ─────────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
  analytics: ["analytics"] as const,
  topBoosters: (limit: number) => ["topBoosters", limit] as const,
  recentBoosts: (limit: number) => ["recentBoosts", limit] as const,
  whaleStats: ["whaleStats"] as const,
  whaleLeaderboard: (limit: number) => ["whaleLeaderboard", limit] as const,
  whaleInfo: (wallet: string) => ["whaleInfo", wallet] as const,
  tokenMetadata: (ca: string) => ["tokenMetadata", ca] as const,
} as const;

// ── Analytics ──────────────────────────────────────────────────────────────────

export function useAnalytics() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<AnalyticsResult>({
    queryKey: QUERY_KEYS.analytics,
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getAnalytics();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

// ── Top Boosters ───────────────────────────────────────────────────────────────

export function useTopBoosters(limit = 10) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<LeaderboardEntry[]>({
    queryKey: QUERY_KEYS.topBoosters(limit),
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTopBoosters(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

// ── Recent Boosts ──────────────────────────────────────────────────────────────

export function useRecentBoosts(limit = 20) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<BoostRecord[]>({
    queryKey: QUERY_KEYS.recentBoosts(limit),
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRecentBoosts(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

// ── Whale Stats ────────────────────────────────────────────────────────────────

export function useWhaleStats() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<WhaleStats>({
    queryKey: QUERY_KEYS.whaleStats,
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getWhaleStats();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

// ── Whale Leaderboard ─────────────────────────────────────────────────────────

export function useWhaleLeaderboard(limit = 20) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<WhaleSnapshot[]>({
    queryKey: QUERY_KEYS.whaleLeaderboard(limit),
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWhaleLeaderboard(BigInt(limit));
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

// ── Whale Info ────────────────────────────────────────────────────────────────

export function useWhaleInfo(wallet: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<WhaleSnapshot | null>({
    queryKey: QUERY_KEYS.whaleInfo(wallet),
    queryFn: async () => {
      if (!actor || !wallet) return null;
      return actor.getWhaleInfo(wallet);
    },
    enabled: !!actor && !isFetching && !!wallet,
    staleTime: 30_000,
  });
}

// ── Token Metadata ────────────────────────────────────────────────────────────

export function useTokenMetadata(ca: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<TokenMetadata | null>({
    queryKey: QUERY_KEYS.tokenMetadata(ca),
    queryFn: async () => {
      if (!actor || !ca) return null;
      const result = await actor.fetchTokenMetadata(ca);
      if (result.__kind__ === "ok") return result.ok;
      throw new Error(result.err);
    },
    enabled: !!actor && !isFetching && !!ca,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

// ── Record Boost mutation ─────────────────────────────────────────────────────

export function useRecordBoost() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      mint: string;
      tier: number;
      txHash: string;
      timestamp: bigint;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      const result = await actor.recordBoost(
        params.mint,
        params.tier,
        params.txHash,
        params.timestamp,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.analytics });
      void qc.invalidateQueries({ queryKey: ["recentBoosts"] });
    },
  });
}

// ── Register Whale Airdrop ────────────────────────────────────────────────────

export function useRegisterWhaleAirdrop() {
  const { actor } = useActor(createActor);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { walletAddress: string; txHash: string }) => {
      if (!actor) throw new Error("Actor not ready");
      const result = await actor.registerWhaleAirdrop(
        params.walletAddress,
        params.txHash,
      );
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.whaleStats });
      void qc.invalidateQueries({ queryKey: ["whaleLeaderboard"] });
    },
  });
}
