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

  // Prenumeranter på vyn — Studios zoomruta speglar zoomnivån.
  const viewListeners = new Set();

  function applyViewBox() {
    svg.setAttribute(
      "viewBox",
      `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`
    );
    updateGridExtent(gridRect, viewBox);
    for (const fn of viewListeners) fn();
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

  /**
   * Zoomar med en faktor kring en skärmpunkt. Utan punkt zoomas det kring
   * ritytans mitt, vilket är vad zoomknappar ska göra.
   */
  function zoomBy(factor, clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    const cx = clientX ?? rect.left + rect.width / 2;
    const cy = clientY ?? rect.top + rect.height / 2;
    const newZoom = clamp(currentZoom() * factor, MIN_ZOOM, MAX_ZOOM);

    // Håll punkten under muspekaren still medan vi zoomar.
    const before = screenToWorld(cx, cy);
    viewBox.w = baseSize.w / newZoom;
    viewBox.h = baseSize.h / newZoom;
    const after = screenToWorld(cx, cy);
    viewBox.x += before.x - after.x;
    viewBox.y += before.y - after.y;

    applyViewBox();
  }

  /** Passar in en world-rektangel i vyn, centrerad, med marginal i skärmpixlar. */
  function fitWorldRect(rect, padPx = 60) {
    if (!rect || rect.width <= 0 || rect.height <= 0) return;
    const zoom = clamp(
      Math.min((baseSize.w - padPx * 2) / rect.width, (baseSize.h - padPx * 2) / rect.height),
      MIN_ZOOM,
      MAX_ZOOM
    );
    viewBox.w = baseSize.w / zoom;
    viewBox.h = baseSize.h / zoom;
    viewBox.x = rect.x + rect.width / 2 - viewBox.w / 2;
    viewBox.y = rect.y + rect.height / 2 - viewBox.h / 2;
    applyViewBox();
  }

  // --- Zoom (scrollhjul, centrerad på muspekaren) ---
  svg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      // Scrolla uppåt/bort (negativ deltaY) zoomar in, nedåt zoomar ut —
      // samma konvention som Google Maps/Figma m.fl.
      zoomBy(event.deltaY > 0 ? 1 / 1.1 : 1.1, event.clientX, event.clientY);
    },
    { passive: false }
  );

  // --- Panorering (mellanslag+dra eller mellanknapp-dra) ---
  let spaceHeld = false;
  let panState = null;

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !event.repeat) {
      // Mellanslag i ett textfält är ett blanksteg, och på en fokuserad
      // knapp eller väljare är det knappens egen aktivering — i inget av
      // fallen ska ritytan gå i panoreringsläge.
      const tag = event.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
      if (event.target.isContentEditable) return;
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

  // Tappar fönstret fokus (alt-tab) medan mellanslag hålls nere kommer aldrig
  // keyup — utan detta skulle spaceHeld fastna som true och alla vänsterklick
  // avfärdas som "panorering äger klicket" för all framtid.
  window.addEventListener("blur", () => {
    spaceHeld = false;
    panState = null;
    svg.classList.remove("pan-ready", "panning");
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

  // --- Ritytans storlek ---
  //
  // ResizeObserver, inte window-resize: ritytan krymper även när fönstret
  // står stilla, t.ex. när egenskapspanelen fälls ut vid markering. Missar
  // man det behåller viewBox sin gamla bredd och hela världen sträcks ut —
  // klick hamnar då fel i förhållande till det som ritats.
  const observer = new ResizeObserver(() => {
    const zoom = currentZoom();
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.width === baseSize.w && rect.height === baseSize.h) return;
    baseSize.w = rect.width;
    baseSize.h = rect.height;
    viewBox.w = baseSize.w / zoom;
    viewBox.h = baseSize.h / zoom;
    applyViewBox();
  });
  observer.observe(svg);

  applyViewBox();

  return {
    viewBox,
    screenToWorld,
    currentZoom,
    zoomBy,
    fitWorldRect,
    /** Anropas varje gång vyn ändras (zoom eller panorering). */
    onView: (fn) => viewListeners.add(fn),
    // Exponeras så andra moduler (t.ex. selection.js) kan undvika att
    // tolka en panorerings-klick som ett markerings-klick.
    isSpaceHeld: () => spaceHeld,
    isPanning: () => panState !== null,
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
