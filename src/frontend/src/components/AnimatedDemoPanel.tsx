/**
 * BY8 Launch Tool — Animated Demo Panel
 * User-controlled demo: click "Play Demo" to run once (no loop, no auto-start).
 * Performance: RAF cleanup on unmount, GPU-promoted elements, CSS transitions only.
 */

import { haptic } from "@/hooks/use-haptics";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const DEMO_CA = "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr";
const DEMO_TICKER = "APEX";

const ACTIVITY_MSGS = [
  `New engagement signal detected for $${DEMO_TICKER}`,
  `$${DEMO_TICKER} added to discovery feed`,
  `Visibility spike +8% — ${DEMO_TICKER}`,
  "Trader connected to launch network",
  `Engagement +7% on $${DEMO_TICKER}`,
  "Low activity window — monitoring",
  `Discovery placement increased for $${DEMO_TICKER}`,
  "Visibility engine recalibrating…",
  `$${DEMO_TICKER} trending in launch cohort`,
];

type Scene = 1 | 2 | 3 | 4;

// ─── Counter animation — proper RAF cleanup ───────────────────────────────────

function useAnimatedCounter(
  target: number,
  durationMs: number,
  running: boolean,
  delay = 0,
) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!running) {
      setValue(0);
      startRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      startRef.current = null;
      const step = (ts: number) => {
        if (startRef.current === null) startRef.current = ts;
        const elapsed = ts - startRef.current;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - (1 - progress) ** 3;
        setValue(Math.round(eased * target));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, durationMs, running, delay]);

  return value;
}

// ─── Terminal text animation ──────────────────────────────────────────────────

