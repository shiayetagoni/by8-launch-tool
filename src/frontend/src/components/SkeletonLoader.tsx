/**
 * BY8 Launch Tool — Skeleton loading components
 * Used during CA verification fetch in OnboardingPage Step 1.
 */

import { Loader2 } from "lucide-react";

// ─── TokenInfoSkeleton ────────────────────────────────────────────────────────

/**
 * Shown in Step 1 while a CA fetch is in progress.
 * Replaces the token logo + name/symbol area with a shimmering skeleton.
 */
export function TokenInfoSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: "rgba(0,180,255,0.03)",
        border: "1px solid rgba(0,180,255,0.12)",
        animation: "token-card-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
      data-ocid="onboarding.skeleton_loading_state"
      aria-busy="true"
      aria-label="Fetching token data"
    >
      {/* Logo + name row */}
      <div className="flex items-center gap-4">
        {/* Logo placeholder — pulsing circle */}
        <div
          className="rounded-full flex-shrink-0 skeleton-shimmer"
          style={{ width: 56, height: 56 }}
        />

        {/* Name + symbol bars */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div
            className="h-4 rounded-lg skeleton-shimmer"
            style={{ width: "68%" }}
          />
          <div
            className="h-3.5 rounded-lg skeleton-shimmer"
            style={{ width: "42%" }}
          />
        </div>
      </div>

      {/* Supply / decimals grid */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-3 space-y-2"
          style={{
            background: "rgba(0,180,255,0.03)",
            border: "1px solid rgba(0,180,255,0.08)",
          }}
        >
          <div className="h-2.5 w-14 rounded skeleton-shimmer" />
          <div className="h-4 w-20 rounded-lg skeleton-shimmer" />
        </div>
        <div
          className="rounded-xl p-3 space-y-2"
          style={{
            background: "rgba(0,180,255,0.03)",
            border: "1px solid rgba(0,180,255,0.08)",
          }}
        >
          <div className="h-2.5 w-14 rounded skeleton-shimmer" />
          <div className="h-4 w-10 rounded-lg skeleton-shimmer" />
        </div>
      </div>

      {/* Status label */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <Loader2
          size={13}
          className="animate-spin flex-shrink-0"
          style={{ color: "#00b4ff" }}
        />
        <span
          className="text-xs"
          style={{ color: "#4a6a8a", fontFamily: "Space Grotesk, sans-serif" }}
        >
          Fetching token data…
        </span>
      </div>
    </div>
  );
}
