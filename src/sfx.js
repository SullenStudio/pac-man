// Tiny WebAudio synth for retro sound effects. No assets, no fetches.
import { G } from "./state.js";

let ctx = null;
let wakaHigh = false;

// Must be called from a user gesture at least once.
export function ensureAudio() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === "suspended") ctx.resume();
}

function tone(freqA, freqB, dur, type = "square", vol = 0.12, when = 0) {
  if (G.muted || !ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqA, t0);
  if (freqB !== freqA) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqB), t0 + dur);
  }
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  waka() {
    wakaHigh = !wakaHigh;
    tone(wakaHigh ? 520 : 300, wakaHigh ? 300 : 520, 0.07, "square", 0.07);
  },
  power() {
    tone(160, 40, 0.5, "sawtooth", 0.13);
    tone(80, 320, 0.5, "triangle", 0.07);
  },
  eatGhost() {
    tone(200, 900, 0.25, "square", 0.14);
  },
  fruit() {
    tone(880, 1320, 0.12, "sine", 0.16);
    tone(1320, 1760, 0.1, "sine", 0.12, 0.1);
  },
  death() {
    tone(500, 60, 1.0, "sawtooth", 0.13);
    tone(400, 50, 1.0, "triangle", 0.09, 0.05);
  },
  start() {
    tone(330, 660, 0.15, "square", 0.11);
    tone(660, 990, 0.15, "square", 0.09, 0.14);
  },
  levelClear() {
    tone(440, 880, 0.18, "square", 0.11);
    tone(550, 1100, 0.18, "square", 0.1, 0.16);
    tone(660, 1320, 0.24, "square", 0.1, 0.32);
  },
  extra() {
    tone(660, 1980, 0.4, "sine", 0.15);
  },
};
