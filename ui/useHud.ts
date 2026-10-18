"use client";
import { useSyncExternalStore } from "react";
import type { HudStore, HudSnapshot } from "@/game/hud";

export function useHud(store: HudStore): HudSnapshot {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
