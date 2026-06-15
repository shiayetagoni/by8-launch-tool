import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { haptic } from "@/hooks/use-haptics";
import type { PumpToken } from "@/hooks/use-pump-fun-data";
import { useSolanaPrice } from "@/hooks/use-solana-price";
import { useSoundFX } from "@/hooks/use-sound-fx";
import { cn } from "@/lib/utils";
import { ExternalLink, Flame } from "lucide-react";
import { motion } from "motion/react";

interface TokenCardProps {
  token: PumpToken;
  index: number;
  rank?: number;
  isSelected?: boolean;
  onSelect?: (mint: string) => void;
  soundEnabled?: boolean;
}

export function TokenCard({
  token,
  index,
  rank,
  isSelected,
  onSelect,
  soundEnabled = true,
}: TokenCardProps) {
  const { data: solPrice } = useSolanaPrice();
  const { playSound, unlockAudio } = useSoundFX({ soundEnabled });

  const marketCapUSD = token.usd_market_cap ?? 0;
  const bondingProgress =
    token.virtual_token_reserves && token.total_supply
      ? Math.min(
          100,
          Math.max(
            0,
            (1 - token.virtual_token_reserves / token.total_supply) * 100,
          ),
        )
      : 0;

  const formattedMcap =
    marketCapUSD >= 1_000_000
      ? `$${(marketCapUSD / 1_000_000).toFixed(2)}M`
      : marketCapUSD >= 1_000
        ? `$${(marketCapUSD / 1_000).toFixed(1)}K`
        : `$${marketCapUSD.toFixed(0)}`;

  const solMcap = solPrice ? (marketCapUSD / solPrice).toFixed(0) : "—";

  function handleClick() {
    unlockAudio();
    playSound("select");
    haptic("select");
    onSelect?.(token.mint);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      transition={{
        delay: index * 0.04,
        duration: 0.25,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{ scale: 1.015, y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      data-ocid={`token.item.${index + 1}`}
      className="cursor-pointer relative"
    >
      {rank !== undefined && (
        <div
          className={cn(
            "absolute -top-1.5 -right-1.5 z-10 min-w-[20px] h-[20px] px-1",
            "rounded-full flex items-center justify-center text-[9px] font-bold font-mono",
          )}
          style={{
            background: rank === 1 ? "#00ff87" : "rgba(0,255,135,0.2)",
            color: rank === 1 ? "#080b12" : "#00ff87",
            border: "1px solid rgba(0,255,135,0.4)",
          }}
          aria-label={`Rank #${rank}`}
        >
          #{rank}
        </div>
      )}

      <Card
        className={cn("overflow-hidden")}
        style={{
          background: "rgba(13, 17, 23, 0.92)",
          border: isSelected
            ? "1px solid rgba(0, 255, 135, 0.5)"
            : "1px solid rgba(0, 255, 135, 0.08)",
          boxShadow: isSelected ? "0 0 18px rgba(0, 255, 135, 0.1)" : "none",
          transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <CardContent className="p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="relative flex-shrink-0">
              <img
                src={token.image_uri || "/assets/images/placeholder.svg"}
                alt={token.symbol}
                className="w-9 h-9 rounded-lg object-cover"
                style={{ background: "rgba(0,255,135,0.05)" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/assets/images/placeholder.svg";
                }}
              />
              {token.complete && (
                <span
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2"
                  style={{
                    background: "#00ff87",
                    borderColor: "#080b12",
                  }}
                  title="Migrated to Raydium"
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="font-semibold text-xs text-foreground truncate"
                  style={{ fontFamily: "Space Grotesk, sans-serif" }}
                >
                  {token.name}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-mono px-1.5 py-0 flex-shrink-0"
                >
                  {token.symbol}
                </Badge>
                {token.king_of_the_hill_timestamp && (
                  <Flame
                    className="w-3 h-3 flex-shrink-0"
                    style={{ color: "#f97316" }}
                    aria-label="King of the Hill"
                  />
                )}
              </div>

              <p className="text-[10px] mt-0.5 line-clamp-1 text-muted-foreground">
                {token.description || "No description"}
              </p>

              <div className="flex items-center gap-2.5 mt-1.5">
                <span className="text-[10px] font-mono text-foreground">
                  MC:{" "}
                  <span style={{ color: "#00ff87" }} className="font-semibold">
                    {formattedMcap}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {solMcap} SOL
                </span>
              </div>

              <div className="mt-1.5 space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">
                    Bonding
                  </span>
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: "#00ff87" }}
                  >
                    {bondingProgress.toFixed(1)}%
                  </span>
                </div>
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{ background: "rgba(0,255,135,0.08)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${bondingProgress}%`,
                      background: "linear-gradient(90deg, #00ff87, #00d4ff)",
                      transition: "width 700ms cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </div>
              </div>
            </div>

            <a
              href={`https://pump.fun/coin/${token.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0 p-1.5 rounded-md transition-colors"
              style={{ color: "#4a5568" }}
              aria-label="View on pump.fun"
              data-ocid={`token.link.${index + 1}`}
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function TokenCardSkeleton() {
  return (
    <Card
      className="overflow-hidden"
      style={{
        background: "rgba(13,17,23,0.9)",
        border: "1px solid rgba(0,255,135,0.06)",
      }}
    >
      <CardContent className="p-3.5">
        <div className="flex items-start gap-2.5">
          <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-1 w-full rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
