"use client";
// Sous-titres des sons : une ou deux petites lignes discrètes en bas de l'écran (« [grognement à gauche] »).
// Branchés sur les sons demandés (engine.audio.listen) : ils s'affichent même son coupé, sans toucher au son.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Engine } from "@/game/engine";
import { captionFor } from "@/game/captions";
import { a11yStore, captionsActive, soundMuted } from "./accessibility";
import styles from "./hud.module.css";

interface Line {
  id: number;
  key: string;
  text: string;
  danger: boolean;
  until: number;
}

/** Durée d'affichage d'une ligne (ms) et nombre de lignes à la fois. */
const LIFE = 3200;
const MAX_LINES = 2;

function coarsePointer(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}

export function Captions({ engine, touch }: { engine: Engine; touch: boolean }) {
  const settings = useSyncExternalStore(a11yStore.subscribe, a11yStore.get, a11yStore.get);
  const [lines, setLines] = useState<Line[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef({ settings, touch });
  live.current = { settings, touch };

  useEffect(() => {
    let next = 1;
    return engine.audio.listen((sound) => {
      const { settings: s, touch: t } = live.current;
      if (!captionsActive(s.captions, t || coarsePointer(), soundMuted(engine.audio))) return;
      if (engine.ui.get().mode !== "playing") return;
      const caption = captionFor(sound);
      if (!caption) return;
      const until = performance.now() + LIFE;
      setLines((old) => {
        const same = old.find((l) => l.key === caption.key);
        if (same) return old.map((l) => (l === same ? { ...l, text: caption.text, danger: caption.danger, until } : l));
        return [...old, { id: next++, ...caption, until }].slice(-MAX_LINES);
      });
    });
  }, [engine]);

  // Les lignes s'effacent d'elles-mêmes.
  useEffect(() => {
    if (lines.length === 0) return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      setLines((old) => (old.some((l) => l.until <= now) ? old.filter((l) => l.until > now) : old));
    }, 250);
    return () => window.clearInterval(timer);
  }, [lines.length]);

  // Réglage coupé : on vide l'écran.
  useEffect(() => {
    if (settings.captions === "off") setLines([]);
  }, [settings.captions]);

  // Jamais sous une bulle de conseil ou un avis : on remonte juste au-dessus d'eux.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty("bottom");
    if (lines.length === 0) return;
    const box = el.getBoundingClientRect();
    let top = box.top;
    for (const other of document.querySelectorAll<HTMLElement>("[data-avoid-captions]")) {
      const r = other.getBoundingClientRect();
      if (r.width === 0 || r.right < box.left || r.left > box.right) continue;
      if (r.bottom > top - 4 && r.top < box.bottom) top = Math.min(top, r.top - 6 - box.height);
    }
    if (top < box.top) el.style.bottom = `${window.innerHeight - top - box.height}px`;
  });

  return (
    <div ref={ref} className={styles.captions} role="log" aria-live="polite" aria-label="Sous-titres des sons" data-count={lines.length}>
      {lines.map((l) => (
        <p key={l.id} className={styles.caption} data-danger={l.danger || undefined}>{l.text}</p>
      ))}
    </div>
  );
}
