// Pac-Man and the four ghosts: movement, AI targeting, rendering.
import { TILE, COLS, G, COLORS, speedsFor } from "./state.js";
import {
  walkable,
  tileCenterF,
  posToTile,
  TUNNEL_ROW,
  HOUSE,
  EXIT,
  PAC_SPAWN,
} from "./maze.js";
import { sfx } from "./sfx.js";
import { floatText, drawGhostSprite } from "./ui.js";
import { addScore, onPacDeath, triggerFright, startClear } from "./flow.js";

const DIR_ANG = { "1,0": 0, "-1,0": 180, "0,1": 90, "0,-1": 270 };
const DIRS = [vec2(1, 0), vec2(-1, 0), vec2(0, 1), vec2(0, -1)];

function wrapTunnel(p) {
  if (p.x < -TILE / 2) p.x += COLS * TILE + TILE;
  else if (p.x > COLS * TILE + TILE / 2) p.x -= COLS * TILE + TILE;
}

// Queue a buffered turn (keyboard, d-pad, swipe all funnel here).
export function queueDir(dir) {
  if (!G.pac) return;
  G.pac.nextDir = dir.clone();
  G.pac.nextDirAt = time();
}

// ---------------------------------------------------------------- Pac-Man

export function createPac() {
  const spawn = tileCenterF(PAC_SPAWN.x, PAC_SPAWN.y);
  const pac = add([
    pos(spawn),
    anchor("center"),
    z(20),
    "pac",
    {
      spawn,
      dir: vec2(-1, 0),
      face: vec2(-1, 0),
      nextDir: vec2(0, 0),
      nextDirAt: 0,
      mouthT: 0,
      dead: false,
      deathT: 0,
    },
  ]);

  pac.onUpdate(() => {
    if (pac.dead) {
      pac.deathT += dt();
      return;
    }
    if (G.phase !== "playing") return;

    // Held keyboard key keeps re-asserting the buffered direction.
    if (G.keyDir && isKeyDown(G.keyDir.key)) {
      pac.nextDir = G.keyDir.dir;
      pac.nextDirAt = time();
    }
    // Stale buffer expires after half a second.
    if ((pac.nextDir.x || pac.nextDir.y) && time() - pac.nextDirAt > 0.5) {
      pac.nextDir = vec2(0, 0);
    }

    const step = speedsFor(G.level).pac * TILE * dt();
    const cur = posToTile(pac.pos);
    const c = tileCenterF(cur.tx, cur.ty);
    const toCenter = c.sub(pac.pos);
    const distC = toCenter.len();

    const nd = pac.nextDir;
    if ((nd.x || nd.y) && nd.x === -pac.dir.x && nd.y === -pac.dir.y) {
      // Instant reversal is always allowed.
      pac.dir = nd.clone();
      pac.nextDir = vec2(0, 0);
    } else if (
      (nd.x || nd.y) &&
      distC <= step + 0.6 &&
      walkable(cur.tx + nd.x, cur.ty + nd.y)
    ) {
      // Buffered turn: snap to the tile center and turn.
      pac.pos = c;
      pac.dir = nd.clone();
      pac.nextDir = vec2(0, 0);
    }

    // Stop at the wall ahead.
    if (pac.dir.x || pac.dir.y) {
      if (!walkable(cur.tx + pac.dir.x, cur.ty + pac.dir.y)) {
        const along = toCenter.x * pac.dir.x + toCenter.y * pac.dir.y;
        if (along >= 0 && along <= step) {
          pac.pos = c;
          pac.dir = vec2(0, 0);
        }
      }
    }

    if (pac.dir.x || pac.dir.y) {
      pac.face = pac.dir.clone();
      pac.pos = pac.pos.add(pac.dir.scale(step));
      pac.mouthT += dt();
    }
    wrapTunnel(pac.pos);

    // Eat whatever is on the current tile.
    const t = posToTile(pac.pos);
    const pel = G.pellets[t.ty] && G.pellets[t.ty][t.tx];
    if (pel) {
      G.pellets[t.ty][t.tx] = null;
      destroy(pel);
      G.pelletsLeft--;
      G.dots++;
      if (pel.power) {
        addScore(50);
        sfx.power();
        triggerFright();
      } else {
        addScore(10);
        sfx.waka();
      }
      if (G.pelletsLeft <= 0) startClear();
    }
  });

  pac.onDraw(() => {
    const ang = DIR_ANG[`${pac.face.x},${pac.face.y}`] ?? 180;
    if (pac.dead) {
      const t = pac.deathT;
      if (t < 1.0) {
        // Mouth opens until nothing is left.
        const m = 8 + (t / 1.0) * 172;
        if (m < 178) {
          drawCircle({ radius: 8, color: rgb(...COLORS.pac), start: ang + m, end: ang + 360 - m });
        }
      } else if (t < 1.5) {
        const r = 8 * (1 - (t - 1.0) / 0.5);
        if (r > 0.5) drawCircle({ radius: r, color: rgb(...COLORS.pac), opacity: 0.6 });
      }
      return;
    }
    const m = 6 + 54 * Math.abs(Math.sin(pac.mouthT * 10));
    drawCircle({ radius: 8, color: rgb(...COLORS.pac), start: ang + m, end: ang + 360 - m });
  });

  G.pac = pac;
  return pac;
}

