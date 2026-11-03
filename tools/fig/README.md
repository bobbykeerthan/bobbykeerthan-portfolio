# .fig tools

- `decode.js <canvas.fig> <out.json>` — decodes a Figma .fig (unzip it first). Needs `npm i kiwi-schema@0.5.0 fzstd@0.1.1 pako@2.1.0` in a scratch folder.
- `resolve.py <canvas.json> <frameId>` — prints a frame with component instances resolved (overrides, component props, shared text/fill styles, variant swaps).
- `shopdesk-ref/` — resolved dumps of the five Shopdesk prototype screens (Overview 7:448, Orders 7:893, Order details 8:876, Products 8:1041, Customers 8:1272) and the icon set as SVG. Font: Figtree. Colours: sidebar #000, active nav #474747, brand red #ad343e, amber #f2af29, beige #e0e0ce, surface #f6f6f1, line #e2e8f0, success #15803d/#ecfdf3, danger #b91c1c/#fef2f2.
