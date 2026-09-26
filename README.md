# Pac-Man — Sullen Studio

A classic-feel Pac-Man clone for the browser, built with [Kaplay 3001](https://kaplayjs.com) and Vite. No external assets: every sprite is drawn with shapes at runtime and all sound effects are synthesized with WebAudio.

**Play it live:** https://sullenstudio.github.io/pac-man/

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Steer Pac-Man (turns are buffered) |
| Swipe | Steer on touch devices |
| On-screen direction pad | Steer on phones |
| Enter / Space / Tap | Start, restart |
| M | Mute / unmute |

## Features

- Classic 28×31 tile maze with 4 power pellets, side tunnel wrap, and neon-blue walls
- Smooth tile-based movement with buffered turns and mouth animation
- Four ghosts with authentic arcade targeting (see below), alternating scatter/chase waves on the classic 7-20-7-20-5-20-5-∞ timer
- Frightened mode with the 200 → 400 → 800 → 1600 combo chain; eaten eyes fly home and respawn
- Fruit bonus under the ghost house at 70 and 170 pellets (cherry, strawberry, orange, apple, melon by level)
- 3 lives, extra life at 10,000, level clear → maze regenerates and everything speeds up
- Menu / READY! / HUD / game-over screens, best score persisted in `localStorage`

## Ghost AI notes

Each ghost picks its exit direction at every tile center by minimizing straight-line distance to its target tile (never reversing, except on mode flips — like the arcade):

- **Blinky** (red) targets Pac-Man's tile directly.
- **Pinky** (pink) targets 4 tiles ahead of Pac-Man — including the famous overflow quirk where "ahead" while facing up also shifts 4 tiles left.
- **Inky** (cyan) mirrors Blinky around the pivot 2 tiles ahead of Pac-Man.
- **Clyde** (orange) targets Pac-Man until he is within 8 tiles, then retreats to his corner.

In scatter mode each ghost heads for its home corner instead. Ghosts slow down in the side tunnel; Pac-Man does not.

## Run locally

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

Deployment is automatic: pushes to `main` build and publish to GitHub Pages via `.github/workflows/pages.yml`.

## License

MIT — see [LICENSE](LICENSE).
