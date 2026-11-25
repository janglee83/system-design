"use client";
import { useEffect } from "react";
import { usePlaybackApi } from "../store/LabStores";

/** Drives the playback clock with one requestAnimationFrame loop while playing (a frame's dt is capped at 100 ms). */
export function usePlaybackLoop(): void {
  const api = usePlaybackApi();
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      const dt = last ? Math.min(100, now - last) : 0;
      last = now;
      api.getState().tick(dt);
      if (api.getState().playing) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    if (api.getState().playing) start();
    const unsub = api.subscribe((s, prev) => {
      if (s.playing && !prev.playing) start();
    });
    return () => {
      unsub();
      cancelAnimationFrame(raf);
    };
  }, [api]);
}
