# MEGATRON — Reactor-Core Mecha Landing

A scroll-driven 3D landing page for a procedural chrome mecha. It's built with React 18, R3F v8, Rapier, Spline, Babylon.js and a socket.io telemetry feed.

```bash
npm i && npm run dev
```

`npm run dev` starts Vite on http://localhost:5173 and the telemetry server on :3001. Vite proxies `/socket.io` to the telemetry server. If the socket can't connect after 3 attempts, the HUD switches to a local simulator and shows `LINK SIMULATED` in violet.

## Scroll map (`useScroll().range(start, length)`)

| Section | Range | What happens |
|---|---|---|
| Hero | `0 – .15` | Idle sway; Spline / SVG micro-core widget |
| Rotation | `.15 + .25` | `rotation.y = 2π·ease(t)` |
| Exploded | `.40 + .25` | Each armor part moves out along its own vector |
| Physics | `.65 + .15` | Model scales out; 64 instanced Rapier bodies (zero-g, pointer repulsor, gravity toggle) |
| Hangar | `.80 + .20` | CTA that opens the Babylon.js first-person hangar |

## Files

- `src/App.jsx`: Canvas, ScrollControls, Lightformer environment, lights, postprocessing, `PerformanceMonitor`, scroll → store bridge
- `src/MegatronModel.jsx`: parts-table procedural mecha
- `src/PhysicsPlayground.jsx`: instanced debris physics
- `src/SplineWidget.jsx`: lazy Spline scene (`VITE_SPLINE_SCENE`) with an SVG fallback
- `src/BabylonHangar.jsx`: walkable hangar modal (WASD/arrows, click to pointer-lock, touch-drag look, ESC to close)
- `src/HUD.jsx`, `src/useTelemetry.js`, `src/telemetrySim.js`, `server/telemetry.js`: telemetry pipeline
- `src/store.js`, `src/tokens.js`: shared state and design tokens

## Notes

- The version pins follow the React 18 / R3F v8 line (drei 9, rapier 1.x). Upgrade them together, not one at a time.
- `@splinetool/runtime` 1.9.28 is pinned as well, because it's a required peer of `@splinetool/react-spline`.
- At most three WebGL contexts exist at once. The Spline widget unmounts past 20% scroll, and R3F switches to `frameloop="never"` while the hangar is open.
