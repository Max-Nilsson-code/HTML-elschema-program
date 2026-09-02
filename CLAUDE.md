# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-based drawing tool for industrial control schematics (relays, contactors, motors). Vanilla JS ES modules, SVG rendering, no framework, no dependencies, no build step. Deployed as static files (GitHub Pages).

**Everything in the repo is in Swedish** — code comments, UI strings, commit messages, and docs. Keep it that way: write new comments, status texts, and commit messages in Swedish.

## Commands

There is no package.json, no bundler, no linter, and no test suite.

The app **must be served over HTTP** — it uses ES modules and `fetch()`es symbol SVGs from `assets/symbols/`, both of which fail on `file://`:

```
python3 -m http.server 8000
# http://localhost:8000/               → Elschema Studio (index.html)
# http://localhost:8000/klassisk.html  → the original shell
```

Verification is manual: load the page, check the console is clean, and exercise the flow (place → wire → save → open → export). The roadmap's own verification method was a static server plus headless Chromium.

## Design record

`ROADMAP.md` is the living architecture/decision document, with phases checked off and a rationale note per decision. When you add a feature or change a decision, update it (the commit history shows this is done consistently). `symboler och vägledning/vägledning.md` is the user-facing guide and is likewise kept in sync with behaviour.

## Architecture

### Two shells, one engine

Two HTML pages drive the same modules in `js/`:

| | `klassisk.html` → `js/main.js` | `index.html` (Studio) → `studio/app.js` |
|---|---|---|
| Grid | 20 units | 10 units (`setGridSize(10)`) |
| Symbol scale | 1 | 0.5 (`initSymbols(svg, library, 0.5)`) |
| Line width | 1.5 | 1.25, passed to export as CSS overrides |
| Chrome | flat palette, buttons in side panel | topbar, category palette, A5/A4/A3 sheet, zoom bar, light/dark |

`studio/` contains **only** shell code (palette with categories, sheet overlay, inline-SVG icons, CSS tokens). All drawing logic lives in `js/` and must stay shell-agnostic. Three knobs exist so the engine can be reconfigured: `setGridSize()` in `grid.js` (must be called before `setupGrid()`/`initCanvas()`), the `scale` argument to `initSymbols()`, and `{ extraStrip, extraCss }` on `initExport()`.

### Module pattern and composition order

Every module exports one `initX(svg, ...deps)` function that attaches its own SVG layer and listeners and returns a small API object. The entry point composes them, and **the order matters**:

1. `initCanvas`, `initTools` first.
2. `loadSymbolLibrary()` (async) → `initSymbols` → `initWires` → `initJunctions`.
3. `initTexts`, `initLabels`, then the palette — these register `mousedown` listeners **before** selection so a placement/draw click is never also treated as a selection click.
4. `initSelection(svg, canvasApi, [wiresProvider, symbolsProvider, textsProvider], tools)` — provider order is hit-test order; wires first so they sit under symbols.
5. `initInspector` (mirrors selection, so after it).
6. `initPersistence`, `initExport`, and **`initHistory` last** (it observes changes and needs selection to reset it on restore).

### Selection is type-agnostic

`selection.js` knows no object types. Each module with selectable objects (`symbols.js`, `wires.js`, `texts.js`) hands in a provider implementing:

```
owns(id), getAll(), getBounds(obj), hitTestPoint(x,y),
move(ids,dx,dy), snap(ids), remove(ids), setSelectedIds(ids),
rotate?(ids,deg), mirror?(ids), duplicate?(ids),
startHandleDrag?(event) -> {move,end}|null
```

A new selectable object kind = a new module + a new provider in the list. Do not add type checks inside `selection.js`.

### Document model, history, persistence

- Each of `symbolsApi`, `wiresApi`, `textsApi` exposes `serialize()` / `loadState()`. `persistence.js` wraps them in `{ format: "elschema", version: 1, symbols, wires, texts }` and validates format/version before touching the canvas.
- **Undo/redo is snapshot-based**, not command-based: `history.js` serializes the whole document, debounces 250 ms so a drag or a typed label becomes one step, and keeps 100 states. Any mutation is captured automatically — there is nothing to "log" when adding a new mutating action.
- Wires bind endpoints to symbol pins and follow the symbol on move/rotate; binding is dropped when the wire is dragged away or the symbol deleted.
- Junction dots (`junctions.js`) are computed, not stored: drawn only where ≥3 conductors meet. Dashed lines (mechanical links) are excluded from that count.
- Rotation is locked to 90° steps; mirroring (`M`) is around the vertical axis. Labels live **outside** the scaled/rotated/mirrored group so text is never transformed — only anchor points are recomputed.

### Symbol library

Symbol types are self-describing SVG files in `assets/symbols/`; `symbol-library.js` reads their `data-*` attributes (id, name, designation prefix, width/height, designation position, per-pin `cx/cy` and label offsets, optional stem). The geometry `<g class="symbol-geometry">` DOM node is kept and cloned with `importNode` at render time. Full attribute reference is in `vägledning.md` under "Teknisk uppbyggnad av en symbolfil".

- **To add a symbol:** create the SVG following that template and append its id to `SYMBOL_IDS` in `js/symbol-library.js`. Nothing else changes.
- Pins must land on the 20-unit grid (symbols are 80×80 world units, connection points at grid crossings).
- **Add-on symbols** (push buttons, motor protection, limit switch) have no pins and no `data-designation-x`; they are placed on top of a contact, draw an adjustable "stem" from `data-stem-*`, and set the underlying contact's designation prefix (e.g. push button → `S`). There is no data-model link between add-on and contact — moving the contact does not move the add-on (known open thread in the roadmap).
- `symboler och vägledning/` holds the draw.io source drawings and docs only; the app never loads from it (the folder name has spaces).

### Export

`export.js` clones the SVG, strips UI layers (grid, selection outlines, handles, hit areas, pin markers, wire preview, plus shell-supplied `extraStrip`), inlines the CSS so the file stands alone, crops to content with a white background, and renders PNG via `<canvas>` at 2×. Dark mode is a screen setting only — export is always black on white.

### No external resources

No CDNs, no web fonts, no icon fonts. Studio's icons are inline SVG in `studio/icons.js` and text uses the system font stack (which also matches what the export embeds, so label widths agree on screen and in files). Keep it that way.
