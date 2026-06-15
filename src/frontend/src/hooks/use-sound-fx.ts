/**
 * iOS-compatible sound FX via Web Audio API.
 * All sounds are synthesized — NO audio files (no CORS/network issues on iOS).
 * AudioContext is lazily initialized on first user gesture.
 * AudioContext bypasses the iOS silent switch — correct for app-like experiences.
 */

import { useCallback, useRef, useState } from "react";
import { primeHaptics } from "./use-haptics";

const STORAGE_KEY = "sound-enabled";

function readSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

let _ctx: AudioContext | null = null;

function getSharedCtx(): AudioContext | null {
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

function playTone(
  freq: number,
  endFreq: number | null,
  durationMs: number,
  type: OscillatorType,
  gainPeak: number,
  rampType: "linear" | "exponential" = "exponential",
): void {
  const ctx = getSharedCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const dur = durationMs / 1000;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  if (endFreq !== null) {
    if (rampType === "exponential") {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + dur);
    } else {
      osc.frequency.linearRampToValueAtTime(endFreq, now + dur);
    }
  }

  // Sharp attack, smooth decay
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.start(now);
  osc.stop(now + dur + 0.005);
}

/** Boost sound with reverb (delay node) — 300ms sweep + subtle echo */
function playBoostSound(): void {
  const ctx = getSharedCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  const dur = 0.3;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const delay = ctx.createDelay(0.2);
  const delayGain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  // Delay/reverb path
  gain.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(ctx.destination);
  delay.delayTime.setValueAtTime(0.05, now);
  delayGain.gain.setValueAtTime(0.06, now);

  osc.type = "sine";
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(1400, now + dur);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.start(now);
  osc.stop(now + dur + 0.1);
}

interface UseSoundFXOptions {
  soundEnabled?: boolean;
}

export function useSoundFX(options: UseSoundFXOptions = {}) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(
    options.soundEnabled !== undefined
      ? options.soundEnabled
      : readSoundEnabled,
  );
  const soundEnabledRef = useRef(soundEnabled);
  // Sync with external prop if provided
  if (
    options.soundEnabled !== undefined &&
    soundEnabledRef.current !== options.soundEnabled
  ) {
    soundEnabledRef.current = options.soundEnabled;
  } else {
    soundEnabledRef.current = soundEnabled;
  }

  const shouldPlay = useCallback((): boolean => {
    if (!soundEnabledRef.current) return false;
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        return false;
    } catch {
      // ignore
    }
    return true;
  }, []);

  /** Soft tap — 200Hz 25ms sine */
  const playClick = useCallback(() => {
    if (!shouldPlay()) return;
    primeHaptics();
    playTone(200, null, 25, "sine", 0.1);
  }, [shouldPlay]);

  /** Upward sweep — 400→900Hz 100ms sine */
  const playSuccess = useCallback(() => {
    if (!shouldPlay()) return;
    primeHaptics();
    playTone(400, 900, 100, "sine", 0.14);
  }, [shouldPlay]);

  /** Buzz — 180Hz 60ms sawtooth */
  const playError = useCallback(() => {
    if (!shouldPlay()) return;
    primeHaptics();
    playTone(180, null, 60, "sawtooth", 0.08);
  }, [shouldPlay]);

  /** Mid pop — 300→500Hz 40ms */
  const playSelect = useCallback(() => {
    if (!shouldPlay()) return;
    primeHaptics();
    playTone(300, 500, 40, "sine", 0.1);
  }, [shouldPlay]);

  /** Power surge with reverb — 300→1400Hz 300ms exponential sweep */
  const playBoost = useCallback(() => {
    if (!shouldPlay()) return;
    primeHaptics();
    playBoostSound();
  }, [shouldPlay]);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  /** Legacy API: playSound("click" | "success" | "error" | "select" | "boost") */
  const playSound = useCallback(
    (type: "click" | "success" | "error" | "select" | "boost") => {
      switch (type) {
        case "click":
          return playClick();
        case "success":
          return playSuccess();
        case "error":
          return playError();
        case "select":
          return playSelect();
        case "boost":
          return playBoost();
      }
    },
    [playClick, playSuccess, playError, playSelect, playBoost],
  );

  /** Legacy API: unlockAudio() — primes AudioContext on iOS */
  const unlockAudio = useCallback(() => {
    primeHaptics();
    getSharedCtx();
  }, []);

  return {
    playClick,
    playSuccess,
    playError,
    playSelect,
    playBoost,
    playSound,
    unlockAudio,
    soundEnabled:
      options.soundEnabled !== undefined ? options.soundEnabled : soundEnabled,
    toggleSound,
  };
}
