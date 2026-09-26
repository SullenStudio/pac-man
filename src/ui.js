// HUD, touch controls, floating score text, and shared sprite painters.
import { WIDTH, HEIGHT, PAD_H, G, COLORS, fruitForLevel } from "./state.js";
import { ensureAudio } from "./sfx.js";

export function floatText(str, p, col) {
  const t = add([
    text(str, { size: 10 }),
    pos(p.x, p.y),
    anchor("center"),
    color(...col),
    opacity(1),
    z(60),
    lifespan(0.9, { fade: 0.4 }),
  ]);
  t.onUpdate(() => {
    t.pos.y -= 14 * dt();
  });
  return t;
}

// Classic ghost silhouette: dome, skirt with animated bumps, directional eyes.
export function drawGhostSprite(col, dir, phase = 0) {
  const c = rgb(...col);
  const bob = Math.sin(time() * 10 + phase);
  drawCircle({ pos: vec2(0, -1), radius: 8, color: c });
  drawRect({ pos: vec2(-8, -1), width: 16, height: 7, color: c });
  for (let i = 0; i < 4; i++) {
    drawCircle({
      pos: vec2(-6 + i * 4, 6 + (i % 2 === 0 ? bob : -bob)),
      radius: 2,
      color: c,
    });
  }
  const ex = dir.x * 1.6;
  const ey = dir.y * 1.6;
  for (const s of [-1, 1]) {
    drawCircle({ pos: vec2(s * 3.5 + ex * 0.6, -3 + ey * 0.6), radius: 2.8, color: rgb(...COLORS.eye) });
    drawCircle({ pos: vec2(s * 3.5 + ex * 1.6, -3 + ey * 1.6), radius: 1.6, color: rgb(...COLORS.pupil) });
  }
}

export function drawFruitShape(name, s = 1) {
  switch (name) {
    case "cherry":
      drawCircle({ pos: vec2(-3 * s, 2 * s), radius: 3.5 * s, color: rgb(255, 40, 60) });
      drawCircle({ pos: vec2(3.5 * s, 4 * s), radius: 3 * s, color: rgb(220, 20, 50) });
      drawLine({ p1: vec2(-3 * s, 0), p2: vec2(2 * s, -7 * s), width: 1.5, color: rgb(60, 200, 60) });
      drawLine({ p1: vec2(3.5 * s, s), p2: vec2(2 * s, -7 * s), width: 1.5, color: rgb(60, 200, 60) });
      break;
    case "strawberry":
      drawPolygon({ pts: [vec2(0, 7 * s), vec2(-6 * s, -3 * s), vec2(6 * s, -3 * s)], color: rgb(255, 50, 70) });
      drawRect({ pos: vec2(-3 * s, -6 * s), width: 6 * s, height: 3 * s, color: rgb(60, 200, 60) });
      break;
    case "orange":
      drawCircle({ radius: 6 * s, color: rgb(255, 160, 30) });
      drawRect({ pos: vec2(0, -8 * s), width: 4 * s, height: 3 * s, color: rgb(60, 200, 60) });
      break;
    case "apple":
      drawCircle({ radius: 6 * s, color: rgb(255, 30, 30) });
      drawLine({ p1: vec2(0, -5 * s), p2: vec2(s, -9 * s), width: 1.5, color: rgb(140, 90, 40) });
      break;
    default: // melon
      drawCircle({ radius: 6.5 * s, color: rgb(80, 220, 80) });
      drawLine({ p1: vec2(-4 * s, -4 * s), p2: vec2(4 * s, 4 * s), width: 1, color: rgb(30, 120, 30) });
      drawLine({ p1: vec2(-4 * s, 4 * s), p2: vec2(4 * s, -4 * s), width: 1, color: rgb(30, 120, 30) });
  }
}

