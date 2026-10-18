// Point d'entrée de la version « page unique » (artifact claude.ai) : le jeu sans Next.js.
import { createRoot } from "react-dom/client";
import GameCanvas from "@/ui/GameCanvas";
import "./page.css";

createRoot(document.getElementById("sillo8")!).render(<GameCanvas />);
