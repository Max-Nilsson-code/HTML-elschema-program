// Ledningar: rent visuella linjer mellan punkter — ingen elektrisk modell,
// ingen netlist, ingen validering (bekräftat ur scope, se ROADMAP.md).
//
// Ledningar ritas ortogonalt: styrscheman består av vågräta rader mellan
// fas och nolla, med lodräta avstick. En ledning lagras därför som två
// ändpunkter plus vilket håll knäet går, och rutas om automatiskt när en
// ändpunkt flyttas.

import { snapToGrid } from "./grid.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// Anslutningspunkter drar till sig ändpunkten inom den här radien; utanför
// den snäpper ledningen mot rutnätet som allt annat.
const PIN_SNAP_RADIUS = 12;
const HIT_TOLERANCE = 5;

let nextWireNumber = 1;

export function initWires(svg, canvasApi, symbolsApi, tools) {
  const layer = document.createElementNS(SVG_NS, "g");
  layer.setAttribute("id", "wires-layer");
  // Under symbolerna: symbolkropparna ska rita över ledningarna där de möts.
  const symbolsLayer = svg.querySelector("#symbols-layer");
  svg.insertBefore(layer, symbolsLayer ?? null);

  const preview = document.createElementNS(SVG_NS, "g");
  preview.setAttribute("id", "wire-preview");
  svg.appendChild(preview);

  /** @type {Map<string, {id, a:{x,y}, b:{x,y}, elbow:"h"|"v"}>} */
  const wires = new Map();
  const elements = new Map();

  // Prenumeranter som behöver veta när ledningarna ändrats — junctions.js
  // räknar om kopplingsprickarna.
  const changeListeners = new Set();
  const emitChange = () => { for (const fn of changeListeners) fn(); };

  // pending = null innan startpunkten satts; hoverPoint är den snäppta
  // punkten under muspekaren och visas även innan man börjat rita.
  let pending = null; // {a:{x,y}, elbow:"h"|"v"}
  let hoverPoint = null;

  // ---------- geometri ----------

  /** Punkterna som faktiskt ritas: rak linje, annars ett knä. */
  function routePoints(wire) {
    const { a, b, elbow } = wire;
    if (a.x === b.x || a.y === b.y) return [a, b];
    return elbow === "h" ? [a, { x: b.x, y: a.y }, b] : [a, { x: a.x, y: b.y }, b];
  }

  /**
   * Snäpper en punkt: i första hand mot en anslutningspunkt, annars rutnätet.
   *
   * Träffas en anslutning följer `attach` med — ledningsänden binds då till
   * den anslutningen och flyttar sig automatiskt när symbolen flyttas eller
   * roteras (se syncAttachments).
   */
  function snapPoint(worldX, worldY) {
    const pin = symbolsApi.findNearestPin(worldX, worldY, PIN_SNAP_RADIUS);
    if (pin) {
      return {
        x: pin.x,
        y: pin.y,
        onPin: true,
        attach: { instanceId: pin.instanceId, pinId: pin.pinId },
      };
    }
    const g = snapToGrid(worldX, worldY);
    return { x: g.x, y: g.y, onPin: false, attach: null };
  }

  // ---------- rendering ----------

  function renderWire(wire) {
    let group = elements.get(wire.id);
    if (!group) {
      group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", "wire-instance");
      group.dataset.wireId = wire.id;
      layer.appendChild(group);
      elements.set(wire.id, group);
    }
    group.replaceChildren();

    const pts = routePoints(wire);
    const d = pts.map((p) => `${p.x},${p.y}`).join(" ");

    // Osynlig, tjock linje under den synliga: ger greppmån vid klick utan
    // att göra själva ledningen tjockare.
    const hitLine = document.createElementNS(SVG_NS, "polyline");
    hitLine.setAttribute("class", "wire-hit");
    hitLine.setAttribute("points", d);
    group.appendChild(hitLine);

    const line = document.createElementNS(SVG_NS, "polyline");
    line.setAttribute("class", wire.dashed ? "wire wire-dashed" : "wire");
    line.setAttribute("points", d);
    group.appendChild(line);

    for (const end of ["a", "b"]) {
      const handle = document.createElementNS(SVG_NS, "circle");
      handle.setAttribute("class", "wire-handle");
      handle.dataset.wireId = wire.id;
      handle.dataset.endpoint = end;
      handle.setAttribute("cx", wire[end].x);
      handle.setAttribute("cy", wire[end].y);
      handle.setAttribute("r", 4);
      group.appendChild(handle);
    }
  }

  function renderPreview() {
    preview.replaceChildren();
    if (!tools.isWire()) return;

    if (pending && hoverPoint) {
      const pts = routePoints({ a: pending.a, b: hoverPoint, elbow: pending.elbow });
      const line = document.createElementNS(SVG_NS, "polyline");
      line.setAttribute("class",
        tools.isDashed() ? "wire-preview-line preview-dashed" : "wire-preview-line");
      line.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
      preview.appendChild(line);
    }

    for (const p of [pending?.a, hoverPoint]) {
      if (!p) continue;
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("class", p.onPin ? "wire-snap-dot on-pin" : "wire-snap-dot");
      dot.setAttribute("cx", p.x);
      dot.setAttribute("cy", p.y);
      dot.setAttribute("r", p.onPin ? 5 : 3);
      preview.appendChild(dot);
    }
  }

  // ---------- ritning ----------

  function cancelPending() {
    pending = null;
    hoverPoint = null;
    renderPreview();
  }

  function toggleElbow() {
    if (!pending) return;
    pending.elbow = pending.elbow === "h" ? "v" : "h";
    renderPreview();
  }

  svg.addEventListener("mousedown", (event) => {
    if (!tools.isWire() || event.button !== 0) return;
    if (canvasApi.isSpaceHeld() || canvasApi.isPanning()) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const world = canvasApi.screenToWorld(event.clientX, event.clientY);
    const p = snapPoint(world.x, world.y);

    if (!pending) {
      pending = { a: p, b: null, elbow: "h" };
      renderPreview();
      return;
    }

    // Nolllång ledning är inget att skapa — behandla som en omstart.
    if (p.x === pending.a.x && p.y === pending.a.y) {
      cancelPending();
      return;
    }

    addWire(pending.a, p, pending.elbow, tools.isDashed());
    cancelPending();
  });

  svg.addEventListener("mousemove", (event) => {
    if (!tools.isWire()) return;
    const world = canvasApi.screenToWorld(event.clientX, event.clientY);
    hoverPoint = snapPoint(world.x, world.y);
    renderPreview();
  });

  tools.onChange(() => cancelPending());

  window.addEventListener("keydown", (event) => {
    if (!tools.isWire()) return;
    if (event.key === "Escape") cancelPending();
    else if (event.key.toLowerCase() === "e") toggleElbow();
  });

  // ---------- bindning till symbolernas anslutningar ----------

  /**
   * Flyttar bundna ledningsändar till sina anslutningars aktuella lägen.
   * Körs varje gång symbolerna ändras, så ledningarna följer med när en
   * symbol flyttas eller roteras.
   *
   * Har symbolen (eller anslutningen) försvunnit släpps bindningen och
   * ledningen blir liggande där den var.
   */
  function syncAttachments() {
    let changed = false;

    for (const wire of wires.values()) {
      let wireChanged = false;

      for (const end of ["a", "b"]) {
        const attach = wire[end].attach;
        if (!attach) continue;

        const pin = symbolsApi.getPinPosition(attach.instanceId, attach.pinId);
        if (!pin) {
          wire[end] = { x: wire[end].x, y: wire[end].y, attach: null };
          wireChanged = true;
          continue;
        }
        if (pin.x !== wire[end].x || pin.y !== wire[end].y) {
          wire[end] = { x: pin.x, y: pin.y, attach };
          wireChanged = true;
        }
      }

      if (wireChanged) {
        renderWire(wire);
        changed = true;
      }
    }

    if (changed) emitChange();
  }

  symbolsApi.onChange(syncAttachments);

  // ---------- spara / öppna ----------

  function serialize() {
    return Array.from(wires.values()).map((w) => ({
      id: w.id,
      a: { x: w.a.x, y: w.a.y, attach: w.a.attach },
      b: { x: w.b.x, y: w.b.y, attach: w.b.attach },
      elbow: w.elbow,
      dashed: Boolean(w.dashed),
    }));
  }

  /**
   * Ersätter alla ledningar. Bindningarna läses in som de är; syncAttachments
   * städar bort dem som pekar på symboler filen inte innehöll.
   */
  function loadState(list) {
    removeWires(Array.from(wires.keys()));

    for (const raw of list) {
      const wire = {
        id: raw.id,
        a: { x: raw.a.x, y: raw.a.y, attach: raw.a.attach ?? null },
        b: { x: raw.b.x, y: raw.b.y, attach: raw.b.attach ?? null },
        elbow: raw.elbow === "v" ? "v" : "h",
        dashed: Boolean(raw.dashed),
      };
      wires.set(wire.id, wire);
      renderWire(wire);

      const num = parseInt(String(raw.id).replace(/^wire-/, ""), 10);
      if (!Number.isNaN(num) && num >= nextWireNumber) nextWireNumber = num + 1;
    }
    syncAttachments();
    emitChange();
  }

  // ---------- API ----------

  function addWire(a, b, elbow = "h", dashed = false) {
    const wire = {
      id: `wire-${nextWireNumber++}`,
      a: { x: a.x, y: a.y, attach: a.attach ?? null },
      b: { x: b.x, y: b.y, attach: b.attach ?? null },
      elbow,
      dashed,
    };
    wires.set(wire.id, wire);
    renderWire(wire);
    emitChange();
    return wire;
  }

  function getBounds(wire) {
    const pts = routePoints(wire);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  function hitTestPoint(worldX, worldY) {
    const all = Array.from(wires.values());
    for (let i = all.length - 1; i >= 0; i--) {
      const pts = routePoints(all[i]);
      for (let s = 0; s < pts.length - 1; s++) {
        if (distToSegment(worldX, worldY, pts[s], pts[s + 1]) <= HIT_TOLERANCE) return all[i];
      }
    }
    return null;
  }

  function moveWires(ids, dx, dy) {
    for (const id of ids) {
      const wire = wires.get(id);
      if (!wire) continue;
      // Drar man hela ledningen lossnar den från symbolen — annars skulle
      // den snärta tillbaka vid nästa synkning.
      wire.a = { x: wire.a.x + dx, y: wire.a.y + dy, attach: null };
      wire.b = { x: wire.b.x + dx, y: wire.b.y + dy, attach: null };
      renderWire(wire);
    }
    emitChange();
  }

  function snapWires(ids) {
    for (const id of ids) {
      const wire = wires.get(id);
      if (!wire) continue;
      for (const end of ["a", "b"]) {
        const p = snapPoint(wire[end].x, wire[end].y);
        wire[end] = { x: p.x, y: p.y, attach: p.attach };
      }
      renderWire(wire);
    }
    emitChange();
  }

  function removeWires(ids) {
    for (const id of ids) {
      elements.get(id)?.remove();
      elements.delete(id);
      wires.delete(id);
    }
    emitChange();
  }

  function setEndpointFromWorld(wireId, endpoint, worldX, worldY) {
    const wire = wires.get(wireId);
    if (!wire) return;
    const p = snapPoint(worldX, worldY);
    wire[endpoint] = { x: p.x, y: p.y, attach: p.attach };
    renderWire(wire);
    emitChange();
  }

  function setSelectedIds(ids) {
    const set = new Set(ids);
    for (const [id, el] of elements) el.classList.toggle("selected", set.has(id));
  }

  const selectionProvider = {
    owns: (id) => wires.has(id),
    getAll: () => Array.from(wires.values()),
    getBounds,
    hitTestPoint,
    move: moveWires,
    snap: snapWires,
    remove: removeWires,
    setSelectedIds,
    startHandleDrag(event) {
      if (!event.target.classList?.contains("wire-handle")) return null;
      const { wireId, endpoint } = event.target.dataset;
      return {
        move: (world) => setEndpointFromWorld(wireId, endpoint, world.x, world.y),
        end: () => {},
      };
    },
  };

  return {
    addWire,
    getAllWires: () => Array.from(wires.values()),
    // Exponeras för junctions.js, som behöver de faktiskt ritade punkterna
    // (inklusive knäet) för att räkna ledare i varje punkt.
    routePoints,
    serialize,
    loadState,
    onChange: (fn) => changeListeners.add(fn),
    selectionProvider,
  };
}

/** Kortaste avståndet från en punkt till ett linjesegment. */
function distToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}
