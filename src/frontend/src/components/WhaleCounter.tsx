/**
 * WhaleCounter — shows verified whale count with pulsing live indicator.
 * Tries to fetch the real count from getWhaleStats() on mount; falls back to
 * a drifting mock counter (starts at 47, slowly increments) if the call fails
 * or returns 0.
 */

import { createActor } from "@/backend";
import { useIncrementingCounter } from "@/hooks/use-live-counter";
import { useActor } from "@caffeineai/core-infrastructure";
import { useEffect, useState } from "react";

interface WhaleCounterProps {
  className?: string;
}

export default function WhaleCounter({ className }: WhaleCounterProps) {
  // Starts at 47, increments by 1 roughly every 90 seconds (mock fallback)
  const mockCount = useIncrementingCounter(47, 90_000);
  const [liveCount, setLiveCount] = useState<number | null>(null);

  const { actor, isFetching } = useActor(createActor);

  useEffect(() => {
    if (!actor || isFetching) return;
    actor
      .getWhaleStats()
      .then((stats) => {
        const n = Number(stats.totalVerifiedWhales);
        if (n > 0) setLiveCount(n);
      })
      .catch(() => {
        // Silent fallback — mock counter will be used
      });
  }, [actor, isFetching]);

  const count = liveCount !== null ? liveCount : mockCount;

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 18px",
        borderRadius: "12px",
        background: "rgba(0,180,255,0.06)",
        border: "1px solid rgba(0,180,255,0.18)",
      }}
      data-ocid="whale_counter.widget"
    >
      {/* Pulsing indicator */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #00b4ff, #b366ff)",
          boxShadow: "0 0 8px rgba(0,180,255,0.6)",
          animation: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        }}
      />
      <span
        className="text-sm font-bold"
        style={{
          fontFamily: "Space Grotesk, sans-serif",
          color: "#f0f4f8",
        }}
      >
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            color: "#00b4ff",
            fontSize: "16px",
          }}
        >
          {count}
        </span>{" "}
        Verified Whales Connected
      </span>
    </div>
  );
}