function TypewriterText({ text, running }: { text: string; running: boolean }) {
  const [displayed, setDisplayed] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!running) {
      setDisplayed("");
      return;
    }
    let i = 0;
    const type = () => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
        timerRef.current = setTimeout(type, 30);
      }
    };
    type();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, running]);

  return (
    <span
      className="terminal-cursor"
      style={{ fontFamily: "JetBrains Mono, monospace", color: "#00b4ff" }}
    >
      {displayed}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AnimatedDemoPanelProps {
  className?: string;
}

export default function AnimatedDemoPanel({
  className = "",
}: AnimatedDemoPanelProps) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [scene, setScene] = useState<Scene>(1);
  const [activityIdx, setActivityIdx] = useState(0);
  const [visibilityPct, setVisibilityPct] = useState(0);
  const [showVerifiedFlash, setShowVerifiedFlash] = useState(false);
  const [activityVisible, setActivityVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visRafRef = useRef<number | null>(null);
  const visTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeViews = useAnimatedCounter(2340, 3200, scene >= 3, 500);
  const traderConn = useAnimatedCounter(847, 3000, scene >= 3, 700);

  // Cleanup all timers and RAFs on unmount
  useEffect(() => {
    return () => {
      if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      if (visTimerRef.current) clearTimeout(visTimerRef.current);
      if (visRafRef.current !== null) cancelAnimationFrame(visRafRef.current);
    };
  }, []);

  // Animate visibility counter using RAF properly
  useEffect(() => {
    if (visTimerRef.current) {
      clearTimeout(visTimerRef.current);
      visTimerRef.current = null;
    }
    if (visRafRef.current !== null) {
      cancelAnimationFrame(visRafRef.current);
      visRafRef.current = null;
    }

    if (scene === 1 || !started) {
      setVisibilityPct(0);
      return;
    }

    const configs: { from: number; target: number; dur: number }[] = [
      { from: 0, target: 38, dur: 2800 }, // scene 2
      { from: 38, target: 66, dur: 5500 }, // scene 3
      { from: 66, target: 82, dur: 2000 }, // scene 4
    ];
    const cfg = configs[scene - 2];
    if (!cfg) return;

    const startTime = performance.now();
    const ease =
      scene === 4
        ? (p: number) => 1 - (1 - p) ** 3
        : (p: number) => 1 - (1 - p) ** 2;

    const step = (now: number) => {
      const p = Math.min((now - startTime) / cfg.dur, 1);
      setVisibilityPct(
        Math.round(cfg.from + ease(p) * (cfg.target - cfg.from)),
      );
      if (p < 1) {
        visRafRef.current = requestAnimationFrame(step);
      } else {
        visRafRef.current = null;
      }
    };
    visRafRef.current = requestAnimationFrame(step);

    return () => {
      if (visRafRef.current !== null) {
        cancelAnimationFrame(visRafRef.current);
        visRafRef.current = null;
      }
    };
  }, [scene, started]);

  // Advance activity feed — only triggered by scene progression (not a loop)
  const advanceActivity = useCallback(() => {
    setActivityVisible(false);
    activityTimerRef.current = setTimeout(() => {
      setActivityIdx((i) => (i + 1) % ACTIVITY_MSGS.length);
      setActivityVisible(true);
    }, 220);
  }, []);

  // Scene sequencing — runs ONCE, no loop
  const runScenes = useCallback(() => {
    setScene(1);
    setDone(false);
    setShowVerifiedFlash(false);
    setVisibilityPct(0);
    setActivityIdx(0);

    sceneTimerRef.current = setTimeout(() => {
      setScene(2);
      setShowVerifiedFlash(true);
      setTimeout(() => setShowVerifiedFlash(false), 1100);

      sceneTimerRef.current = setTimeout(() => {
        setScene(3);
        advanceActivity();

        sceneTimerRef.current = setTimeout(() => {
          advanceActivity();

          sceneTimerRef.current = setTimeout(() => {
            setScene(4);
            advanceActivity();

            sceneTimerRef.current = setTimeout(() => {
              // Demo complete — no restart
              setDone(true);
            }, 3200);
          }, 3100);
        }, 3100);
      }, 3000);
    }, 3100);
  }, [advanceActivity]);

  const handlePlay = useCallback(() => {
    haptic("confirm");
    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    if (visTimerRef.current) clearTimeout(visTimerRef.current);
    if (visRafRef.current !== null) {
      cancelAnimationFrame(visRafRef.current);
      visRafRef.current = null;
    }
    setStarted(true);
    setDone(false);
    runScenes();
  }, [runScenes]);

  const visColor = scene >= 4 ? "#00ff87" : "#00b4ff";

  return (
    <div
      ref={containerRef}
      className={`card-glass rounded-2xl overflow-hidden relative ${className}`}
      style={{
        border: "1px solid rgba(0,196,255,0.16)",
        contain: "layout paint",
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
    >
      {/* Scanning line at top — translateY only, only while demo is running */}
      <div
        className="pointer-events-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "2px",
          background:
            "linear-gradient(90deg, transparent, rgba(0,196,255,0.7), rgba(181,111,255,0.5), transparent)",
          animation:
            started && !done && scene >= 2
              ? "scan-line 2.4s ease-in-out infinite"
              : "none",
          zIndex: 10,
          willChange: "transform, opacity",
        }}
        aria-hidden
      />

      {/* Chrome bar */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{
          background: "rgba(0,180,255,0.06)",
          borderBottom: "1px solid rgba(0,180,255,0.1)",
        }}
      >
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: "rgba(255,90,90,0.7)" }}
        />
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: "rgba(255,200,50,0.7)" }}
        />
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: "rgba(80,200,120,0.7)" }}
        />
        <span
          className="ml-3 text-xs font-mono"
          style={{
            color: "rgba(136,146,164,0.7)",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          BY8 · Token Visibility Dashboard
        </span>
        <span
          className="ml-auto flex items-center gap-1.5 text-xs"
          style={{
            color:
              !started || scene === 1
                ? "#8892a4"
                : done
                  ? "#00ff87"
                  : "#00b4ff",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {!started ? (
            "Ready"
          ) : done ? (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#00ff87" }}
              />
              Complete
            </>
          ) : scene === 1 ? (
            "Initializing…"
          ) : (
            <>
              <span
                className="pulse-dot w-1.5 h-1.5 rounded-full"
                style={{ background: "#00b4ff" }}
              />
              LIVE
            </>
          )}
        </span>
      </div>

      {/* Pre-start state */}
      {!started && (
        <div
          className="p-6 flex flex-col items-center justify-center gap-4 min-h-[220px]"
          data-ocid="demo.idle_state"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(0,180,255,0.08)",
              border: "1px solid rgba(0,180,255,0.2)",
            }}
          >
            <span style={{ fontSize: 24 }}>▶</span>
          </div>
          <div className="text-center">
            <p
              className="font-semibold text-sm"
              style={{
                color: "#f0f4f8",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              Live Analytics Demo
            </p>
            <p className="text-xs mt-1" style={{ color: "#8892a4" }}>
              See how BY8 tracks token visibility in real time
            </p>
          </div>
          <button
            type="button"
            className="btn-3d px-6 py-2.5 rounded-xl text-sm font-semibold"
            onClick={handlePlay}
            data-ocid="demo.play_button"
          >
            ▶ Play Demo
          </button>
        </div>
      )}

      {/* Scene 1: CA verification */}
      {started && scene === 1 && !done && (
        <div className="p-4 space-y-3" data-ocid="demo.scene1">
          <div
            className="rounded-xl p-3 space-y-2"
            style={{
              background: "rgba(0,180,255,0.04)",
              border: "1px solid rgba(0,180,255,0.12)",
            }}
          >
            <p
              className="text-xs font-semibold"
              style={{
                color: "#8892a4",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              Contract Address
            </p>
            <p
              className="text-xs break-all"
              style={{
                color: "rgba(240,244,248,0.55)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              {DEMO_CA}
            </p>
          </div>
          <div
            className="rounded-xl p-3 flex items-center gap-3"
            style={{
              background: "rgba(0,180,255,0.05)",
              border: "1px solid rgba(0,180,255,0.15)",
            }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 flex-shrink-0"
              style={{
                borderColor: "#00b4ff",
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
                willChange: "transform",
              }}
            />
            <div>
              <p
                className="text-xs font-semibold"
                style={{
                  color: "#f0f4f8",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                Verifying contract address…
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "#8892a4" }}>
                <TypewriterText
                  text="Querying on-chain API for token metadata"
                  running={started}
                />
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["Token Name", "Symbol", "Supply", "Decimals"].map((f) => (
              <div key={f} className="space-y-1">
                <p className="text-[10px]" style={{ color: "#4a5568" }}>
                  {f}
                </p>
                <div className="h-4 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scene 2: Verified → initializing metrics */}
      {started && scene === 2 && !done && (
        <div className="p-4 space-y-3" data-ocid="demo.scene2">
          {showVerifiedFlash && (
            <div
              className="rounded-xl p-2 flex items-center gap-2"
              style={{
                background: "rgba(0,255,135,0.06)",
                border: "1px solid rgba(0,255,135,0.25)",
                animation: "card-entrance 0.28s ease both",
                willChange: "transform, opacity",
              }}
            >
              <span style={{ color: "#00ff87", fontSize: 14 }}>✓</span>
              <span
                className="text-xs font-bold"
                style={{
                  color: "#00ff87",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                Token verified — ${DEMO_TICKER}
              </span>
            </div>
          )}
          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(0,255,135,0.03)",
              border: "1px solid rgba(0,255,135,0.15)",
            }}
          >
            <div className="grid grid-cols-2 gap-y-2 gap-x-3">
              {[
                [
                  "Token Name",
                  `${DEMO_TICKER} Protocol`,
                  "#f0f4f8",
                  "Space Grotesk",
                ],
                ["Symbol", `$${DEMO_TICKER}`, "#00b4ff", "JetBrains Mono"],
                ["Supply", "1.00B", "#f0f4f8", "JetBrains Mono"],
                ["Network", "Solana", "#00b4ff", "JetBrains Mono"],
              ].map(([label, val, color, font]) => (
                <div key={label}>
                  <p className="text-[10px]" style={{ color: "#4a5568" }}>
                    {label}
                  </p>
                  <p
                    className="text-xs font-bold"
                    style={{ color, fontFamily: `${font}, sans-serif` }}
                  >
                    {val}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div
            className="rounded-xl p-3"
            style={{
              background: "rgba(0,180,255,0.04)",
              border: "1px solid rgba(0,180,255,0.1)",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(136,146,164,0.8)" }}
              >
                Visibility Score
              </span>
              <span
                className="text-xs font-bold tabular-nums"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#00b4ff",
                }}
              >
                +{visibilityPct}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(0,180,255,0.1)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${visibilityPct}%`,
                  background: "linear-gradient(90deg, #00b4ff, #b366ff)",
                  transition: "width 0.12s linear",
                  willChange: "width",
                }}
              />
            </div>
            <p className="text-[10px] mt-1" style={{ color: "#4a5568" }}>
              Analyzing real-time engagement signals…
            </p>
          </div>
        </div>
      )}

      {/* Scene 3+: Live analytics */}
      {started && scene >= 3 && !done && (
        <div className="p-4 space-y-3" data-ocid="demo.scene3">
          <div className="grid grid-cols-2 gap-2">
            {/* Visibility */}
            <div
              className="rounded-xl p-3"
              style={{
                background:
                  scene >= 4 ? "rgba(0,255,135,0.05)" : "rgba(0,180,255,0.05)",
                border: `1px solid ${scene >= 4 ? "rgba(0,255,135,0.2)" : "rgba(0,180,255,0.1)"}`,
                transition: "background 0.5s ease, border-color 0.5s ease",
                contain: "layout paint",
              }}
              data-ocid="demo.visibility_score.card"
            >
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(136,146,164,0.8)" }}
              >
                Visibility Score
              </span>
              <div className="flex items-end gap-1 mt-0.5">
                <span
                  className="text-2xl font-bold tabular-nums"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    color: visColor,
                    textShadow: `0 0 10px ${visColor}55`,
                    transition: "color 0.5s ease",
                  }}
                >
                  +{visibilityPct}%
                </span>
              </div>
              <div
                className="h-1 rounded-full mt-1 overflow-hidden"
                style={{ background: `${visColor}1a` }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${visibilityPct}%`,
                    background: `linear-gradient(90deg, ${visColor}, #b366ff)`,
                    transition: "width 0.12s linear",
                    willChange: "width",
                  }}
                />
              </div>
            </div>

            {/* Active Views */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(179,102,255,0.05)",
                border: "1px solid rgba(179,102,255,0.1)",
                contain: "layout paint",
              }}
              data-ocid="demo.active_views.card"
            >
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(136,146,164,0.8)" }}
              >
                Active Views
              </span>
              <span
                className="text-2xl font-bold tabular-nums block mt-0.5"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#b366ff",
                  textShadow: "0 0 10px rgba(179,102,255,0.35)",
                }}
              >
                {activeViews.toLocaleString()}
              </span>
            </div>

            {/* Engagement */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(40,200,120,0.05)",
                border: "1px solid rgba(40,200,120,0.1)",
                contain: "layout paint",
              }}
              data-ocid="demo.engagement_rate.card"
            >
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(136,146,164,0.8)" }}
              >
                Engagement Rate
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    color: "#28c878",
                  }}
                >
                  {scene >= 4 ? "Stable" : "High"}
                </span>
                <span
                  className="pulse-dot w-2 h-2 rounded-full"
                  style={{ background: "#28c878" }}
                />
              </div>
            </div>

            {/* Traders */}
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(0,180,255,0.04)",
                border: "1px solid rgba(0,180,255,0.08)",
                contain: "layout paint",
              }}
              data-ocid="demo.trader_connections.card"
            >
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(136,146,164,0.8)" }}
              >
                Traders
              </span>
              <span
                className="text-2xl font-bold tabular-nums block mt-0.5"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  color: "#00d9ff",
                }}
              >
                {traderConn.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Activity feed — CSS transition on swap */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "rgba(10,14,26,0.8)",
              border: "1px solid rgba(100,60,200,0.12)",
              contain: "layout",
            }}
            data-ocid="demo.activity_feed"
          >
            <div
              className="flex items-center gap-2 px-3 py-1.5"
              style={{ borderBottom: "1px solid rgba(100,60,200,0.08)" }}
            >
              <span
                className="pulse-dot w-1.5 h-1.5 rounded-full"
                style={{ background: "#b366ff" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "rgba(136,146,164,0.6)" }}
              >
                Live Activity
              </span>
            </div>
            <div className="px-3 py-2.5 min-h-[32px] flex items-center">
              <p
                className="text-xs leading-relaxed"
                style={{
                  color: "rgba(240,244,248,0.75)",
                  fontFamily: "JetBrains Mono, monospace",
                  opacity: activityVisible ? 1 : 0,
                  transform: activityVisible
                    ? "translateY(0)"
                    : "translateY(4px)",
                  transition: "opacity 220ms ease, transform 220ms ease",
                  willChange: "opacity, transform",
                }}
                key={activityIdx}
              >
                {ACTIVITY_MSGS[activityIdx]}
              </p>
            </div>
          </div>

          {/* Scene 4 CTA */}
          {scene === 4 && (
            <div
              className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: "rgba(0,255,135,0.05)",
                border: "1px solid rgba(0,255,135,0.2)",
                animation: "card-entrance 0.36s ease both",
                willChange: "transform, opacity",
              }}
            >
              <div>
                <p
                  className="text-xs font-bold"
                  style={{
                    color: "#f0f4f8",
                    fontFamily: "Space Grotesk, sans-serif",
                  }}
                >
                  {DEMO_TICKER} is gaining early traction
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "#8892a4" }}>
                  Maintain consistent visibility to stabilize growth signals
                </p>
              </div>
              <span
                className="text-xs font-bold flex-shrink-0 px-2 py-1 rounded-lg"
                style={{
                  background: "rgba(0,255,135,0.1)",
                  color: "#00ff87",
                  border: "1px solid rgba(0,255,135,0.2)",
                }}
              >
                82%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Done state */}
      {done && (
        <div className="p-4 space-y-3" data-ocid="demo.complete_state">
          <div
            className="rounded-xl p-4 flex flex-col items-center gap-3 text-center"
            style={{
              background: "rgba(0,255,135,0.04)",
              border: "1px solid rgba(0,255,135,0.18)",
            }}
          >
            <span style={{ fontSize: 28 }}>✓</span>
            <div>
              <p
                className="text-sm font-bold"
                style={{
                  color: "#00ff87",
                  fontFamily: "Space Grotesk, sans-serif",
                }}
              >
                Demo Complete
              </p>
              <p className="text-[11px] mt-1" style={{ color: "#8892a4" }}>
                Visibility score reached 82% — tracking stabilized.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Play/Replay button — always shown when started */}
      {started && (
        <div className="px-4 pb-4">
          <button
            type="button"
            className="btn-3d-ghost w-full py-2 rounded-xl text-sm font-semibold transition-fast"
            onClick={handlePlay}
            data-ocid="demo.replay_button"
          >
            ↺ Replay Demo
          </button>
        </div>
      )}
    </div>
  );
}
