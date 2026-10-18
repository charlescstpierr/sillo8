// Armes et SCAN ÉCHO : D9, ARC-3, onde au sol. Implémentation complète à venir (sous-agent « combat »).
// Le moteur appelle update() à chaque image avec les commandes du joueur.
import { Mesh, MeshBasicMaterial, SphereGeometry, type Scene } from "three";
import type { PlayerController } from "./player";
import type { SiloState } from "./state";
import type { Horde } from "./types";
import type { WorldView } from "./render/world";
import type { OperatorRig } from "./render/operator";

export interface CombatHost {
  scene: Scene;
  state: SiloState;
  player: PlayerController;
  operator: OperatorRig;
  horde: Horde;
  world: WorldView;
  notify(text: string): void;
  /** Propage un bruit aux zombies (tir, scan). */
  noise(x: number, z: number, radius: number): void;
}

export interface CombatInput {
  /** Gâchette maintenue (clic gauche, RT, bouton TIR). */
  firing: boolean;
  /** Décharge ARC-3 directe (clic droit, LT, bouton ARC). */
  arc: boolean;
  scan: boolean;
  weapon1: boolean;
  weapon2: boolean;
}

export class Combat {
  /** 0 = D9, 1 = ARC-3. */
  weapon: 0 | 1 = 0;
  private flash: Mesh;

  constructor(private host: CombatHost) {
    this.flash = new Mesh(new SphereGeometry(0.11, 8, 6), new MeshBasicMaterial({ color: "#ffe28a", transparent: true, opacity: 0.95 }));
    this.flash.visible = false;
    this.flash.position.set(0, -0.36, 0.02);
    host.operator.gun.add(this.flash);
  }

  update(dt: number, input: CombatInput): void {
    void dt;
    const { player, state } = this.host;
    if (input.firing && player.tryFire(() => state.fireRound())) {
      this.flash.visible = true;
    }
    if (player.shotTime < 0.12) this.flash.visible = false;
  }

  setLowQuality(low: boolean): void {
    void low;
  }
}
