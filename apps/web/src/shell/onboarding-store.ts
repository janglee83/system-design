import { create } from "zustand";
import { ONBOARDING_KEY, parseOnboarding, type OnboardingState, type OnboardingTask } from "./onboarding-model";

/** First-run progress, kept in this browser (`sd-onboarding`). Shared by the Lab card and the Help menu. */
export const useOnboarding = create<
  OnboardingState & { loaded: boolean; load(): void; setDone(done: OnboardingTask[]): void; hide(): void; reopen(): void }
>()((set, get) => {
  const save = () => {
    try {
      window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ hidden: get().hidden, done: get().done }));
    } catch {
      // storage blocked: progress lasts for this page only
    }
  };
  return {
    hidden: false,
    done: [],
    loaded: false,
    load() {
      let raw: string | null = null;
      try {
        raw = window.localStorage.getItem(ONBOARDING_KEY);
      } catch {
        // storage blocked: start fresh
      }
      set({ ...parseOnboarding(raw), loaded: true });
    },
    setDone(done) {
      if (done.length === get().done.length && done.every((d, i) => d === get().done[i])) return;
      set({ done });
      save();
    },
    hide() {
      set({ hidden: true });
      save();
    },
    reopen() {
      set({ hidden: false });
      save();
    },
  };
});
