// Fristående textetiketter: rubriker, anteckningar och förtydliganden som
// inte hör till någon symbol.
//
// Till skillnad från symbolernas etiketter (labels.js) är de här egna
// objekt med egen position — de placeras var som helst på ritytan, markeras,
// flyttas, roteras och raderas som allt annat.

import { snapToGrid } from "./grid.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const DEFAULT_TEXT = "Text";
const DEFAULT_SIZE = 14;
const MIN_SIZE = 6;
const MAX_SIZE = 96;
// Greppmån runt texten vid klick — texter är tunna och svåra att träffa exakt.
const HIT_PADDING = 4;

let nextTextNumber = 1;

export function initTexts(svg, canvasApi, tools) {
  const layer = document.createElementNS(SVG_NS, "g");
  layer.setAttribute("id", "texts-layer");
  svg.appendChild(layer);

  const texts = new Map();
  const elements = new Map();
  const changeListeners = new Set();
  const emitChange = () => { for (const fn of changeListeners) fn(); };

  // ---------- modell ----------

  function addText(worldX, worldY, content = DEFAULT_TEXT) {
    const snapped = snapToGrid(worldX, worldY);
    const item = {
      id: `text-${nextTextNumber++}`,
      x: snapped.x,
      y: snapped.y,
      text: content,
      size: DEFAULT_SIZE,
      rotation: 0,
    };
    texts.set(item.id, item);
    renderText(item);
    emitChange();
    return item;
  }

  function setText(id, value) {
    const item = texts.get(id);
    if (!item) return;
    item.text = value;
    renderText(item);
    emitChange();
  }

  function setSize(id, value) {
    const item = texts.get(id);
    if (!item) return;
    const size = Number(value);
    if (!Number.isFinite(size)) return;
    item.size = Math.min(Math.max(size, MIN_SIZE), MAX_SIZE);
    renderText(item);
    emitChange();
  }

  function moveTexts(ids, dx, dy) {
    for (const id of ids) {
      const item = texts.get(id);
      if (!item) continue;
      item.x += dx;
      item.y += dy;
      updateTransform(item);
    }
    emitChange();
  }

  function snapTexts(ids) {
    for (const id of ids) {
      const item = texts.get(id);
      if (!item) continue;
      const s = snapToGrid(item.x, item.y);
      item.x = s.x;
      item.y = s.y;
      updateTransform(item);
    }
    emitChange();
  }

  function rotateTexts(ids, deltaDeg = 90) {
    for (const id of ids) {
      const item = texts.get(id);
      if (!item) continue;
      item.rotation = (item.rotation + deltaDeg + 360) % 360;
      renderText(item);
    }
    emitChange();
  }

  function duplicateTexts(ids) {
    const created = [];
    for (const id of ids) {
      const original = texts.get(id);
      if (!original) continue;
      const copy = { ...original, id: `text-${nextTextNumber++}`, x: original.x + 20, y: original.y + 20 };
      texts.set(copy.id, copy);
      renderText(copy);
      created.push(copy);
    }
    emitChange();
    return created;
  }

  function removeTexts(ids) {
    for (const id of ids) {
      elements.get(id)?.remove();
      elements.delete(id);
      texts.delete(id);
    }
    emitChange();
  }

  // ---------- rendering ----------

  function renderText(item) {
    let group = elements.get(item.id);
    if (!group) {
      group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", "text-instance");
      group.dataset.textId = item.id;
      layer.appendChild(group);
      elements.set(item.id, group);
    }
    group.replaceChildren();
    updateTransform(item);

    const el = document.createElementNS(SVG_NS, "text");
    el.setAttribute("class", "free-text");
    // Ankaret är textens övre vänstra hörn — det gör rutan för markering och
    // träfftest enkel att räkna ut, och matchar hur man tänker när man
    // placerar en anteckning.
    el.setAttribute("x", 0);
    el.setAttribute("y", 0);
    el.setAttribute("text-anchor", "start");
    el.setAttribute("dominant-baseline", "hanging");
    el.setAttribute("font-size", item.size);
    el.dataset.labelKind = "free";
    el.dataset.textId = item.id;
    el.textContent = item.text;
    group.appendChild(el);
  }

  function updateTransform(item) {
    const group = elements.get(item.id);
    if (!group) return;
    group.setAttribute(
      "transform",
      `translate(${item.x} ${item.y}) rotate(${item.rotation})`
    );
  }

  /**
   * Textens utsträckning i world-koordinater. Måtten läses av från det
   * renderade elementet — en texts bredd går inte att räkna fram, den beror
   * på teckensnitt och innehåll.
   */
  function getBounds(item) {
    const group = elements.get(item.id);
    const el = group?.querySelector("text");
    if (!el) return { x: item.x, y: item.y, width: 0, height: 0 };

    const bb = el.getBBox();
    const corners = [
      [bb.x, bb.y],
      [bb.x + bb.width, bb.y],
      [bb.x + bb.width, bb.y + bb.height],
      [bb.x, bb.y + bb.height],
    ].map(([px, py]) => rotate(px, py, item.rotation));

    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    return {
      x: item.x + Math.min(...xs) - HIT_PADDING,
      y: item.y + Math.min(...ys) - HIT_PADDING,
      width: Math.max(...xs) - Math.min(...xs) + HIT_PADDING * 2,
      height: Math.max(...ys) - Math.min(...ys) + HIT_PADDING * 2,
    };
  }

  function hitTestPoint(worldX, worldY) {
    const all = Array.from(texts.values());
    for (let i = all.length - 1; i >= 0; i--) {
      const b = getBounds(all[i]);
      if (worldX >= b.x && worldX <= b.x + b.width && worldY >= b.y && worldY <= b.y + b.height) {
        return all[i];
      }
    }
    return null;
  }

  // ---------- placering ----------

  // Registreras före markeringen i main.js, så ett placeringsklick inte
  // också blir ett markeringsklick.
  svg.addEventListener("mousedown", (event) => {
    if (!tools.isText() || event.button !== 0) return;
    if (canvasApi.isSpaceHeld() || canvasApi.isPanning()) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const world = canvasApi.screenToWorld(event.clientX, event.clientY);
    const item = addText(world.x, world.y);
    tools.reset();
    onPlaced?.(item);
  });

  let onPlaced = null;

  // ---------- spara / öppna ----------

  function serialize() {
    return Array.from(texts.values()).map((t) => ({
      id: t.id, x: t.x, y: t.y, text: t.text, size: t.size, rotation: t.rotation,
    }));
  }

  function loadState(list) {
    removeTexts(Array.from(texts.keys()));
    for (const raw of list ?? []) {
      const item = {
        id: raw.id,
        x: raw.x,
        y: raw.y,
        text: raw.text ?? "",
        size: Number(raw.size) || DEFAULT_SIZE,
        rotation: raw.rotation ?? 0,
      };
      texts.set(item.id, item);
      renderText(item);
      const num = parseInt(String(raw.id).replace(/^text-/, ""), 10);
      if (!Number.isNaN(num) && num >= nextTextNumber) nextTextNumber = num + 1;
    }
    emitChange();
  }

  const selectionProvider = {
    owns: (id) => texts.has(id),
    getAll: () => Array.from(texts.values()),
    getBounds,
    hitTestPoint,
    move: moveTexts,
    snap: snapTexts,
    remove: removeTexts,
    rotate: rotateTexts,
    duplicate: duplicateTexts,
    setSelectedIds: (ids) => {
      const set = new Set(ids);
      for (const [id, el] of elements) el.classList.toggle("selected", set.has(id));
    },
  };

  return {
    addText, setText, setSize, removeTexts,
    getText: (id) => texts.get(id),
    getAll: () => Array.from(texts.values()),
    serialize, loadState,
    onChange: (fn) => changeListeners.add(fn),
    onPlaced: (fn) => { onPlaced = fn; },
    selectionProvider,
  };
}

function rotate(x, y, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: x * Math.cos(rad) - y * Math.sin(rad), y: x * Math.sin(rad) + y * Math.cos(rad) };
}
