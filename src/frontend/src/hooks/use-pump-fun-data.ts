import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";
import { createActor } from "../backend";

export interface PumpToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  raydium_pool: string | null;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  website_url?: string;
  show_name: boolean;
  king_of_the_hill_timestamp: number | null;
  market_cap: number;
  reply_count: number;
  last_reply: number;
  nsfw: boolean;
  market_id: string | null;
  inverted: boolean | null;
  usd_market_cap: number;
}

export interface PumpTokenDetail extends PumpToken {
  price?: number;
  volume_24h?: number;
  bonding_curve_progress?: number;
}

type BackendResult = { ok: string } | { err: string };

interface BackendActor {
  getTrendingTokens: (limit: bigint) => Promise<BackendResult>;
  getTokenDetail: (mint: string) => Promise<BackendResult>;
}

function unwrapResult(result: BackendResult, context: string): string {
  if ("ok" in result) return result.ok;
  throw new Error(`${context}: ${result.err}`);
}

export function useTrendingTokens() {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<PumpToken[]>({
    queryKey: ["pump-fun-trending"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const backend = actor as unknown as BackendActor;
        const result = await backend.getTrendingTokens(BigInt(50));
        const json = unwrapResult(result, "getTrendingTokens");
        return JSON.parse(json) as PumpToken[];
      } catch {
        // Backend unavailable — return empty list gracefully
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 1,
  });
}

export function useTokenDetail(mint: string | null) {
  const { actor, isFetching } = useActor(createActor);

  return useQuery<PumpTokenDetail | null>({
    queryKey: ["pump-fun-token", mint],
    queryFn: async () => {
      if (!actor || !mint) return null;
      try {
        const backend = actor as unknown as BackendActor;
        const result = await backend.getTokenDetail(mint);
        const json = unwrapResult(result, "getTokenDetail");
        const data = JSON.parse(json) as PumpToken;

        // Calculate bonding curve progress (0-100%)
        const progress =
          data.virtual_sol_reserves && data.virtual_token_reserves
            ? Math.min(
                100,
                (1 - data.virtual_token_reserves / data.total_supply) * 100,
              )
            : 0;

        // Price in SOL = virtual_sol_reserves / virtual_token_reserves
        const price =
          data.virtual_sol_reserves && data.virtual_token_reserves
            ? data.virtual_sol_reserves / data.virtual_token_reserves
            : 0;

        return { ...data, price, bonding_curve_progress: progress };
      } catch {
        // Backend unavailable — return null gracefully
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!mint,
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 1,
  });
}
