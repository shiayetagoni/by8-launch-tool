import { useCallback, useEffect, useState } from "react";

const SOUND_ENABLED_KEY = "sound-enabled";

function readSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

export function usePreferences() {
  const [soundEnabled, setSoundEnabledState] =
    useState<boolean>(readSoundEnabled);

  // Sync to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled));
    } catch {
      // ignore storage errors (private browsing, quota, etc.)
    }
  }, [soundEnabled]);

  const setSoundEnabled = useCallback((value: boolean) => {
    setSoundEnabledState(value);
  }, []);

  return { soundEnabled, setSoundEnabled };
}
