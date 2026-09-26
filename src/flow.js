// Game-flow helpers: scoring, frightened mode, fruit, life/level transitions.
import { G, MODE_SCHEDULE, frightDuration, fruitForLevel } from "./state.js";
import { tileCenterF, FRUIT_POS } from "./maze.js";
import { floatText, drawFruitShape } from "./ui.js";
import { sfx } from "./sfx.js";

export function addScore(n) {
  const before = G.score;
  G.score += n;
  if (before < 10000 && G.score >= 10000) {
    G.lives++;
    sfx.extra();
    if (G.pac) floatText("1UP", G.pac.pos, [255, 231, 0]);
  }
  if (G.score > G.best) {
    G.best = G.score;
    localStorage.setItem("pacman-best", String(G.best));
  }
}

export function triggerFright() {
  G.frightTimer = frightDuration(G.level);
  G.chain = 0;
  const doorY = tileCenterF(0, 12).y;
  for (const g of G.ghosts) {
    if (g.mode === "chase" || g.mode === "scatter") {
      g.mode = "fright";
      g.dir = g.dir.scale(-1); // classic: ghosts reverse on fright
    } else if (g.mode === "leaving" && g.pos.y <= doorY) {
      g.mode = "fright"; // already out of the door
    }
  }
}

export function spawnFruit() {
  const def = fruitForLevel(G.level);
  G.fruitCount++;
  const f = add([
    pos(tileCenterF(FRUIT_POS.x, FRUIT_POS.y)),
    anchor("center"),
    z(12),
    "fruit",
    { def, timer: 9.5 },
  ]);
  f.onDraw(() => drawFruitShape(def.name, 1.1));
  f.onUpdate(() => {
    f.timer -= dt();
    if (f.timer <= 0) {
      if (G.fruitObj === f) G.fruitObj = null;
      destroy(f);
      return;
    }
    const pac = G.pac;
    if (pac && !pac.dead && G.phase === "playing" && f.pos.dist(pac.pos) < 11) {
      addScore(def.value);
      floatText(String(def.value), f.pos, [255, 120, 200]);
      sfx.fruit();
      G.fruitObj = null;
      destroy(f);
    }
  });
  G.fruitObj = f;
}

export function resetPositions() {
  const pac = G.pac;
  pac.pos = pac.spawn.clone();
  pac.dir = vec2(-1, 0);
  pac.face = vec2(-1, 0);
  pac.nextDir = vec2(0, 0);
  pac.mouthT = 0;
  pac.dead = false;
  pac.deathT = 0;
  pac.hidden = false;
  for (const g of G.ghosts) {
    g.pos = g.startPos.clone();
    g.dir = g.startDir.clone();
    g.mode = g.inHouse ? "house" : "scatter";
    g.releaseTimer = g.def.release + 1;
    g.hidden = false;
    g.lastTx = null;
    g.lastTy = null;
  }
  G.mode = "scatter";
  G.modeIndex = 0;
  G.modeTimer = MODE_SCHEDULE[0];
  G.frightTimer = 0;
  G.chain = 0;
  if (G.fruitObj) {
    destroy(G.fruitObj);
    G.fruitObj = null;
  }
  G.phase = "ready";
  G.readyTimer = 2.0;
}

export function onPacDeath() {
  if (G.phase !== "playing") return;
  G.phase = "dying";
  G.deathTimer = 0;
  G.lives--;
  G.pac.dead = true;
  G.pac.deathT = 0;
  for (const g of G.ghosts) g.hidden = true;
  if (G.fruitObj) {
    destroy(G.fruitObj);
    G.fruitObj = null;
  }
  sfx.death();
}

export function startClear() {
  G.phase = "clear";
  G.clearTimer = 0;
  G.wallFlash = 1;
  for (const g of G.ghosts) g.hidden = true;
  if (G.fruitObj) {
    destroy(G.fruitObj);
    G.fruitObj = null;
  }
  sfx.levelClear();
}