export function createHUD() {
  add([text("SCORE", { size: 10 }), pos(16, 6), color(120, 120, 160), z(50), "hud"]);
  const scoreT = add([text("0", { size: 14 }), pos(16, 20), color(255, 255, 255), z(50), "hud"]);
  add([text("BEST", { size: 10 }), pos(WIDTH / 2, 6), anchor("top"), color(120, 120, 160), z(50), "hud"]);
  const bestT = add([text("0", { size: 14 }), pos(WIDTH / 2, 20), anchor("top"), color(255, 255, 255), z(50), "hud"]);
  add([text("LEVEL", { size: 10 }), pos(WIDTH - 16, 6), anchor("topright"), color(120, 120, 160), z(50), "hud"]);
  const levelT = add([text("1", { size: 14 }), pos(WIDTH - 16, 20), anchor("topright"), color(255, 255, 255), z(50), "hud"]);
  scoreT.onUpdate(() => { scoreT.text = String(G.score); });
  bestT.onUpdate(() => { bestT.text = String(G.best); });
  levelT.onUpdate(() => { levelT.text = String(G.level); });

  // Lives, bottom-left
  const lives = add([pos(0, 0), z(50), "hud"]);
  lives.onDraw(() => {
    for (let i = 0; i < G.lives; i++) {
      drawCircle({
        pos: vec2(26 + i * 26, HEIGHT - PAD_H + 26),
        radius: 8,
        color: rgb(...COLORS.pac),
        start: 30,
        end: 330,
      });
    }
  });

  // Current level fruit, bottom-right
  const fi = add([pos(WIDTH - 32, HEIGHT - PAD_H + 26), anchor("center"), z(50), "hud"]);
  fi.onDraw(() => drawFruitShape(fruitForLevel(G.level).name, 0.9));

  const muteT = add([
    text("MUTED", { size: 9 }),
    pos(WIDTH - 14, HEIGHT - 12),
    anchor("botright"),
    color(255, 80, 80),
    z(50),
    "hud",
  ]);
  muteT.onUpdate(() => { muteT.hidden = !G.muted; });
}

// On-screen direction pad for touch devices (swipe also works everywhere).
export function createTouchControls(queueDir) {
  if (!G.touch) {
    add([
      text("ARROWS / WASD TO MOVE · M TO MUTE", { size: 10 }),
      pos(WIDTH / 2, HEIGHT - PAD_H / 2),
      anchor("center"),
      color(90, 90, 130),
      z(50),
      "hud",
    ]);
    return;
  }
  const cx = WIDTH / 2;
  const cy = HEIGHT - PAD_H / 2 + 4;
  const S = 34;
  const OFF = 38;
  const dirs = [
    [0, -1, vec2(0, -1)],
    [0, 1, vec2(0, 1)],
    [-1, 0, vec2(-1, 0)],
    [1, 0, vec2(1, 0)],
  ];
  for (const [dx, dy, dir] of dirs) {
    const b = add([
      pos(cx + dx * OFF, cy + dy * OFF),
      rect(S, S, { radius: 8 }),
      anchor("center"),
      color(70, 70, 140),
      opacity(0.28),
      area(),
      z(55),
      "pad",
      { dir },
    ]);
    b.onDraw(() => {
      const tip = dir.scale(8);
      const back = dir.scale(-5);
      const nrm = vec2(-dir.y, dir.x).scale(6);
      drawPolygon({
        pts: [tip, back.add(nrm), back.sub(nrm)],
        color: rgb(200, 200, 255),
        opacity: 0.9,
      });
    });
    b.onClick(() => {
      ensureAudio();
      queueDir(dir);
      b.opacity = 0.55;
      wait(0.12, () => { b.opacity = 0.28; });
    });
  }
}

// Swipe anywhere to steer.
export function setupSwipe(queueDir) {
  let startP = null;
  onTouchStart((p) => {
    startP = p;
    ensureAudio();
  });
  onTouchEnd((p) => {
    if (!startP) return;
    const d = p.sub(startP);
    startP = null;
    if (d.len() < 20) return;
    queueDir(
      Math.abs(d.x) > Math.abs(d.y)
        ? vec2(Math.sign(d.x), 0)
        : vec2(0, Math.sign(d.y)),
    );
  });
}
