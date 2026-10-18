"use client";
import { useSyncExternalStore } from "react";
import type { UiStore, UiSnapshot } from "@/game/ui";

export function useUi(store: UiStore): UiSnapshot {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
