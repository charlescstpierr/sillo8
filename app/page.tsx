"use client";
import dynamic from "next/dynamic";

const GameCanvas = dynamic(() => import("@/ui/GameCanvas"), { ssr: false });

export default function Home() {
  return <GameCanvas />;
}
