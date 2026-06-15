/**
 * Super-fast iOS-compatible haptic engine via AudioContext.
 * Uses synthesized micro-tones as haptic substitutes (works on iOS Safari).
 * Single shared AudioContext, lazy-initialized on first user gesture.
 * NO navigator.vibrate — not supported on iOS Safari.
 */

import { useEffect } from "react";

export type HapticPattern =
  | "tap"
  | "select"
  | "confirm"
  | "success"
  | "error"
  | "copy"
  | "navigation"
  | "unlock"
  | "click"; // alias for tap

let _ctx: AudioContext | null = null;
let _primed = false;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx) {
      const AC =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      _ctx = new AC();
    }
    if (_ctx.state === "suspended") {
      void _ctx.resume();
    }
    return _ctx;
  } catch {
    return null;
  }
}

/** Fire a single oscillator burst — atomic unit of haptic feedback */
function burst(
  ctx: AudioContext,
  freq: number,
  durationMs: number,
  startOffset = 0,
  type: OscillatorType = "sine",
  gain = 0.0012,
): void {
  const t0 = ctx.currentTime + startOffset;
  const dur = durationMs / 1000;

  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);

  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.0008);
  g.gain.exponentialRampToValueAtTime(0.00001, t0 + dur);

  osc.start(t0);
  osc.stop(t0 + dur + 0.001);
}

/**
 * Subtle "tick" sound for live counter increments.
 * Barely audible — volume 0.03, 2ms, 1400Hz.
 */
export function playCounterTick(): void {
  const ctx = getCtx();
  if (!ctx) return;
  burst(ctx, 1400, 2, 0, "sine", 0.00008);
}

/**
 * Global haptic singleton — callable from anywhere without hooks.
 * Fires INSTANTLY via currentTime scheduling, zero async overhead.
 */
export function haptic(pattern: HapticPattern = "tap"): void {
  const ctx = getCtx();
  if (!ctx) return;

  switch (pattern) {
    case "tap":
    case "click":
      // 8ms at 1000Hz — lightest possible tap
      burst(ctx, 1000, 8, 0, "sine", 0.0008);
      break;

    case "select":
      // Two 6ms bursts: 800Hz then 1200Hz — snappy selection feel
      burst(ctx, 800, 6, 0, "sine", 0.001);
      burst(ctx, 1200, 6, 0.022, "sine", 0.0012);
      break;

    case "confirm":
      // Triple: 900Hz → 1150Hz → 1400Hz — decisive confirmation
      burst(ctx, 900, 8, 0, "sine", 0.001);
      burst(ctx, 1150, 16, 0.014, "sine", 0.0015);
      burst(ctx, 1400, 8, 0.038, "sine", 0.0018);
      break;

    case "success":
      // Rising triple: 800 → 1100 → 1500Hz — satisfying reward
      burst(ctx, 800, 10, 0, "sine", 0.001);
      burst(ctx, 1100, 14, 0.022, "sine", 0.0015);
      burst(ctx, 1500, 22, 0.048, "sine", 0.002);
      break;

    case "error":
      // 50ms sawtooth at 250Hz — intentionally wrong feel
      burst(ctx, 250, 50, 0, "sawtooth", 0.0018);
      break;

    case "copy":
      // Two tight 10ms bursts at 1200Hz — crisp copy feel
      burst(ctx, 1200, 10, 0, "sine", 0.0012);
      burst(ctx, 1200, 10, 0.018, "sine", 0.001);
      break;

    case "navigation":
      // 6ms at 700Hz — minimal tab switch feedback
      burst(ctx, 700, 6, 0, "sine", 0.0008);
      break;

    case "unlock":
      // Ascending unlock: 600Hz → 900Hz → 1200Hz → 1500Hz
      // 15ms each, 10ms gaps — premium ascending unlock feel
      burst(ctx, 600, 15, 0, "sine", 0.0012);
      burst(ctx, 900, 15, 0.025, "sine", 0.0014);
      burst(ctx, 1200, 15, 0.05, "sine", 0.0016);
      burst(ctx, 1500, 15, 0.075, "sine", 0.0018);
      break;
  }
}

/**
 * Chained haptic — fires pattern A immediately, then pattern B after delayMs.
 * Used for: tier selection (select → confirm@60ms), form submit (confirm → success@60ms).
 */
export function hapticChain(
  patternA: HapticPattern,
  patternB: HapticPattern,
  delayMs = 60,
): void {
  haptic(patternA);
  setTimeout(() => haptic(patternB), delayMs);
}

/**
 * Triple chained haptic — fires A, then B after first delay, then C after second delay.
 * Used for: achievement unlocks (select → confirm@60ms → unlock@120ms)
 */
export function hapticChain3(
  patternA: HapticPattern,
  patternB: HapticPattern,
  patternC: HapticPattern,
  delayA = 60,
  delayB = 120,
): void {
  haptic(patternA);
  setTimeout(() => haptic(patternB), delayA);
  setTimeout(() => haptic(patternC), delayA + delayB);
}

/**
 * Pre-warm AudioContext on first user gesture.
 * Must be called in a touch/click handler to unlock iOS Safari.
 * Safe to call multiple times — no-ops after first call.
 */
export function primeHaptics(): void {
  if (_primed) return;
  const ctx = getCtx();
  if (!ctx) return;
  // Play a zero-gain silent burst to unlock the context on iOS
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  g.gain.setValueAtTime(0, t);
  osc.start(t);
  osc.stop(t + 0.001);
  _primed = true;
}

/**
 * React hook that attaches a passive touchstart listener to prime
 * the AudioContext on first user interaction (iOS Safari requirement).
 * Returns triggerHaptic for convenience.
 */
export function useHaptics() {
  useEffect(() => {
    const handler = () => {
      primeHaptics();
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("mousedown", handler);
    };
    document.addEventListener("touchstart", handler, { passive: true });
    document.addEventListener("mousedown", handler, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  return { triggerHaptic: haptic };
}
