// Shared constants and mutable game state.

export const TILE = 20;
export const COLS = 28;
export const ROWS = 31;
export const HUD_H = 40;
export const PAD_H = 110;
export const WIDTH = COLS * TILE; // 560
export const HEIGHT = HUD_H + ROWS * TILE + PAD_H; // 770

export const COLORS = {
  bg: [5, 5, 15],
  wallFill: [9, 9, 38],
  wallGlow: [26, 26, 176],
  wallCore: [74, 74, 255],
  wallFlash: [200, 200, 255],
  pellet: [255, 183, 174],
  pac: [255, 231, 0],
  door: [255, 184, 222],
  blinky: [255, 40, 40],
  pinky: [255, 184, 255],
  inky: [0, 255, 255],
  clyde: [255, 184, 82],
  fright: [40, 40, 235],
  frightFlash: [240, 240, 240],
  eye: [255, 255, 255],
  pupil: [32, 32, 200],
};

export const G = {
  phase: "menu", // menu | ready | playing | dying | clear | gameover
  score: 0,
  best: Number(localStorage.getItem("pacman-best") || 0),
  lives: 3,
  level: 1,
  pelletsLeft: 0,
  dots: 0, // pellets eaten this level (drives fruit + ghost house release)
  mode: "scatter", // global scatter/chase mode
  modeIndex: 0,
  modeTimer: 7,
  frightTimer: 0,
  chain: 0, // ghost-eating combo chain (200/400/800/1600)
  fruitObj: null,
  fruitCount: 0,
  pac: null,
  ghosts: [],
  pellets: [], // pellets[ty][tx] -> game object | null
  wallFlash: 0,
  readyTimer: 0,
  deathTimer: 0,
  clearTimer: 0,
  muted: false,
  touch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
  keyDir: null, // last held keyboard direction { key, dir }
};

// Classic scatter/chase alternation (seconds). Ends in infinite chase.
export const MODE_SCHEDULE = [7, 20, 7, 20, 5, 20, 5, Infinity];

export function speedsFor(level) {
  return {
    pac: Math.min(8 + 0.4 * (level - 1), 11), // tiles per second
    ghost: Math.min(7.4 + 0.35 * (level - 1), 10.4),
    fright: 4.5,
    eyes: 13,
    tunnel: 4,
  };
}

export function frightDuration(level) {
  return Math.max(1.2, 7 - level);
}

export const FRUITS = [
  { name: "cherry", value: 100, minLevel: 1 },
  { name: "strawberry", value: 300, minLevel: 2 },
  { name: "orange", value: 500, minLevel: 3 },
  { name: "apple", value: 700, minLevel: 5 },
  { name: "melon", value: 1000, minLevel: 7 },
];

export function fruitForLevel(level) {
  let f = FRUITS[0];
  for (const fr of FRUITS) if (level >= fr.minLevel) f = fr;
  return f;
}
