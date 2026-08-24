// Symbolinstanser: placera, flytta, rotera, duplicera, radera — samt
// rendering till SVG. Se ROADMAP.md, Fas 2 (datamodell) och Fas 3
// (manipulation).
//
// Geometri och pin-markörer roteras tillsammans i en inre <g> (cirklar är
// rotationssymmetriska så pin-markörerna påverkas inte visuellt). Etiketter
// (beteckning + pinnamn) ligger utanför den roterade gruppen — deras
// ankarpunkt roteras med räkning i JS, men själva texten hålls alltid
// horisontell/läsbar, oavsett symbolens rotation.

import { snapToGrid, GRID_SIZE } from "./grid.js";
import { getSymbolType } from "./symbol-library.js";

const SVG_NS = "http://www.w3.org/2000/svg";

let nextInstanceNumber = 1;

export function initSymbols(svg, library) {
  const layer = document.createElementNS(SVG_NS, "g");
  layer.setAttribute("id", "symbols-layer");
  svg.appendChild(layer);

  /** @type {Map<string, object>} instanceId -> instance */
  const instances = new Map();
  /** @type {Map<string, SVGGElement>} instanceId -> DOM-grupp */
  const elements = new Map();

  function nextDesignation(prefix) {
    let max = 0;
    for (const inst of instances.values()) {
      if (inst.designation.startsWith(prefix)) {
        const num = parseInt(inst.designation.slice(prefix.length), 10);
        if (!Number.isNaN(num) && num > max) max = num;
      }
    }
    return `${prefix}${max + 1}`;
  }

  function addInstance(typeId, worldX, worldY) {
    const type = getSymbolType(library, typeId);
    const snapped = snapToGrid(worldX, worldY);
    const instance = {
      id: `sym-${nextInstanceNumber++}`,
      typeId,
      x: snapped.x,
      y: snapped.y,
      rotation: 0,
      // Tilläggssymboler bär ingen egen beteckning — den hör till kontakten
      // de placeras ovanpå.
      designation: type.hasDesignation ? nextDesignation(type.designationPrefix) : "",
      pinLabels: Object.fromEntries(type.pins.map((p) => [p.id, p.defaultLabel])),
      // Fria änden på den mekaniska förbindelsen (endast tilläggssymboler).
      stemY: type.stem ? type.stem.defaultY : null,
    };
    instances.set(instance.id, instance);
    renderInstance(instance);
    return instance;
  }

  function removeInstances(ids) {
    for (const id of ids) {
      const el = elements.get(id);
      if (el) el.remove();
      elements.delete(id);
      instances.delete(id);
    }
  }

  function moveInstances(ids, dx, dy) {
    for (const id of ids) {
      const instance = instances.get(id);
      if (!instance) continue;
      instance.x += dx;
      instance.y += dy;
    }
    for (const id of ids) updateInstanceTransform(instances.get(id));
  }

  /** Snäpper alla angivna instansers position till rutnätet (t.ex. efter en drag). */
  function snapInstances(ids) {
    for (const id of ids) {
      const instance = instances.get(id);
      if (!instance) continue;
      const snapped = snapToGrid(instance.x, instance.y);
      instance.x = snapped.x;
      instance.y = snapped.y;
      updateInstanceTransform(instance);
    }
  }

  function rotateInstances(ids, deltaDeg = 90) {
    for (const id of ids) {
      const instance = instances.get(id);
      if (!instance) continue;
      instance.rotation = (instance.rotation + deltaDeg + 360) % 360;
      renderInstance(instance); // etikettpositioner måste räknas om
    }
  }

  function duplicateInstances(ids) {
    const created = [];
    for (const id of ids) {
      const original = instances.get(id);
      if (!original) continue;
      const type = getSymbolType(library, original.typeId);
      const copy = {
        id: `sym-${nextInstanceNumber++}`,
        typeId: original.typeId,
        x: original.x + 20,
        y: original.y + 20,
        rotation: original.rotation,
        designation: type.hasDesignation ? nextDesignation(type.designationPrefix) : "",
        pinLabels: { ...original.pinLabels },
        stemY: original.stemY,
      };
      instances.set(copy.id, copy);
      renderInstance(copy);
      created.push(copy);
    }
    return created;
  }

  function renderInstance(instance) {
    const type = getSymbolType(library, instance.typeId);
    const cx = type.width / 2;
    const cy = type.height / 2;

    let group = elements.get(instance.id);
    if (!group) {
      group = document.createElementNS(SVG_NS, "g");
      group.setAttribute("class", "symbol-instance");
      group.dataset.instanceId = instance.id;
      layer.appendChild(group);
      elements.set(instance.id, group);
    } else {
      group.replaceChildren();
    }
    group.setAttribute("transform", `translate(${instance.x} ${instance.y})`);

    const rotWrap = document.createElementNS(SVG_NS, "g");
    rotWrap.setAttribute("class", "symbol-geometry-wrap");
    rotWrap.setAttribute("transform", `rotate(${instance.rotation} ${cx} ${cy})`);
    rotWrap.appendChild(document.importNode(type.geometryElement, true));

    if (type.stem) {
      const stemLine = document.createElementNS(SVG_NS, "line");
      stemLine.setAttribute("class", type.stem.dashed ? "stem stem-dashed" : "stem");
      stemLine.setAttribute("x1", type.stem.x);
      stemLine.setAttribute("y1", type.stem.attachY);
      stemLine.setAttribute("x2", type.stem.x);
      stemLine.setAttribute("y2", instance.stemY);
      rotWrap.appendChild(stemLine);

      // Draghandtag på stammens fria ände. Ligger inuti den roterade gruppen,
      // så det följer symbolens rotation utan extra räkning; CSS visar det
      // bara när instansen är markerad.
      const handle = document.createElementNS(SVG_NS, "circle");
      handle.setAttribute("class", "stem-handle");
      handle.dataset.instanceId = instance.id;
      handle.setAttribute("cx", type.stem.x);
      handle.setAttribute("cy", instance.stemY);
      handle.setAttribute("r", 4);
      rotWrap.appendChild(handle);
    }

    for (const pin of type.pins) {
      const marker = document.createElementNS(SVG_NS, "circle");
      marker.setAttribute("class", "pin-marker");
      marker.setAttribute("cx", pin.x);
      marker.setAttribute("cy", pin.y);
      marker.setAttribute("r", 3);
      rotWrap.appendChild(marker);
    }
    group.appendChild(rotWrap);

    if (type.hasDesignation) {
      const designationPos = rotatePoint(type.designationX, type.designationY, cx, cy, instance.rotation);
      group.appendChild(
        makeLabel("designation-label", designationPos.x, designationPos.y, instance.designation)
      );
    }

    for (const pin of type.pins) {
      const labelPos = rotatePoint(pin.x + pin.labelDx, pin.y + pin.labelDy, cx, cy, instance.rotation);
      group.appendChild(
        makeLabel("pin-label", labelPos.x, labelPos.y, instance.pinLabels[pin.id])
      );
    }
  }

  /** Snabb uppdatering vid drag: bara translate, ingen omritning av etiketter. */
  function updateInstanceTransform(instance) {
    const group = elements.get(instance.id);
    if (group) group.setAttribute("transform", `translate(${instance.x} ${instance.y})`);
  }

  function renderAll() {
    for (const instance of instances.values()) renderInstance(instance);
  }

  function getInstance(id) {
    return instances.get(id);
  }

  function getAllInstances() {
    return Array.from(instances.values());
  }

  /**
   * Axelriktad bounding box i world-koordinater. Tar hänsyn till rotation och
   * till att en justerbar stam kan sticka ut utanför symbolens egen ruta.
   */
  function getInstanceBounds(instance) {
    const type = getSymbolType(library, instance.typeId);
    const cx = type.width / 2;
    const cy = type.height / 2;

    // Lokal ruta, utvidgad så den rymmer stammens fria ände.
    let minX = 0;
    let minY = 0;
    let maxX = type.width;
    let maxY = type.height;
    if (type.stem) {
      minY = Math.min(minY, instance.stemY);
      maxY = Math.max(maxY, instance.stemY);
    }

    // Rotera hörnen och ta den axelriktade rutan runt resultatet.
    const corners = [
      [minX, minY],
      [maxX, minY],
      [maxX, maxY],
      [minX, maxY],
    ].map(([px, py]) => rotatePoint(px, py, cx, cy, instance.rotation));

    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    return {
      x: instance.x + Math.min(...xs),
      y: instance.y + Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  /**
   * Flyttar den fria änden på en instans mekaniska förbindelse till närmaste
   * rutnätsläge under muspekaren. Punkten räknas om till symbolens eget
   * (oroterade) koordinatsystem, så det fungerar i alla fyra rotationslägen.
   */
  function setStemFromWorld(instanceId, worldX, worldY) {
    const instance = instances.get(instanceId);
    if (!instance) return;
    const type = getSymbolType(library, instance.typeId);
    if (!type.stem) return;

    const local = rotatePoint(
      worldX - instance.x,
      worldY - instance.y,
      type.width / 2,
      type.height / 2,
      -instance.rotation
    );

    // Snäpp mot rutnätet och håll en minsta stump kvar, så stammen aldrig
    // vänds inåt genom symbolkroppen.
    const snapped = Math.round(local.y / GRID_SIZE) * GRID_SIZE;
    const pointsUp = type.stem.defaultY < type.stem.attachY;
    const limit = pointsUp ? type.stem.attachY - GRID_SIZE / 2 : type.stem.attachY + GRID_SIZE / 2;
    instance.stemY = pointsUp ? Math.min(snapped, limit) : Math.max(snapped, limit);
    renderInstance(instance);
  }

  /** Markerar instansgrupperna i DOM så CSS kan visa t.ex. stamhandtaget. */
  function setSelectedIds(ids) {
    const set = new Set(ids);
    for (const [id, el] of elements) el.classList.toggle("selected", set.has(id));
  }

  /**
   * Instansen längst fram (sist ritad) vars bounding box innehåller punkten.
   *
   * Marginalen fyller två syften: dels ger den lite greppmån runt symbolernas
   * tunna streck, dels täcker den flyttalsavrundningen i skärm→world-
   * omräkningen (ett klick exakt på symbolens kant kan annars landa på
   * 579.9999999 mot en gräns vid 580 och missa).
   */
  const HIT_TOLERANCE = 2;

  function hitTestPoint(worldX, worldY) {
    const all = getAllInstances();
    for (let i = all.length - 1; i >= 0; i--) {
      const b = getInstanceBounds(all[i]);
      if (
        worldX >= b.x - HIT_TOLERANCE &&
        worldX <= b.x + b.width + HIT_TOLERANCE &&
        worldY >= b.y - HIT_TOLERANCE &&
        worldY <= b.y + b.height + HIT_TOLERANCE
      ) {
        return all[i];
      }
    }
    return null;
  }

  return {
    addInstance,
    removeInstances,
    moveInstances,
    snapInstances,
    rotateInstances,
    duplicateInstances,
    getInstance,
    getAllInstances,
    getInstanceBounds,
    hitTestPoint,
    setStemFromWorld,
    setSelectedIds,
    renderAll,
  };
}

function makeLabel(className, x, y, text) {
  const el = document.createElementNS(SVG_NS, "text");
  el.setAttribute("class", className);
  el.setAttribute("x", x);
  el.setAttribute("y", y);
  el.setAttribute("text-anchor", "middle");
  el.setAttribute("dominant-baseline", "middle");
  el.textContent = text ?? "";
  return el;
}

function rotatePoint(x, y, cx, cy, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}
