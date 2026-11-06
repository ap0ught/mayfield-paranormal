# Park 3D redesign verification

- **103 / 103** automated tests passed, including seven new 3D architecture/WebGL-call tests.
- Level validator accepted House 3×3, Park 3×3 (six playable zones), Bank 4×4, Hotel 6×6 and the Farm example 3×3.
- Static source check: `src/App.jsx` and `src/Park3DView.jsx` passed JSX transpilation checks.
- Each of the six Park rooms defines a locked perspective camera and non-flat 3D geometry.
- The offscreen camera in Detail 2 uses the exact same `Park3DRenderer` as Detail 3, then produces a PNG 2D snapshot (`canvas.toDataURL`).
- The Detail 1 overview continues to read the live shared actor/light/ghost state.
- The WebGL draw-call tests use a mock graphics context to verify command creation. **They are not pixel-rendering tests.**
- **Open issue:** container Chromium software GL initialization fails. Therefore a screenshot from the real WebGL implementation was not obtained here; run `park-3d-renderer-check.html` in a browser with WebGL before claiming visual equivalence.

## Developer commands

```bash
npm install
npm run dev
npm test
npm run validate:levels
```

Optional independent 3D smoke test:

```bash
python3 -m http.server 8080
# then navigate to http://localhost:8080/park-3d-renderer-check.html
```
