/**
 * BY8 Launch Tool — Zustand App Store
 * Manages onboarding state, token data, and app-wide preferences.
 * Uses localStorage persistence for onboarding progress.
 */

import type {
  Goal,
  LaunchTimeline,
  OnboardingState,
  PathChoice,
  TrackingWindow,
  VerifiedTokenData,
} from "@/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// ── Onboarding slice ────────────────────────────────────────────────────────────

const DEFAULT_ONBOARDING: OnboardingState = {
  path: null,
  step: 0,
  ca: "",
  tokenMeta: null,
  goal: null,
  timeline: "Already launched",
  description: "",
  trackingWindow: "7d",
};

// ── App preferences slice ───────────────────────────────────────────────────────

interface AppPreferencesSlice {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
}

// ── Full store interface ────────────────────────────────────────────────────────

interface AppStore extends AppPreferencesSlice {
  onboarding: OnboardingState;
  setOnboardingPath: (path: PathChoice) => void;
  setOnboardingStep: (step: number) => void;
  setOnboardingCa: (ca: string) => void;
  setOnboardingTokenMeta: (meta: VerifiedTokenData | null) => void;
  setOnboardingGoal: (goal: Goal | null) => void;
  setOnboardingTimeline: (timeline: LaunchTimeline) => void;
  setOnboardingDescription: (description: string) => void;
  setTrackingWindow: (window: TrackingWindow) => void;
  resetOnboarding: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // ── Onboarding ──
      onboarding: DEFAULT_ONBOARDING,
      setOnboardingPath: (path) =>
        set((s) => ({ onboarding: { ...s.onboarding, path } })),
      setOnboardingStep: (step) =>
        set((s) => ({ onboarding: { ...s.onboarding, step } })),
      setOnboardingCa: (ca) =>
        set((s) => ({ onboarding: { ...s.onboarding, ca } })),
      setOnboardingTokenMeta: (tokenMeta) =>
        set((s) => ({ onboarding: { ...s.onboarding, tokenMeta } })),
      setOnboardingGoal: (goal) =>
        set((s) => ({ onboarding: { ...s.onboarding, goal } })),
      setOnboardingTimeline: (timeline) =>
        set((s) => ({ onboarding: { ...s.onboarding, timeline } })),
      setOnboardingDescription: (description) =>
        set((s) => ({ onboarding: { ...s.onboarding, description } })),
      setTrackingWindow: (trackingWindow) =>
        set((s) => ({ onboarding: { ...s.onboarding, trackingWindow } })),
      resetOnboarding: () => set({ onboarding: DEFAULT_ONBOARDING }),

      // ── Preferences ──
      soundEnabled: true,
      hapticsEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    {
      name: "by8-app-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist these keys — don't persist transient UI state
      partialize: (state) => ({
        onboarding: state.onboarding,
        soundEnabled: state.soundEnabled,
        hapticsEnabled: state.hapticsEnabled,
      }),
    },
  ),
);
