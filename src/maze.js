// Maze layout, tile helpers, and level construction (walls, pellets, door).
import { TILE, COLS, ROWS, HUD_H, COLORS, G } from "./state.js";

// Classic 28x31 layout. '#' wall, '.' pellet, 'o' power pellet,
// '-' ghost house door, ' ' empty walkable.
export const MAP = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#o####.#####.##.#####.####o#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "     #.##### ## #####.#     ",
  "     #.##          ##.#     ",
  "     #.## ###--### ##.#     ",
  "######.## #      # ##.######",
  "          #      #          ",
  "######.## #      # ##.######",
  "     #.## ######## ##.#     ",
  "     #.##          ##.#     ",
  "     #.## ######## ##.#     ",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#o..##.......  .......##..o#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
];

export const TUNNEL_ROW = 14;
export const HOUSE = { x: 13.5, y: 14 }; // ghost house center (fractional tile)
export const EXIT = { x: 13.5, y: 11 }; // just above the door
export const PAC_SPAWN = { x: 13.5, y: 23 };
export const FRUIT_POS = { x: 13.5, y: 17 }; // under the ghost house

export function tileAt(tx, ty) {
  if (ty < 0 || ty >= ROWS) return "#";
  if (tx < 0 || tx >= COLS) return ty === TUNNEL_ROW ? " " : "#"; // open tunnel
  return MAP[ty][tx];
}

export function walkable(tx, ty, allowDoor = false) {
  const t = tileAt(tx, ty);
  if (t === "#") return false;
  if (t === "-") return allowDoor;
  return true;
}

export function tileCenterF(fx, fy) {
  return vec2((fx + 0.5) * TILE, HUD_H + (fy + 0.5) * TILE);
}

export function posToTile(p) {
  return {
    tx: Math.floor(p.x / TILE),
    ty: Math.floor((p.y - HUD_H) / TILE),
  };
}

// Precomputed wall geometry (pure math, safe before kaplay init).
const WALL_TILES = [];
const WALL_SEGS = [];
for (let ty = 0; ty < ROWS; ty++) {
  for (let tx = 0; tx < COLS; tx++) {
    if (MAP[ty][tx] !== "#") continue;
    WALL_TILES.push([tx, ty]);
    const x = tx * TILE;
    const y = HUD_H + ty * TILE;
    if (tileAt(tx, ty - 1) !== "#") WALL_SEGS.push([x, y, x + TILE, y]);
    if (tileAt(tx, ty + 1) !== "#") WALL_SEGS.push([x, y + TILE, x + TILE, y + TILE]);
    if (tileAt(tx - 1, ty) !== "#") WALL_SEGS.push([x, y, x, y + TILE]);
    if (tileAt(tx + 1, ty) !== "#") WALL_SEGS.push([x + TILE, y, x + TILE, y + TILE]);
  }
}

function drawMazeWalls() {
  const flash = G.wallFlash > 0 && Math.floor(time() * 6) % 2 === 0;
  const glow = flash ? COLORS.wallFlash : COLORS.wallGlow;
  const core = flash ? COLORS.wallFlash : COLORS.wallCore;
  const fill = rgb(...COLORS.wallFill);
  for (const [tx, ty] of WALL_TILES) {
    drawRect({
      pos: vec2(tx * TILE, HUD_H + ty * TILE),
      width: TILE,
      height: TILE,
      color: fill,
    });
  }
  const glowCol = rgb(...glow);
  const coreCol = rgb(...core);
  for (const [x1, y1, x2, y2] of WALL_SEGS) {
    drawLine({ p1: vec2(x1, y1), p2: vec2(x2, y2), width: 5, color: glowCol, opacity: 0.45 });
    drawLine({ p1: vec2(x1, y1), p2: vec2(x2, y2), width: 2, color: coreCol });
  }
  // Ghost house door
  drawRect({
    pos: vec2(13 * TILE, HUD_H + 12 * TILE + TILE / 2 - 2),
    width: TILE * 2,
    height: 4,
    color: rgb(...COLORS.door),
  });
}

// Builds walls + pellets for the current level. Call again after destroyAll
// to regenerate a cleared maze.
export function buildLevel() {
  G.pellets = [];
  let count = 0;
  for (let ty = 0; ty < ROWS; ty++) {
    G.pellets.push(new Array(COLS).fill(null));
    for (let tx = 0; tx < COLS; tx++) {
      const t = MAP[ty][tx];
      if (t !== "." && t !== "o") continue;
      const power = t === "o";
      const p = add([
        pos(tileCenterF(tx, ty)),
        anchor("center"),
        circle(power ? 5 : 2.2),
        color(...COLORS.pellet),
        z(5),
        "pellet",
        { tx, ty, power, phase: (tx * 7 + ty * 13) % 6.28 },
      ]);
      if (power) {
        p.onUpdate(() => {
          const s = 0.75 + 0.35 * Math.sin(time() * 6 + p.phase);
          p.scale = vec2(s, s);
        });
      }
      G.pellets[ty][tx] = p;
      count++;
    }
  }
  G.pelletsLeft = count;

  const walls = add([pos(0, 0), z(1), "walls"]);
  walls.onDraw(drawMazeWalls);
  return walls;
}
