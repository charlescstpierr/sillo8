"use client";
import { useSyncExternalStore } from "react";
import type { InquirySnapshot, InquiryStore } from "@/game/investigation/director";

export function useInquiry(store: InquiryStore): InquirySnapshot {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
