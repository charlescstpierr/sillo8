"use client";
import { useEffect, useRef, useState } from "react";
import { Engine } from "@/game/engine";
import { Hud, Notice } from "./Hud";
import { Overlay } from "./Overlay";
import { applyStartupSettings } from "./settings";
import { TouchControls } from "./TouchControls";

function storage() {
  try {
    const probe = "__silo9_probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const params = new URLSearchParams(window.location.search);
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let instance: Engine | null = null;
    let cancelled = false;
    // Les polices servent aussi aux pancartes dessinées dans les textures.
    document.fonts.ready.then(() => Promise.all([
      document.fonts.load("40px 'Special Elite'"),
      document.fonts.load("40px 'Patrick Hand'"),
    ])).catch(() => undefined).then(() => {
      if (cancelled) return;
      const urlLow = params.get("low");
      instance = new Engine(canvas, { lowQuality: urlLow === "1" || (coarse && urlLow !== "0"), storage: storage() });
      applyStartupSettings(instance, urlLow);
      // On démarre sur le menu ; newGame() envoie lui-même le message d'accueil.
      instance.setMode("menu");
      instance.start();
      (window as unknown as { __silo?: Engine }).__silo = instance;
      setEngine(instance);
    });
    return () => {
      cancelled = true;
      instance?.dispose();
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }} tabIndex={0} />
      {engine ? <Hud engine={engine} /> : null}
      {engine ? <TouchControls engine={engine} /> : null}
      {engine ? <Overlay engine={engine} /> : null}
      {engine ? <Notice engine={engine} /> : null}
    </div>
  );
}
