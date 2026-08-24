// Symbolinstanser: placera, flytta, rotera, duplicera, radera — samt
// rendering till SVG. Se ROADMAP.md, Fas 2 (datamodell) och Fas 3
// (manipulation).
//
// Geometri och pin-markörer roteras tillsammans i en inre <g> (cirklar är
// rotationssymmetriska så pin-markörerna påverkas inte visuellt). Etiketter
// (beteckning + pinnamn) ligger utanför den roterade gruppen — deras
// ankarpunkt roteras med räkning i JS, men själva texten hålls alltid
// horisontell/läsbar, oavsett symbolens rotation.

import { snapToGrid } from "./grid.js";
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

  /** Axelriktad bounding box i world-koordinater (hanterar 90/270°-rotation). */
  function getInstanceBounds(instance) {
    const type = getSymbolType(library, instance.typeId);
    const centerX = instance.x + type.width / 2;
    const centerY = instance.y + type.height / 2;
    const swapped = instance.rotation === 90 || instance.rotation === 270;
    const w = swapped ? type.height : type.width;
    const h = swapped ? type.width : type.height;
    return { x: centerX - w / 2, y: centerY - h / 2, width: w, height: h };
  }

  /** Instansen längst fram (sist ritad) vars bounding box innehåller punkten. */
  function hitTestPoint(worldX, worldY) {
    const all = getAllInstances();
    for (let i = all.length - 1; i >= 0; i--) {
      const b = getInstanceBounds(all[i]);
      if (worldX >= b.x && worldX <= b.x + b.width && worldY >= b.y && worldY <= b.y + b.height) {
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
