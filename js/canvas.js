// Rityta: SVG-canvas med zoom (scrollhjul) och panorering
// (mellanslag+dra, eller mellanknapp-dra). Zoom/pan görs genom att ändra
// SVG-elementets viewBox — allt som ritas i "world"-koordinater (rutnät,
// senare symboler/wires) följer med automatiskt.

import { setupGrid, updateGridExtent } from "./grid.js";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 5;

export function initCanvas(svg) {
  // Mät SVG-elementet självt (inte fönstret) — ritytan delar bredd med
  // symbolpaletten, så window.innerWidth skulle ge fel skala.
  const initialRect = svg.getBoundingClientRect();
  const viewBox = {
    x: 0,
    y: 0,
    w: initialRect.width,
    h: initialRect.height,
  };
  // Bas-storlek (world units vid zoom = 1), används för att räkna ut
  // zoom-nivån och klämma den inom MIN_ZOOM/MAX_ZOOM.
  const baseSize = { w: viewBox.w, h: viewBox.h };

  const gridRect = setupGrid(svg);

  function applyViewBox() {
    svg.setAttribute(
      "viewBox",
      `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
    );
    updateGridExtent(gridRect, viewBox);
  }

  function currentZoom() {
    return baseSize.w / viewBox.w;
  }

  function screenToWorld(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return {
      x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w,
      y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h,
    };
  }

  // --- Zoom (scrollhjul, centrerad på muspekaren) ---
  svg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();

      // Scrolla uppåt/bort (negativ deltaY) zoomar in, nedåt zoomar ut —
      // samma konvention som Google Maps/Figma m.fl.
      const zoomFactor = event.deltaY > 0 ? 1 / 1.1 : 1.1;
      const newZoom = clamp(currentZoom() * zoomFactor, MIN_ZOOM, MAX_ZOOM);
      const newW = baseSize.w / newZoom;
      const newH = baseSize.h / newZoom;

      // Håll punkten under muspekaren still medan vi zoomar.
      const before = screenToWorld(event.clientX, event.clientY);
      viewBox.w = newW;
      viewBox.h = newH;
      const after = screenToWorld(event.clientX, event.clientY);
      viewBox.x += before.x - after.x;
      viewBox.y += before.y - after.y;

      applyViewBox();
    },
    { passive: false }
  );

  // --- Panorering (mellanslag+dra eller mellanknapp-dra) ---
  let spaceHeld = false;
  let panState = null;

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !event.repeat) {
      spaceHeld = true;
      svg.classList.add("pan-ready");
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      spaceHeld = false;
      svg.classList.remove("pan-ready");
    }
  });

  svg.addEventListener("mousedown", (event) => {
    const isMiddleButton = event.button === 1;
    const isSpaceDrag = event.button === 0 && spaceHeld;
    if (!isMiddleButton && !isSpaceDrag) return;

    event.preventDefault();
    panState = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewBoxX: viewBox.x,
      startViewBoxY: viewBox.y,
    };
    svg.classList.add("panning");
  });

  window.addEventListener("mousemove", (event) => {
    if (!panState) return;

    const rect = svg.getBoundingClientRect();
    const dxWorld =
      ((event.clientX - panState.startClientX) / rect.width) * viewBox.w;
    const dyWorld =
      ((event.clientY - panState.startClientY) / rect.height) * viewBox.h;

    viewBox.x = panState.startViewBoxX - dxWorld;
    viewBox.y = panState.startViewBoxY - dyWorld;
    applyViewBox();
  });

  window.addEventListener("mouseup", () => {
    if (!panState) return;
    panState = null;
    svg.classList.remove("panning");
  });

  // --- Fönsterstorlek ---
  window.addEventListener("resize", () => {
    const zoom = currentZoom();
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    baseSize.w = rect.width;
    baseSize.h = rect.height;
    viewBox.w = baseSize.w / zoom;
    viewBox.h = baseSize.h / zoom;
    applyViewBox();
  });

  applyViewBox();

  return {
    viewBox,
    screenToWorld,
    currentZoom,
    // Exponeras så andra moduler (t.ex. selection.js) kan undvika att
    // tolka en panorerings-klick som ett markerings-klick.
    isSpaceHeld: () => spaceHeld,
    isPanning: () => panState !== null,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
