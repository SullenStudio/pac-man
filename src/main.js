// Pac-Man — Sullen Studio. Vite + Kaplay 3001, no external assets.
import kaplay from "kaplay";
import { WIDTH, HEIGHT, G, COLORS, MODE_SCHEDULE } from "./state.js";
import { buildLevel, tileCenterF } from "./maze.js";
import { createPac, createGhosts, queueDir } from "./actors.js";
import { createHUD, createTouchControls, setupSwipe, drawGhostSprite } from "./ui.js";
import { resetPositions, spawnFruit } from "./flow.js";
import { sfx, ensureAudio } from "./sfx.js";

kaplay({
  width: WIDTH,
  height: HEIGHT,
  letterbox: true,
  crisp: true,
  pixelDensity: Math.min(devicePixelRatio || 1, 2),
  background: COLORS.bg,
});

// ------------------------------------------------------------- global input

const KEY_DIRS = [
  ["left", vec2(-1, 0)],
  ["right", vec2(1, 0)],
  ["up", vec2(0, -1)],
  ["down", vec2(0, 1)],
  ["a", vec2(-1, 0)],
  ["d", vec2(1, 0)],
  ["w", vec2(0, -1)],
  ["s", vec2(0, 1)],
];
for (const [key, dir] of KEY_DIRS) {
  onKeyPress(key, () => {
    ensureAudio();
    G.keyDir = { key, dir };
    queueDir(dir);
  });
}
onKeyPress("m", () => {
  G.muted = !G.muted;
});

setupSwipe(queueDir);

// -------------------------------------------------------------- menu scene

scene("menu", () => {
  G.phase = "menu";
  let canStart = false;
  wait(0.4, () => { canStart = true; });

  const title = add([
    text("PAC-MAN", { size: 64 }),
    pos(WIDTH / 2, 190),
    anchor("center"),
    color(...COLORS.pac),
    z(50),
  ]);
  title.onUpdate(() => {
    const s = 1 + Math.sin(time() * 2) * 0.03;
    title.scale = vec2(s, s);
  });

  add([
    text("SULLEN STUDIO", { size: 18 }),
    pos(WIDTH / 2, 248),
    anchor("center"),
    color(0, 255, 255),
    z(50),
  ]);
  add([
    text("A CLASSIC MAZE CHASE", { size: 11 }),
    pos(WIDTH / 2, 276),
    anchor("center"),
    color(120, 120, 170),
    z(50),
  ]);

  // Marquee: Pac-Man chases a frightened ghost across the screen,
  // then the ghost turns the tables and chases him back.
  let mDir = 1;
  const mPac = add([pos(-40, 360), anchor("center"), z(40)]);
  const mGhost = add([pos(-90, 360), anchor("center"), z(40)]);
  mPac.onUpdate(() => {
    mPac.pos.x += 90 * mDir * dt();
    mGhost.pos.x = mPac.pos.x + 50;
    if (mDir > 0 && mPac.pos.x > WIDTH + 60) mDir = -1;
    if (mDir < 0 && mPac.pos.x < -60) mDir = 1;
  });
  mPac.onDraw(() => {
    const m = 6 + 54 * Math.abs(Math.sin(time() * 10));
    const ang = mDir > 0 ? 0 : 180;
    drawCircle({ radius: 12, color: rgb(...COLORS.pac), start: ang + m, end: ang + 360 - m });
  });
  mGhost.onDraw(() => {
    // Frightened while being chased, red while chasing.
    drawGhostSprite(mDir > 0 ? COLORS.fright : COLORS.blinky, vec2(mDir, 0), 1);
  });

  const blink = add([
    text("PRESS ENTER OR TAP TO START", { size: 14 }),
    pos(WIDTH / 2, 440),
    anchor("center"),
    color(255, 255, 255),
    z(50),
  ]);
  blink.onUpdate(() => {
    blink.hidden = Math.floor(time() * 2) % 2 === 1;
  });

  add([
    text("ARROWS / WASD / SWIPE TO MOVE", { size: 11 }),
    pos(WIDTH / 2, 480),
    anchor("center"),
    color(120, 120, 170),
    z(50),
  ]);
  add([
    text(`BEST  ${G.best}`, { size: 13 }),
    pos(WIDTH / 2, 516),
    anchor("center"),
    color(255, 184, 82),
    z(50),
  ]);

  const roster = [
    ["BLINKY", COLORS.blinky, "CHASER"],
    ["PINKY", COLORS.pinky, "AMBUSHER"],
    ["INKY", COLORS.inky, "FLANKER"],
    ["CLYDE", COLORS.clyde, "FEIGNER"],
  ];
  roster.forEach(([n, c, tag], i) => {
    const x = WIDTH / 2 - 165 + i * 110;
    const g = add([pos(x, 580), anchor("center"), z(40)]);
    g.onDraw(() => drawGhostSprite(c, vec2(0, -1), i));
    add([text(n, { size: 11 }), pos(x, 606), anchor("center"), color(...c), z(50)]);
    add([text(tag, { size: 8 }), pos(x, 622), anchor("center"), color(120, 120, 170), z(50)]);
  });

  function start() {
    if (!canStart) return;
    canStart = false;
    ensureAudio();
    sfx.start();
    go("game");
  }
  onKeyPress(["enter", "space"], start);
  onClick(start);
});

