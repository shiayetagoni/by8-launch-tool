import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { hapticChain } from "@/hooks/use-haptics";
import { useSolanaPrice } from "@/hooks/use-solana-price";
import { useSoundFX } from "@/hooks/use-sound-fx";
import { cn } from "@/lib/utils";
import {
  Check,
  Crown,
  Flame,
  Rocket,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";

export interface PricingTier {
  id: string;
  name: string;
  displayName: string;
  sol: number;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
  description: string;
  features: string[];
  popular?: boolean;
  bestValue?: boolean;
  isWhale?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter Boost",
    displayName: "STARTER",
    sol: 0.5,
    icon: <Zap className="w-3.5 h-3.5" />,
    color: "#8892a4",
    glowColor: "rgba(136, 146, 164, 0.2)",
    description: "500K–1M vol · 4–8h",
    features: [
      "12h visibility",
      "25+ impressions",
      "pump.fun entry",
      "Live tracking",
    ],
  },
  {
    id: "basic",
    name: "Basic Boost",
    displayName: "BASIC",
    sol: 1.0,
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    color: "#00d4ff",
    glowColor: "rgba(0, 212, 255, 0.2)",
    description: "1M–2.5M vol · 6–12h",
    features: [
      "24h visibility",
      "80+ impressions",
      "Trending feed",
      "Boost badge",
    ],
  },
  {
    id: "standard",
    name: "Standard Boost",
    displayName: "STANDARD",
    sol: 2.5,
    icon: <Star className="w-3.5 h-3.5" />,
    color: "#a855f7",
    glowColor: "rgba(168, 85, 247, 0.25)",
    description: "2.5M–5M vol · 12–24h",
    features: [
      "48h visibility",
      "250+ impressions",
      "Priority feed",
      "Discord alert",
      "Analytics",
    ],
    popular: true,
  },
  {
    id: "growth",
    name: "Growth Boost",
    displayName: "GROWTH",
    sol: 5.0,
    icon: <Flame className="w-3.5 h-3.5" />,
    color: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.2)",
    description: "5M–10M vol · 24–48h",
    features: [
      "72h visibility",
      "700+ impressions",
      "Top trending",
      "Telegram blast",
      "Full analytics",
    ],
  },
  {
    id: "pro",
    name: "Pro Boost",
    displayName: "PRO",
    sol: 10.0,
    icon: <Rocket className="w-3.5 h-3.5" />,
    color: "#a78bfa",
    glowColor: "rgba(167, 139, 250, 0.25)",
    description: "12M–20M vol · 3–5d",
    features: [
      "5 day boost",
      "1500+ impressions",
      "Premium trending",
      "TG + Discord",
      "Full analytics",
    ],
    bestValue: true,
  },
  {
    id: "elite",
    name: "Elite Boost",
    displayName: "ELITE",
    sol: 17.0,
    icon: <Crown className="w-3.5 h-3.5" />,
    color: "#fbbf24",
    glowColor: "rgba(251, 191, 36, 0.2)",
    description: "20M–35M vol · 5–7d",
    features: [
      "7 day boost",
      "4000+ impressions",
      "#1 priority",
      "All channels",
      "Elite badge",
    ],
  },
  {
    id: "ultra",
    name: "Ultra Boost",
    displayName: "ULTRA",
    sol: 25.0,
    icon: <Flame className="w-3.5 h-3.5" />,
    color: "#f472b6",
    glowColor: "rgba(244, 114, 182, 0.2)",
    description: "35M–55M vol · 10–14d",
    features: [
      "14 day boost",
      "10K+ impressions",
      "Pinned trending",
      "Community blast",
      "Ultra badge",
    ],
  },
  {
    id: "whale",
    name: "Whale Boost",
    displayName: "WHALE",
    sol: 35.0,
    icon: <Crown className="w-3.5 h-3.5" />,
    color: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.3)",
    description: "50M–80M vol · 30d",
    features: [
      "30 day boost",
      "25K+ impressions",
      "Exclusive #1",
      "Mega-blast",
      "VIP badge",
    ],
    isWhale: true,
  },
];

interface PricingTiersProps {
  selectedTier: string | null;
  onSelectTier: (tierId: string) => void;
  soundEnabled?: boolean;
}

