/**
 * Splash screen — 1.2s total, pure CSS animations (no framer-motion for iOS reliability).
 * sessionStorage gate prevents re-show on route changes.
 * Staged haptics: logo appear → tap@250ms, bar fill → select@400ms, complete → success@1.0s.
 * No halo ring — only CSS filter drop-shadow follows the pill shape exactly.
 * GPU-promoted: will-change on all animated elements, backface-visibility hidden.
 */

import { haptic, primeHaptics } from "@/hooks/use-haptics";
import { useEffect, useRef, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const BRAND = "BY8";
const TAG = "LAUNCH TOOL";

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [exiting, setExiting] = useState(false);
  const completedRef = useRef(false);

  const dismiss = () => {
    primeHaptics();
    if (!completedRef.current) {
      completedRef.current = true;
      haptic("success");
      sessionStorage.setItem("by8_splash_shown", "1");
      setExiting(true);
      setTimeout(onComplete, 260);
    }
  };

  useEffect(() => {
    // Stage 1: logo spring-in → tap haptic at 250ms
    const t0 = setTimeout(() => haptic("tap"), 250);
    // Stage 2: bar starts → select haptic at 400ms
    const t1 = setTimeout(() => haptic("select"), 400);
    // Stage 3: auto complete → success haptic at 1.0s, then fade out
    const t2 = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        haptic("success");
        sessionStorage.setItem("by8_splash_shown", "1");
        setExiting(true);
        setTimeout(onComplete, 260);
      }
    }, 1050);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <button
      type="button"
      className="splash-overlay"
      onClick={dismiss}
      style={{
        opacity: exiting ? 0 : 1,
        transition: exiting ? "opacity 0.26s ease-out" : "none",
        pointerEvents: exiting ? "none" : "auto",
        cursor: "default",
        border: "none",
        padding: 0,
        textAlign: "inherit",
        font: "inherit",
        outline: "none",
        width: "100%",
        height: "100%",
      }}
      aria-hidden="true"
      tabIndex={-1}
    >
      {/* Expanding radial glow behind logo */}
      <div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        aria-hidden
      >
        <div
          style={{
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(100,60,200,0.22) 0%, rgba(0,196,255,0.1) 40%, transparent 70%)",
            animation:
              "splash-glow-expand 0.45s cubic-bezier(0.34,1.2,0.64,1) 0.08s both",
            willChange: "transform, opacity",
            backfaceVisibility: "hidden",
          }}
        />
      </div>

      {/* Subtle grid lines — no animation, static */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(100,60,200,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(100,60,200,0.035) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div
        className="relative z-10 flex flex-col items-center"
        style={{ gap: "20px" }}
      >
        {/* Logo — spring overshoot: 0.65 → 1.04 → 1.0, faster (0.38s) */}
        <div
          style={{
            width: "152px",
            height: "152px",
            willChange: "transform, opacity",
            animation:
              "splash-logo-in 0.38s cubic-bezier(0.34,1.56,0.64,1) 0.06s both",
            backfaceVisibility: "hidden",
          }}
        >
          <img
            src="/assets/logo.png"
            alt="BY8 Launch Tool"
            draggable={false}
            fetchPriority="high"
            decoding="async"
            width={152}
            height={152}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              filter:
                "drop-shadow(0 0 28px rgba(100,60,200,0.75)) drop-shadow(0 0 12px rgba(0,196,255,0.45)) drop-shadow(0 2px 8px rgba(0,0,0,0.65))",
              willChange: "opacity",
              animation: "splash-glow-pulse 2s ease-in-out 0.42s infinite",
            }}
          />
        </div>

        {/* Brand name — character-by-character stagger */}
        <div
          className="text-center"
          style={{
            animation: "splash-text-reveal 0.32s ease-out 0.42s both",
            willChange: "opacity, transform",
          }}
        >
          <h1
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontWeight: 800,
              fontSize: "clamp(22px, 6vw, 28px)",
              marginBottom: "6px",
              display: "flex",
              gap: "0.02em",
              justifyContent: "center",
            }}
          >
            {BRAND.split("").map((char, i) => (
              <span
                key={char}
                style={{
                  background:
                    "linear-gradient(135deg, #00c4ff 0%, #b56fff 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  animation: `splash-char-reveal 0.25s ease-out ${0.42 + i * 0.055}s both`,
                  willChange: "opacity, transform",
                  letterSpacing: "0.3em",
                  backfaceVisibility: "hidden",
                }}
              >
                {char}
              </span>
            ))}
          </h1>
          <p
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "11px",
              color: "rgba(136,146,164,0.6)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              animation: "splash-char-reveal 0.28s ease-out 0.64s both",
              willChange: "opacity, transform",
            }}
          >
            {TAG}
          </p>
        </div>

        {/* Loading bar with gradient */}
        <div
          style={{
            width: "152px",
            height: "2px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "999px",
            overflow: "hidden",
            animation: "splash-text-reveal 0.2s ease-out 0.18s both",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "999px",
              background: "linear-gradient(90deg, #00c4ff, #b56fff, #00c4ff)",
              backgroundSize: "200% 100%",
              boxShadow: "0 0 10px rgba(0,196,255,0.8)",
              transformOrigin: "left center",
              animation:
                "splash-bar-fill 0.7s cubic-bezier(0.4, 0, 0.2, 1) 0.18s both, border-gradient-rotate 2s linear infinite",
              willChange: "transform",
              backfaceVisibility: "hidden",
            }}
          />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "10px",
            color: "rgba(136,146,164,0.45)",
            letterSpacing: "0.06em",
            animation: "splash-text-reveal 0.24s ease-out 0.76s both",
            willChange: "opacity, transform",
          }}
        >
          Launch Smarter. Get Seen Faster.
        </p>
      </div>
    </button>
  );
}
