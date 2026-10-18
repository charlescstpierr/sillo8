// Entrées unifiées : clavier + souris, manette (twin-stick) et commandes tactiles.
// Les touches de déplacement utilisent les codes physiques : WASD en QWERTY devient ZQSD en AZERTY
// sans réglage, et la touche « Q / A » du carnet reste celle à gauche de la touche avancer.

export type Action =
  | "interact" | "reload" | "journal" | "inventory" | "pause" | "weapon1" | "weapon2" | "swap"
  | "save" | "load" | "light" | "heal" | "cell" | "perf"
  | LegacyAction;

/** Anciens noms tolérés le temps que l'interface migre (à retirer ensuite) : "arc" → "light", "scan" → "journal". */
type LegacyAction = "arc" | "scan";
const LEGACY: Record<LegacyAction, Action> = { arc: "light", scan: "journal" };
export type Device = "keyboard" | "gamepad" | "touch";

const KEY_ACTIONS: Record<string, Action> = {
  KeyE: "interact",
  KeyR: "reload",
  KeyQ: "journal",
  KeyJ: "journal",
  Tab: "inventory",
  Escape: "pause",
  Digit1: "weapon1",
  Digit2: "weapon2",
  F5: "save",
  F9: "load",
  KeyH: "heal",
  KeyB: "cell",
  F3: "perf",
};

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1], ArrowUp: [0, 1],
  KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

export class InputState {
  device: Device = "keyboard";
  /** Déplacement à l'écran : x vers la droite, y vers le haut (nord). Longueur ≤ 1. */
  readonly move = { x: 0, y: 0 };
  /** Stick de visée (manette) : longueur ≤ 1. */
  readonly aimStick = { x: 0, y: 0 };
  /** Curseur en coordonnées normalisées −1..1, ou null hors du canvas. */
  pointer: { x: number; y: number } | null = null;
  sprint = false;
  crouch = false;
  /** Tir maintenu, toutes sources confondues (calculé par update). */
  firing = false;
  mouseFiring = false;
  /** Tactile : déplacement par stick virtuel. */
  readonly touchMove = { x: 0, y: 0 };
  touchFiring = false;
  touchCrouch = false;
  zoomSteps = 0;
  private held = new Set<string>();
  private pressed = new Set<Action>();
  private gamepadPrev: boolean[] = [];
  private detach: (() => void) | null = null;

  /** Action déclenchée depuis la dernière lecture (consommée par l'appel). */
  consume(action: Action): boolean {
    return this.pressed.delete(action);
  }

  trigger(action: Action): void {
    this.pressed.add(LEGACY[action as LegacyAction] ?? action);
  }

  clearPressed(): void {
    this.pressed.clear();
  }

  takeZoom(): number {
    const z = this.zoomSteps;
    this.zoomSteps = 0;
    return z;
  }

  /** Relâche tout : utile à la pause ou en perdant le focus. */
  releaseAll(): void {
    this.held.clear();
    this.mouseFiring = false;
    this.touchFiring = false;
    this.sprint = false;
    this.touchMove.x = this.touchMove.y = 0;
    this.update();
  }

  keyDown(code: string, repeat = false): boolean {
    this.device = "keyboard";
    if (code in MOVE_KEYS || code.startsWith("Shift") || code.startsWith("Control") || code === "KeyC") {
      this.held.add(code);
      return true;
    }
    const action = KEY_ACTIONS[code];
    if (action && !repeat) {
      this.pressed.add(action);
      return true;
    }
    return Boolean(action);
  }

  keyUp(code: string): void {
    this.held.delete(code);
  }

