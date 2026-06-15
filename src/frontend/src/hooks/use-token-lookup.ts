/**
 * BY8 Launch Tool — Token Lookup Hook
 * Cascades through: backend canister → Jupiter (browser) → Dexscreener (browser).
 * Returns typed TokenMetadata + loading/error states.
 * Auto-triggers when a valid Solana CA is provided.
 */

import { createActor } from "@/backend";
import type { FetchStage, FetchStatus, VerifiedTokenData } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useCallback, useEffect, useRef, useState } from "react";

/** Validates a Solana base58 contract address */
export function isValidSolanaCA(ca: string): boolean {
  const t = ca.trim();
  return t.length >= 32 && t.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(t);
}

// ── Browser-side fallback fetchers ────────────────────────────────────────────

async function fetchFromJupiterDirect(
  ca: string,
): Promise<VerifiedTokenData | null> {
  try {
    const res = await fetch("https://token.jup.ag/all", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const tokens = (await res.json()) as Array<{
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      logoURI?: string;
    }>;
    const token = tokens.find((t) => t.address === ca);
    if (!token) return null;
    return {
      mint: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      supply: BigInt(0),
      imageUrl: token.logoURI,
      image: token.logoURI,
      ca,
      fetchedVia: "Jupiter",
    };
  } catch {
    return null;
  }
}

async function fetchFromDexscreenerDirect(
  ca: string,
): Promise<VerifiedTokenData | null> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${ca}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pairs?: Array<{
        baseToken: { address: string; name: string; symbol: string };
        info?: { imageUrl?: string };
      }>;
    };
    const pair = data?.pairs?.[0];
    if (!pair) return null;
    const t = pair.baseToken;
    if (t.address.toLowerCase() !== ca.toLowerCase()) return null;
    return {
      mint: t.address,
      name: t.name,
      symbol: t.symbol,
      decimals: 9,
      supply: BigInt(0),
      imageUrl: pair.info?.imageUrl,
      image: pair.info?.imageUrl,
      ca,
      fetchedVia: "Dexscreener",
    };
  } catch {
    return null;
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────────

interface UseTokenLookupReturn {
  status: FetchStatus;
  stage: FetchStage;
  tokenMeta: VerifiedTokenData | null;
  error: string;
  retryCount: number;
  trigger: (ca: string) => void;
  reset: () => void;
}

export function useTokenLookup(): UseTokenLookupReturn {
  const { actor, isFetching } = useActor(createActor);

  const [status, setStatus] = useState<FetchStatus>("idle");
  const [stage, setStage] = useState<FetchStage>("idle");
  const [tokenMeta, setTokenMeta] = useState<VerifiedTokenData | null>(null);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const pendingCaRef = useRef<string | null>(null);
  const abortRef = useRef<boolean>(false);

  const lookup = useCallback(
    async (ca: string) => {
      if (!ca || !isValidSolanaCA(ca)) return;

      abortRef.current = false;
      setStatus("loading");
      setStage("idle");
      setError("");

      // ── 1. Backend canister (Solscan cascade) ────────────────────────────────
      if (actor && !isFetching) {
        try {
          setStage("solscan");
          const result = await actor.fetchTokenMetadata(ca);
          if (abortRef.current) return;
          if (result.__kind__ === "ok") {
            const m = result.ok;
            setTokenMeta({
              ...m,
              image: m.imageUrl,
              ca,
              fetchedVia: "Solscan",
            });
            setStatus("success");
            setStage("idle");
            return;
          }
          // Backend failed — fall through to browser fallbacks
          setStage("direct-jupiter");
        } catch {
          if (abortRef.current) return;
          setStage("direct-jupiter");
        }
      } else {
        setStage("direct-jupiter");
      }

      if (abortRef.current) return;

      // ── 2. Jupiter browser fetch ─────────────────────────────────────────────
      const jupiterResult = await fetchFromJupiterDirect(ca);
      if (abortRef.current) return;
      if (jupiterResult) {
        setTokenMeta(jupiterResult);
        setStatus("success");
        setStage("idle");
        return;
      }

      // ── 3. Dexscreener browser fetch ─────────────────────────────────────────
      setStage("direct-dexscreener");
      const dexResult = await fetchFromDexscreenerDirect(ca);
      if (abortRef.current) return;
      if (dexResult) {
        setTokenMeta(dexResult);
        setStatus("success");
        setStage("idle");
        return;
      }

      // ── All failed ────────────────────────────────────────────────────────────
      setStatus("error");
      setStage("idle");
      setError(
        "Token not found on any provider. Verify the address is a valid Solana SPL token.",
      );
    },
    [actor, isFetching],
  );

  // Auto-trigger when actor becomes ready and we have a pending CA
  useEffect(() => {
    const pending = pendingCaRef.current;
    if (pending && actor && !isFetching && status === "loading") {
      pendingCaRef.current = null;
      void lookup(pending);
    }
  }, [actor, isFetching, lookup, status]);

  const trigger = useCallback(
    (ca: string) => {
      abortRef.current = true; // cancel any in-flight
      setStatus("idle");
      setStage("idle");
      setTokenMeta(null);
      setError("");

      if (!isValidSolanaCA(ca)) return;

      // If actor isn't ready yet, queue it
      if (!actor || isFetching) {
        pendingCaRef.current = ca;
        setStatus("loading");
        setStage("idle");
        return;
      }

      pendingCaRef.current = null;
      abortRef.current = false;
      void lookup(ca);
    },
    [actor, isFetching, lookup],
  );

  const reset = useCallback(() => {
    abortRef.current = true;
    pendingCaRef.current = null;
    setStatus("idle");
    setStage("idle");
    setTokenMeta(null);
    setError("");
    setRetryCount(0);
  }, []);

  const retryTrigger = useCallback(
    (ca: string) => {
      setRetryCount((c) => c + 1);
      trigger(ca);
    },
    [trigger],
  );

  return {
    status,
    stage,
    tokenMeta,
    error,
    retryCount,
    trigger: retryTrigger,
    reset,
  };
}