// -------------------------------------------------------------- game scene

scene("game", () => {
  G.score = 0;
  G.lives = 3;
  G.level = 1;
  G.dots = 0;
  G.fruitCount = 0;
  G.wallFlash = 0;

  buildLevel();
  createPac();
  createGhosts();
  createHUD();
  createTouchControls(queueDir);

  const readyT = add([
    text("READY!", { size: 16 }),
    pos(tileCenterF(13.5, 17)),
    anchor("center"),
    color(255, 231, 0),
    z(60),
  ]);
  readyT.onUpdate(() => {
    readyT.hidden = G.phase !== "ready";
  });

  resetPositions();

  onUpdate(() => {
    if (G.phase === "ready") {
      G.readyTimer -= dt();
      if (G.readyTimer <= 0) G.phase = "playing";
      return;
    }
    if (G.phase === "dying") {
      G.deathTimer += dt();
      if (G.deathTimer >= 1.9) {
        if (G.lives > 0) resetPositions();
        else go("gameover");
      }
      return;
    }
    if (G.phase === "clear") {
      G.clearTimer += dt();
      if (G.clearTimer >= 2.2) {
        G.level++;
        G.dots = 0;
        G.fruitCount = 0;
        destroyAll("pellet");
        destroyAll("walls");
        destroyAll("fruit");
        buildLevel();
        G.wallFlash = 0;
        resetPositions();
      }
      return;
    }

    // playing: scatter/chase clock pauses during frightened mode
    if (G.frightTimer > 0) {
      G.frightTimer -= dt();
      if (G.frightTimer <= 0) {
        G.frightTimer = 0;
        G.chain = 0;
        for (const g of G.ghosts) if (g.mode === "fright") g.mode = G.mode;
      }
    } else {
      G.modeTimer -= dt();
      if (G.modeTimer <= 0) {
        G.modeIndex = Math.min(G.modeIndex + 1, MODE_SCHEDULE.length - 1);
        G.mode = G.modeIndex % 2 === 0 ? "scatter" : "chase";
        G.modeTimer = MODE_SCHEDULE[G.modeIndex];
        for (const g of G.ghosts) {
          if (g.mode === "chase" || g.mode === "scatter") {
            g.mode = G.mode;
            g.dir = g.dir.scale(-1); // classic: everyone reverses on mode flip
          }
        }
      }
    }

    if (G.fruitCount === 0 && G.dots >= 70) spawnFruit();
    else if (G.fruitCount === 1 && G.dots >= 170) spawnFruit();
  });
});

// ---------------------------------------------------------- gameover scene

scene("gameover", () => {
  G.phase = "gameover";
  let canGo = false;
  wait(0.6, () => { canGo = true; });

  add([
    text("GAME OVER", { size: 42 }),
    pos(WIDTH / 2, 250),
    anchor("center"),
    color(255, 60, 60),
    z(50),
  ]);
  add([
    text(`SCORE  ${G.score}`, { size: 18 }),
    pos(WIDTH / 2, 320),
    anchor("center"),
    color(255, 255, 255),
    z(50),
  ]);
  const isBest = G.score > 0 && G.score >= G.best;
  const bestT = add([
    text(isBest ? `NEW BEST!  ${G.best}` : `BEST  ${G.best}`, { size: 16 }),
    pos(WIDTH / 2, 356),
    anchor("center"),
    color(255, 184, 82),
    z(50),
  ]);
  if (isBest) {
    bestT.onUpdate(() => {
      bestT.hidden = Math.floor(time() * 3) % 2 === 1;
    });
  }
  const hint = add([
    text("ENTER / TAP — MENU", { size: 13 }),
    pos(WIDTH / 2, 430),
    anchor("center"),
    color(160, 160, 200),
    z(50),
  ]);
  hint.onUpdate(() => {
    hint.hidden = Math.floor(time() * 2) % 2 === 1;
  });

  // Decorative defeated ghost eyes drifting home.
  const eyes = add([pos(WIDTH / 2, 500), anchor("center"), z(40)]);
  eyes.onDraw(() => {
    for (const s of [-1, 1]) {
      drawCircle({ pos: vec2(s * 8, 0), radius: 5, color: rgb(...COLORS.eye) });
      drawCircle({ pos: vec2(s * 8, 1), radius: 2.6, color: rgb(...COLORS.pupil) });
    }
  });

  function toMenu() {
    if (!canGo) return;
    canGo = false;
    go("menu");
  }
  onKeyPress(["enter", "space"], toMenu);
  onClick(toMenu);
});

go("menu");
