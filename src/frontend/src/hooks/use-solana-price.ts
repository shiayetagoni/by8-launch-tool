import { useQuery } from "@tanstack/react-query";

interface CoinGeckoResponse {
  solana: { usd: number };
}

async function fetchSolanaPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const data: CoinGeckoResponse = await res.json();
  return data.solana.usd;
}

export function useSolanaPrice() {
  return useQuery<number>({
    queryKey: ["solana-price"],
    queryFn: fetchSolanaPrice,
    refetchInterval: 60_000,
    staleTime: 55_000,
    retry: 2,
    placeholderData: 145, // fallback approximate price
  });
}

export function useFormatSolUSD(solAmount: number) {
  const { data: solPrice } = useSolanaPrice();
  const usd = solPrice ? solAmount * solPrice : null;
  return {
    sol: `${solAmount.toFixed(2)} SOL`,
    usd: usd ? `$${usd.toFixed(2)}` : "—",
    usdRaw: usd,
  };
}