// ------------------------------------------------------------------ Ghosts

const GHOST_DEFS = [
  { name: "blinky", color: COLORS.blinky, corner: { tx: 25, ty: 0 }, start: { x: 13.5, y: 11 }, dir: vec2(-1, 0), release: 0, dotLimit: 0, inHouse: false },
  { name: "pinky", color: COLORS.pinky, corner: { tx: 2, ty: 0 }, start: { x: 13.5, y: 14 }, dir: vec2(0, 1), release: 0.5, dotLimit: 0, inHouse: true },
  { name: "inky", color: COLORS.inky, corner: { tx: 26, ty: 30 }, start: { x: 11.5, y: 14 }, dir: vec2(0, -1), release: 4, dotLimit: 10, inHouse: true },
  { name: "clyde", color: COLORS.clyde, corner: { tx: 1, ty: 30 }, start: { x: 15.5, y: 14 }, dir: vec2(0, -1), release: 9, dotLimit: 25, inHouse: true },
];

function inTunnel(p) {
  const t = posToTile(p);
  return t.ty === TUNNEL_ROW && (t.tx < 6 || t.tx > 21);
}

// Per-ghost chase targeting, straight from the arcade rules.
function ghostTarget(g) {
  if (g.mode === "eyes") return { tx: 13.5, ty: 12 }; // the door
  if (g.mode === "scatter") return g.corner;
  const pac = G.pac;
  const pt = posToTile(pac.pos);
  const pd = pac.face;
  switch (g.name) {
    case "blinky":
      return pt;
    case "pinky": {
      let tx = pt.tx + pd.x * 4;
      const ty = pt.ty + pd.y * 4;
      if (pd.y === -1) tx -= 4; // the famous overflow quirk
      return { tx, ty };
    }
    case "inky": {
      const blinky = G.ghosts[0];
      const bt = posToTile(blinky.pos);
      const px = pt.tx + pd.x * 2;
      const py = pt.ty + pd.y * 2;
      return { tx: px + (px - bt.tx), ty: py + (py - bt.ty) };
    }
    case "clyde": {
      const ct = posToTile(g.pos);
      const d2 = (ct.tx - pt.tx) ** 2 + (ct.ty - pt.ty) ** 2;
      return d2 > 64 ? pt : g.corner; // retreats when within 8 tiles
    }
    default:
      return pt;
  }
}

function gridMove(g, sp) {
  const speed =
    g.mode === "eyes" ? sp.eyes
    : g.mode === "fright" ? sp.fright
    : inTunnel(g.pos) ? sp.tunnel
    : sp.ghost;
  const step = speed * TILE * dt();
  const cur = posToTile(g.pos);
  const c = tileCenterF(cur.tx, cur.ty);

  // Decide once per tile: when first arriving at a new tile center.
  if (g.pos.dist(c) <= step && (cur.tx !== g.lastTx || cur.ty !== g.lastTy)) {
    g.pos = c;
    g.lastTx = cur.tx;
    g.lastTy = cur.ty;
    const allowDoor = g.mode === "eyes";
    const opts = [];
    for (const d of DIRS) {
      if (d.x === -g.dir.x && d.y === -g.dir.y) continue; // never reverse
      if (walkable(cur.tx + d.x, cur.ty + d.y, allowDoor)) opts.push(d);
    }
    if (opts.length === 0) {
      g.dir = g.dir.scale(-1); // dead end
    } else if (g.mode === "fright") {
      g.dir = choose(opts);
    } else {
      const target = ghostTarget(g);
      let best = opts[0];
      let bestD = Infinity;
      for (const d of opts) {
        const dd = (cur.tx + d.x - target.tx) ** 2 + (cur.ty + d.y - target.ty) ** 2;
        if (dd < bestD) {
          bestD = dd;
          best = d;
        }
      }
      g.dir = best;
    }
  }

  g.pos = g.pos.add(g.dir.scale(step));
  wrapTunnel(g.pos);

  if (g.mode === "eyes") {
    const doorC = tileCenterF(13.5, 12);
    if (g.pos.dist(doorC) < 6) g.mode = "entering";
  }
}

