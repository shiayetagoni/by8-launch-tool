/**
 * Bottom navigation — pure CSS transitions, no framer-motion.
 * Frosted glass: blur(16px) — reduced from 28px for GPU performance.
 * Safe-area-inset for iOS home indicator.
 * Haptic fires INSTANTLY on touchstart (not click) for native iOS feel.
 * Active tab has a pulsing dot indicator AND scale pop animation on switch.
 * 48px min touch targets. GPU promoted: transform: translateZ(0) + will-change.
 */

import { haptic, primeHaptics } from "@/hooks/use-haptics";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { BarChart3, Rocket, Users, Zap } from "lucide-react";
import { useRef, useState } from "react";

function WhaleIcon({
  className,
  strokeWidth,
}: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 14c0-4 3-7 8-7s8 3 8 7c0 2-1 3.5-2.5 4.5" />
      <path d="M4 14c-1 1-1.5 2-1.5 3.5C2.5 19 3.5 20 5 20h12c2 0 3-1 3-2.5" />
      <path d="M8 14c0 2 1 3 2 3" />
      <circle cx="14" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    label: "Launch",
    href: "/launch",
    icon: Rocket,
    ocid: "bottom_nav.launch_tab",
  },
  {
    label: "Tool",
    href: "/tool",
    icon: Zap,
    ocid: "bottom_nav.tool_tab",
  },
  {
    label: "Community",
    href: "/community",
    icon: Users,
    ocid: "bottom_nav.community_tab",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    ocid: "bottom_nav.analytics_tab",
  },
  {
    label: "Whale",
    href: "/whale",
    icon: WhaleIcon,
    ocid: "bottom_nav.whale_tab",
  },
] as const;

const HIDDEN_ROUTES = ["/", "/onboarding", "/dashboard"];

export default function BottomNav() {
  const location = useLocation();
  const [justTapped, setJustTapped] = useState<string | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (HIDDEN_ROUTES.includes(location.pathname)) {
    return null;
  }

  const isActive = (href: string) => location.pathname === href;

  const handleTap = (href: string) => {
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    setJustTapped(href);
    tapTimerRef.current = setTimeout(() => setJustTapped(null), 200);
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50"
      style={{
        background: "rgba(8, 13, 22, 0.95)",
        /* Reduced from 28px → 16px: visually still frosted, much lower GPU cost */
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 -1px 0 rgba(100,60,200,0.06), 0 -8px 28px rgba(0,0,0,0.45)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
        /* Own GPU compositing layer — never repaints on scroll */
        transform: "translateZ(0)",
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
      aria-label="Main navigation"
      data-ocid="bottom_nav"
    >
      <div className="flex items-stretch h-[60px] max-w-lg mx-auto px-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const tapped = justTapped === item.href;
          const Icon = item.icon;
          const activeColor = "#00c4ff";

          return (
            <Link
              key={item.href}
              to={item.href}
              onTouchStart={() => {
                primeHaptics();
                haptic("navigation");
                handleTap(item.href);
              }}
              onClick={() => {
                if (!("ontouchstart" in window)) {
                  haptic("navigation");
                  handleTap(item.href);
                }
              }}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 rounded-xl mx-0.5 my-1.5 relative select-none outline-none",
              )}
              style={{
                minHeight: "48px",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                /* Only transition transform + opacity — no background-color in transition */
                transition:
                  "transform 80ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 80ms ease",
                background: active
                  ? "linear-gradient(180deg, rgba(0,196,255,0.1) 0%, rgba(181,111,255,0.07) 100%)"
                  : "transparent",
                color: active ? activeColor : "rgba(136, 146, 164, 0.55)",
                boxShadow: active
                  ? "inset 0 1px 0 rgba(0,196,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.14), 0 2px 10px rgba(0,196,255,0.07)"
                  : "none",
              }}
              data-ocid={item.ocid}
            >
              {/* Pulsing dot indicator when active */}
              {active && (
                <span
                  className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #00c4ff, #b56fff)",
                    boxShadow: "0 0 5px rgba(0,196,255,0.9)",
                    animation: "pulse-glow 2s ease-in-out infinite",
                    willChange: "transform, opacity",
                  }}
                />
              )}

              {/* Icon — transform only, no filter on inactive */}
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  willChange: "transform",
                  transform: tapped
                    ? "scale(1.14) translateZ(0)"
                    : active
                      ? "scale(1.12) translateZ(0)"
                      : "scale(1) translateZ(0)",
                  transition: "transform 180ms cubic-bezier(0.34,1.56,0.64,1)",
                  backfaceVisibility: "hidden",
                }}
              >
                <Icon
                  className={cn("w-5 h-5")}
                  strokeWidth={active ? 2.3 : 1.8}
                  style={
                    active
                      ? { filter: "drop-shadow(0 0 6px rgba(0,196,255,0.65))" }
                      : undefined
                  }
                />
              </span>

              {/* Label */}
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  transition: "opacity 120ms ease",
                  opacity: active ? 1 : 0.6,
                  color: active ? activeColor : "rgba(136, 146, 164, 0.55)",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
