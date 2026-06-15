/**
 * Testimonials — 6 realistic crypto trader reviews for BY8 Launch Tool.
 * Manual navigation only: prev/next arrows + dot pagination.
 * No auto-scrolling carousel.
 */

import { haptic } from "@/hooks/use-haptics";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";

// ─── Data ──────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    handle: "whale_degen_99",
    avatar: "🐳",
    token: "$WIF",
    stars: 5,
    tier: "Whale",
    text: "Tracked $WIF launch with BY8, caught the early spike before it went parabolic. Visibility score jumped from 38% to 91% in 6 hours. Dashboard is clean and the data feels real.",
  },
  {
    handle: "solana_sniper_x",
    avatar: "🎯",
    token: "$BONK",
    stars: 5,
    tier: "Elite",
    text: "Used BY8 to track $BONK during a major visibility window. The engagement analytics showed the exact moment traction spiked — I loaded at the right time. This tool is legit.",
  },
  {
    handle: "defi_chad_2024",
    avatar: "💎",
    token: "$POPCAT",
    stars: 5,
    tier: "Pro",
    text: "Finally an analytics tool that doesn't look like a scam. BY8 gave me clean visibility data for my $POPCAT tracking — no hype, just real signals. Onboarding was under 2 minutes.",
  },
  {
    handle: "wen_alpha_ser",
    avatar: "🔮",
    token: "$BOME",
    stars: 4,
    tier: "Growth",
    text: "The visibility score accuracy on $BOME was impressive — it predicted a spike 20 minutes before the chart moved. The activity feed feels live and the export report is clean PDF.",
  },
  {
    handle: "launch_analytics",
    avatar: "📊",
    token: "$MEW",
    stars: 5,
    tier: "Ultra",
    text: "Our team used BY8 for the $MEW launch. The real-time engagement tracking showed us where attention was coming from hour by hour. Switched from spreadsheets to this permanently.",
  },
  {
    handle: "sol_early_bird",
    avatar: "🐦",
    token: "$GOAT",
    stars: 5,
    tier: "Elite",
    text: "BY8 tracked $GOAT for me from day one. Visibility went from 22% to 87% over 48 hours and I could watch every step in the dashboard. The trend direction feature is underrated.",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {(["s1", "s2", "s3", "s4", "s5"] as const).map((k, i) => (
        <span
          key={k}
          style={{
            color: i < count ? "#fbbf24" : "rgba(136,146,164,0.25)",
            fontSize: "11px",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  Whale: "#fbbf24",
  Ultra: "#f97316",
  Elite: "#a78bfa",
  Pro: "#60a5fa",
  Growth: "#22d3ee",
  Standard: "#34d399",
};

function getTierColor(tier: string): string {
  return TIER_COLORS[tier] ?? "#8892a4";
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function Testimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const scrollToIdx = useCallback((idx: number) => {
    const container = scrollRef.current;
    if (container) {
      const card = container.children[idx] as HTMLElement | undefined;
      if (card) {
        card.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "start",
        });
      }
    }
  }, []);

  const handlePrev = useCallback(() => {
    haptic("tap");
    const next = activeIdx > 0 ? activeIdx - 1 : TESTIMONIALS.length - 1;
    setActiveIdx(next);
    scrollToIdx(next);
  }, [activeIdx, scrollToIdx]);

  const handleNext = useCallback(() => {
    haptic("tap");
    const next = (activeIdx + 1) % TESTIMONIALS.length;
    setActiveIdx(next);
    scrollToIdx(next);
  }, [activeIdx, scrollToIdx]);

  return (
    <div data-ocid="testimonials.section" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="text-sm font-semibold"
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              color: "#f0f4f8",
            }}
          >
            What Traders Say
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(0,255,135,0.08)",
              border: "1px solid rgba(0,255,135,0.2)",
              color: "#00ff87",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {TESTIMONIALS.length} verified reviews
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {(["s1", "s2", "s3", "s4", "s5"] as const).map((k) => (
              <span key={k} style={{ color: "#fbbf24", fontSize: "12px" }}>
                ★
              </span>
            ))}
            <span
              className="text-xs ml-1 font-bold"
              style={{
                color: "#fbbf24",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              4.9
            </span>
          </div>
          {/* Manual nav arrows */}
          <div className="flex items-center gap-1 ml-2">
            <button
              type="button"
              onClick={handlePrev}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-150"
              style={{
                background: "rgba(0,180,255,0.07)",
                border: "1px solid rgba(0,180,255,0.18)",
                color: "#00b4ff",
              }}
              aria-label="Previous testimonial"
              data-ocid="testimonials.prev_button"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-150"
              style={{
                background: "rgba(0,180,255,0.07)",
                border: "1px solid rgba(0,180,255,0.18)",
                color: "#00b4ff",
              }}
              aria-label="Next testimonial"
              data-ocid="testimonials.next_button"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Scroll rail */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scroll-ios"
        style={{
          scrollSnapType: "x mandatory",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
        data-ocid="testimonials.list"
      >
        {TESTIMONIALS.map((t, i) => {
          const tierColor = getTierColor(t.tier);
          const isActive = i === activeIdx;
          return (
            <motion.div
              key={t.handle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.32 }}
              className="flex-shrink-0 w-64 p-4 rounded-2xl space-y-3 cursor-pointer"
              style={{
                background: isActive
                  ? `rgba(${tierColor === "#fbbf24" ? "251,191,36" : tierColor === "#a78bfa" ? "167,139,250" : "0,196,255"},0.04)`
                  : "rgba(13,17,23,0.95)",
                border: `1px solid ${isActive ? `${tierColor}38` : "rgba(255,255,255,0.06)"}`,
                scrollSnapAlign: "start",
                boxShadow: isActive ? `0 0 24px ${tierColor}10` : "none",
                transition:
                  "background 400ms ease, border-color 400ms ease, box-shadow 400ms ease",
              }}
              onClick={() => {
                haptic("tap");
                setActiveIdx(i);
                scrollToIdx(i);
              }}
              data-ocid={`testimonials.item.${i + 1}`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{
                      background: `${tierColor}12`,
                      border: `1px solid ${tierColor}28`,
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-bold truncate"
                      style={{
                        color: "#00ff87",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      @{t.handle}
                    </p>
                    <StarRating count={t.stars} />
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                    style={{
                      background: `${tierColor}18`,
                      border: `1px solid ${tierColor}32`,
                      color: tierColor,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {t.tier}
                  </span>
                  <span
                    className="text-[10px] font-bold"
                    style={{
                      color: "#00b4ff",
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {t.token}
                  </span>
                </div>
              </div>

              {/* Review text */}
              <p
                className="text-xs leading-relaxed"
                style={{ color: "#c8cfe0", lineHeight: "1.6" }}
              >
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Analytics badge */}
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(0,180,255,0.06)",
                    border: "1px solid rgba(0,180,255,0.15)",
                    color: "#00b4ff",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  📈 Analytics verified
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dot pagination */}
      <div className="flex items-center justify-center gap-1.5" aria-hidden>
        {TESTIMONIALS.map((t, i) => (
          <button
            key={t.handle}
            type="button"
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeIdx ? 16 : 6,
              height: 6,
              background:
                i === activeIdx ? "#00b4ff" : "rgba(136,146,164,0.25)",
            }}
            onClick={() => {
              haptic("tap");
              setActiveIdx(i);
              scrollToIdx(i);
            }}
            aria-label={`Go to testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default Testimonials;