function updateGhost(g) {
  if (G.phase !== "playing") return;
  const sp = speedsFor(G.level);

  switch (g.mode) {
    case "house": {
      g.bobT += dt() * 3;
      g.pos.y = g.startPos.y + Math.sin(g.bobT) * 3;
      g.releaseTimer -= dt();
      if (g.releaseTimer <= 0 || (g.dotLimit > 0 && G.dots >= g.dotLimit)) {
        g.mode = "leaving";
      }
      break;
    }
    case "leaving": {
      const step = sp.ghost * 0.6 * TILE * dt();
      const cx = tileCenterF(HOUSE.x, 0).x;
      const exitY = tileCenterF(0, EXIT.y).y;
      if (Math.abs(g.pos.x - cx) > 1.5) {
        g.pos.x += Math.sign(cx - g.pos.x) * Math.min(step, Math.abs(cx - g.pos.x));
        g.dir = vec2(Math.sign(cx - g.pos.x), 0);
      } else if (g.pos.y > exitY + 1) {
        g.pos.x = cx;
        g.pos.y -= step;
        g.dir = vec2(0, -1);
      } else {
        g.pos = vec2(cx, exitY);
        g.lastTx = null;
        g.lastTy = null;
        g.mode = G.frightTimer > 0 ? "fright" : G.mode;
        g.dir = choose([vec2(-1, 0), vec2(1, 0)]);
      }
      break;
    }
    case "entering": {
      // Eaten eyes dive back into the house and revive.
      const step = sp.eyes * TILE * dt();
      const cx = tileCenterF(HOUSE.x, 0).x;
      const hy = tileCenterF(0, HOUSE.y).y;
      if (Math.abs(g.pos.x - cx) > 2) {
        g.pos.x += Math.sign(cx - g.pos.x) * Math.min(step, Math.abs(cx - g.pos.x));
      } else if (g.pos.y < hy - 1) {
        g.pos.x = cx;
        g.pos.y += step;
      } else {
        g.pos = vec2(cx, hy);
        g.lastTx = null;
        g.lastTy = null;
        g.mode = "leaving";
      }
      break;
    }
    default:
      gridMove(g, sp);
  }

  // Collision with Pac-Man.
  const pac = G.pac;
  if (pac && !pac.dead && G.phase === "playing" && g.pos.dist(pac.pos) < 10) {
    if (g.mode === "fright") {
      const val = 200 * Math.pow(2, G.chain);
      G.chain = Math.min(G.chain + 1, 3);
      addScore(val);
      floatText(String(val), g.pos, [0, 255, 255]);
      sfx.eatGhost();
      g.mode = "eyes";
    } else if (g.mode === "chase" || g.mode === "scatter" || g.mode === "leaving") {
      onPacDeath();
    }
  }
}

function drawGhost(g) {
  const fright = g.mode === "fright";
  const eyesOnly = g.mode === "eyes" || g.mode === "entering";
  if (fright) {
    const flash = G.frightTimer < 1.7 && Math.floor(time() * 8) % 2 === 0;
    const bodyCol = flash ? COLORS.frightFlash : COLORS.fright;
    const faceCol = flash ? COLORS.fright : COLORS.frightFlash;
    const c = rgb(...bodyCol);
    const bob = Math.sin(time() * 10 + g.bobT);
    drawCircle({ pos: vec2(0, -1), radius: 8, color: c });
    drawRect({ pos: vec2(-8, -1), width: 16, height: 7, color: c });
    for (let i = 0; i < 4; i++) {
      drawCircle({ pos: vec2(-6 + i * 4, 6 + (i % 2 === 0 ? bob : -bob)), radius: 2, color: c });
    }
    const fc = rgb(...faceCol);
    drawCircle({ pos: vec2(-3, -3), radius: 1.6, color: fc });
    drawCircle({ pos: vec2(3, -3), radius: 1.6, color: fc });
    let prev = vec2(-6, 2);
    for (let i = 1; i <= 6; i++) {
      const p = vec2(-6 + i * 2, i % 2 === 0 ? 2 : 0);
      drawLine({ p1: prev, p2: p, width: 1.5, color: fc });
      prev = p;
    }
    return;
  }
  if (eyesOnly) {
    const ex = g.dir.x * 1.6;
    const ey = g.dir.y * 1.6;
    for (const s of [-1, 1]) {
      drawCircle({ pos: vec2(s * 3.5 + ex * 0.6, -3 + ey * 0.6), radius: 2.8, color: rgb(...COLORS.eye) });
      drawCircle({ pos: vec2(s * 3.5 + ex * 1.6, -3 + ey * 1.6), radius: 1.6, color: rgb(...COLORS.pupil) });
    }
    return;
  }
  drawGhostSprite(g.col, g.dir, g.bobT);
}

export function createGhosts() {
  G.ghosts = GHOST_DEFS.map((def) => {
    const g = add([
      pos(tileCenterF(def.start.x, def.start.y)),
      anchor("center"),
      z(15),
      "ghost",
      {
        def,
        name: def.name,
        col: def.color,
        corner: def.corner,
        inHouse: def.inHouse,
        dotLimit: def.dotLimit,
        startPos: tileCenterF(def.start.x, def.start.y),
        startDir: def.dir.clone(),
        dir: def.dir.clone(),
        mode: def.inHouse ? "house" : "scatter",
        releaseTimer: def.release + 1,
        bobT: Math.random() * 6.28,
        lastTx: null,
        lastTy: null,
      },
    ]);
    g.onUpdate(() => updateGhost(g));
    g.onDraw(() => drawGhost(g));
    return g;
  });
  return G.ghosts;
}