export function PricingTiers({
  selectedTier,
  onSelectTier,
  soundEnabled = true,
}: PricingTiersProps) {
  const { data: solPrice } = useSolanaPrice();
  const { playSound, unlockAudio } = useSoundFX({ soundEnabled });

  function handleSelect(tierId: string) {
    unlockAudio();
    playSound("select");
    // Chain: immediate select haptic → confirm at 50ms when card highlights
    hapticChain("select", "confirm", 50);
    onSelectTier(tierId);
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {PRICING_TIERS.map((tier, index) => {
        const isSelected = selectedTier === tier.id;
        const usdPrice = solPrice
          ? `$${(tier.sol * solPrice).toFixed(0)}`
          : "—";

        return (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: index * 0.04,
              duration: 0.25,
              ease: [0.4, 0, 0.2, 1],
            }}
            data-ocid={`pricing.item.${index + 1}`}
            className="relative"
          >
            {/* Badge labels — corner pills */}
            {tier.popular && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider whitespace-nowrap"
                  style={{
                    background: "rgba(168, 85, 247, 0.15)",
                    border: "1px solid rgba(168, 85, 247, 0.5)",
                    color: "#a855f7",
                    boxShadow: "0 0 10px rgba(168,85,247,0.15)",
                  }}
                >
                  ✦ POPULAR
                </span>
              </div>
            )}
            {tier.bestValue && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider whitespace-nowrap"
                  style={{
                    background: "rgba(167, 139, 250, 0.15)",
                    border: "1px solid rgba(167, 139, 250, 0.4)",
                    color: "#a78bfa",
                  }}
                >
                  BEST VALUE
                </span>
              </div>
            )}
            {tier.isWhale && (
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider whitespace-nowrap"
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    color: "#f59e0b",
                  }}
                >
                  🐋 WHALE
                </span>
              </div>
            )}

            <motion.div
              whileHover={{ y: -2 }}
              whileTap={{ y: 2, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{ height: "100%" }}
            >
              <Card
                onClick={() => handleSelect(tier.id)}
                className={cn("relative cursor-pointer h-full overflow-hidden")}
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, rgba(13,17,23,0.98), ${tier.glowColor.replace(/[\d.]+\)$/, "0.1)")})`
                    : "linear-gradient(180deg, rgba(18,22,30,0.96) 0%, rgba(13,17,23,0.92) 100%)",
                  border: isSelected
                    ? `1.5px solid ${tier.color}`
                    : "1px solid rgba(0, 255, 135, 0.08)",
                  boxShadow: isSelected
                    ? `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 20px ${tier.glowColor}, 0 4px 16px rgba(0,0,0,0.5), 0 0 50px ${tier.glowColor.replace(/[\d.]+\)$/, "0.04)")}`
                    : "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)",
                  transition: "all 80ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 opacity-5"
                    animate={{ opacity: [0.03, 0.08, 0.03] }}
                    transition={{
                      duration: 2.5,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    style={{
                      background: `radial-gradient(circle at 50% 0%, ${tier.color}, transparent 70%)`,
                    }}
                  />
                )}

                <CardContent className="p-3.5 flex flex-col h-full">
                  {/* Icon + Name */}
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `${tier.glowColor.replace(/[\d.]+\)$/, "0.12)")}`,
                        color: tier.color,
                        border: `1px solid ${tier.color}28`,
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 3px rgba(0,0,0,0.3)",
                      }}
                    >
                      {tier.icon}
                    </div>
                    <span
                      className="text-[10px] font-bold tracking-widest"
                      style={{
                        color: tier.color,
                        fontFamily: "Space Grotesk, sans-serif",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {tier.displayName}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="mb-1.5">
                    <div className="flex items-baseline gap-1">
                      <span
                        className="font-bold"
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          color: "#f0f4f8",
                          fontSize: "22px",
                          lineHeight: 1,
                        }}
                      >
                        {tier.sol}
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          color: "#00ff87",
                        }}
                      >
                        SOL
                      </span>
                    </div>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{
                        fontFamily: "JetBrains Mono, monospace",
                        color: "#4a5568",
                      }}
                    >
                      {usdPrice} USD
                    </p>
                  </div>

                  {/* Volume stat */}
                  <p
                    className="text-[10px] font-medium mb-2.5"
                    style={{
                      color: tier.color,
                      opacity: 0.85,
                      lineHeight: 1.3,
                    }}
                  >
                    {tier.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-1 flex-1 mb-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-1 text-[11px] leading-[1.25]"
                        style={{ color: "#8892a4" }}
                      >
                        <Check
                          className="w-2.5 h-2.5 mt-0.5 flex-shrink-0"
                          style={{ color: tier.color }}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Select button — 3D treatment */}
                  <button
                    type="button"
                    className="w-full py-1.5 rounded-lg text-[11px] font-bold tracking-wide min-h-[36px]"
                    style={
                      isSelected
                        ? {
                            background: `linear-gradient(180deg, ${tier.color}ee 0%, ${tier.color}cc 100%)`,
                            color: "#080b12",
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2), 0 3px 8px ${tier.glowColor}, 0 1px 3px rgba(0,0,0,0.4)`,
                            border: "none",
                            transition: "all 80ms cubic-bezier(0.4, 0, 0.2, 1)",
                          }
                        : {
                            background: "transparent",
                            color: tier.color,
                            border: `1px solid ${tier.color}38`,
                            boxShadow: `inset 0 1px 0 ${tier.color}15, 0 1px 3px rgba(0,0,0,0.2)`,
                            transition: "all 80ms cubic-bezier(0.4, 0, 0.2, 1)",
                          }
                    }
                    data-ocid={`pricing.select_button.${index + 1}`}
                  >
                    {isSelected ? "✓ SELECTED" : "SELECT"}
                  </button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