  attach(target: HTMLElement): void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (this.keyDown(e.code, e.repeat)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => this.keyUp(e.code);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const rect = target.getBoundingClientRect();
      this.pointer = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -(((e.clientY - rect.top) / rect.height) * 2 - 1) };
      if (this.device !== "keyboard" && (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)) this.device = "keyboard";
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") { this.device = "touch"; return; }
      this.device = "keyboard";
      onMove(e);
      if (e.button === 0) this.mouseFiring = true;
      if (e.button === 2) this.pressed.add("light");
      // Boutons latéraux de la souris (précédent / suivant) : changer d'arme.
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        this.pressed.add("swap");
      }
    };
    const onUp = (e: PointerEvent) => {
      if (e.button === 0) this.mouseFiring = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.zoomSteps += Math.sign(e.deltaY);
    };
    const onLeave = () => { this.pointer = null; };
    const onBlur = () => this.releaseAll();
    const noMenu = (e: Event) => e.preventDefault();
    // Évite la navigation précédent / suivant du navigateur avec les boutons latéraux.
    const noHistory = (e: MouseEvent) => { if (e.button === 3 || e.button === 4) e.preventDefault(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointerup", onUp);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerdown", onDown);
    target.addEventListener("pointerleave", onLeave);
    target.addEventListener("wheel", onWheel, { passive: false });
    target.addEventListener("contextmenu", noMenu);
    target.addEventListener("mouseup", noHistory);
    this.detach = () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerdown", onDown);
      target.removeEventListener("pointerleave", onLeave);
      target.removeEventListener("wheel", onWheel);
      target.removeEventListener("contextmenu", noMenu);
      target.removeEventListener("mouseup", noHistory);
    };
  }

  dispose(): void {
    this.detach?.();
    this.detach = null;
  }

  /** Recalcule les axes. À appeler une fois par image, avant la simulation. */
  update(): void {
    let x = 0;
    let y = 0;
    for (const code of this.held) {
      const dir = MOVE_KEYS[code];
      if (dir) { x += dir[0]; y += dir[1]; }
    }
    let sprint = [...this.held].some((c) => c.startsWith("Shift"));
    let crouch = [...this.held].some((c) => c.startsWith("Control") || c === "KeyC");
    let firing = this.mouseFiring;
    this.aimStick.x = this.aimStick.y = 0;
    const pad = readGamepad();
    if (pad) {
      const deadzone = (v: number) => (Math.abs(v) < 0.18 ? 0 : v);
      const lx = deadzone(pad.axes[0] ?? 0);
      const ly = deadzone(pad.axes[1] ?? 0);
      const rx = deadzone(pad.axes[2] ?? 0);
      const ry = deadzone(pad.axes[3] ?? 0);
      const button = (i: number) => Boolean(pad.buttons[i]?.pressed);
      const anyPad = lx || ly || rx || ry || pad.buttons.some((b) => b.pressed);
      if (anyPad) this.device = "gamepad";
      if (this.device === "gamepad") {
        x += lx;
        y -= ly;
        this.aimStick.x = rx;
        this.aimStick.y = -ry;
        sprint = sprint || button(10);
        crouch = crouch || button(1);
        firing = firing || button(7);
        const edges: [number, Action][] = [[0, "interact"], [2, "reload"], [3, "journal"], [6, "light"], [4, "swap"], [5, "swap"], [8, "inventory"], [9, "pause"]];
        for (const [index, action] of edges) {
          if (button(index) && !this.gamepadPrev[index]) this.pressed.add(action);
        }
        if (button(12)) this.zoomSteps -= 0.1;
        if (button(13)) this.zoomSteps += 0.1;
      }
      this.gamepadPrev = pad.buttons.map((b) => b.pressed);
    }
    if (this.device === "touch") {
      x += this.touchMove.x;
      y += this.touchMove.y;
      firing = firing || this.touchFiring;
      crouch = crouch || this.touchCrouch;
    }
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    this.move.x = x;
    this.move.y = y;
    // Au tactile, pousser le stick à fond fait courir.
    this.sprint = sprint || (this.device === "touch" && Math.hypot(this.touchMove.x, this.touchMove.y) > 0.92);
    this.crouch = crouch;
    this.firing = firing;
  }
}

function readGamepad(): Gamepad | null {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  for (const pad of navigator.getGamepads()) if (pad && pad.connected) return pad;
  return null;
}
