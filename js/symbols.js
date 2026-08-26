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

  // Prenumeranter som behöver veta när något flyttats/ändrats — junctions.js
  // räknar om kopplingsprickarna utifrån var anslutningarna faktiskt hamnar.
  const changeListeners = new Set();
  const emitChange = () => { for (const fn of changeListeners) fn(); };

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

  /**
   * Kontakten som ett tillägg hamnar ovanpå, om någon.
   *
   * Tillägget är ett manöverdon: det säger HUR kontakten under manövreras.
   * Därför är det tilläggets art som avgör kontaktens beteckningsprefix —
   * en tryckknapp gör kontakten till ett S, ett motorskydd till ett B.
   */
  function findHostContact(addon) {
    const type = getSymbolType(library, addon.typeId);
    const cx = addon.x + type.width / 2;
    const cy = addon.y + type.height / 2;

    const all = getAllInstances();
    for (let i = all.length - 1; i >= 0; i--) {
      const other = all[i];
      if (other.id === addon.id) continue;
      const otherType = getSymbolType(library, other.typeId);
      if (!otherType.hasDesignation) continue; // ett annat tillägg, inte en kontakt
      const b = getInstanceBounds(other);
      if (cx >= b.x && cx <= b.x + b.width && cy >= b.y && cy <= b.y + b.height) return other;
    }
    return null;
  }

  /**
   * Ger kontakten under ett nyplacerat tillägg rätt beteckningsprefix.
   * Har den redan rätt prefix lämnas den i fred, så ett redan satt nummer
   * inte byts ut i onödan.
   */
  function applyAddonPrefix(addon) {
    const type = getSymbolType(library, addon.typeId);
    if (type.hasDesignation) return null; // bara tillägg styr värdsymbolen

    const host = findHostContact(addon);
    if (!host) return null;

    const prefix = type.designationPrefix;
    if (host.designation.startsWith(prefix)) return null;

    host.designation = nextDesignation(prefix);
    renderInstance(host);
    return host;
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
      mirrored: false,
      // Tilläggssymboler bär ingen egen beteckning — den hör till kontakten
      // de placeras ovanpå.
      designation: type.hasDesignation ? nextDesignation(type.designationPrefix) : "",
      pinLabels: Object.fromEntries(type.pins.map((p) => [p.id, p.defaultLabel])),
      // Fria änden på den mekaniska förbindelsen (endast tilläggssymboler).
      stemY: type.stem ? type.stem.defaultY : null,
    };
    instances.set(instance.id, instance);
    renderInstance(instance);
    applyAddonPrefix(instance);
    emitChange();
    return instance;
  }

  function removeInstances(ids) {
    for (const id of ids) {
      const el = elements.get(id);
      if (el) el.remove();
      elements.delete(id);
      instances.delete(id);
    }
    emitChange();
  }

  function moveInstances(ids, dx, dy) {
    for (const id of ids) {
      const instance = instances.get(id);
      if (!instance) continue;
      instance.x += dx;
      instance.y += dy;
    }
    for (const id of ids) updateInstanceTransform(instances.get(id));
    emitChange();
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
    emitChange();
  }

  function rotateInstances(ids, deltaDeg = 90) {
    for (const id of ids) {
      const instance = instances.get(id);
      if (!instance) continue;
      instance.rotation = (instance.rotation + deltaDeg + 360) % 360;
      renderInstance(instance); // etikettpositioner måste räknas om
    }
    emitChange();
  }

  /**
   * Spegelvänder kring symbolens lodräta mittlinje. Tillsammans med
   * rotationen i 90-stegs steg ger det alla åtta lägen — en lodrät spegling
   * är samma sak som en vågrät plus ett halvt varv.
   */
  function mirrorInstances(ids) {
    for (const id of ids) {
      const instance = instances.get(id);
      if (!instance) continue;
      instance.mirrored = !instance.mirrored;
      renderInstance(instance); // etikettankaren måste räknas om
    }
    emitChange();
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
        mirrored: original.mirrored,
        designation: type.hasDesignation ? nextDesignation(type.designationPrefix) : "",
        pinLabels: { ...original.pinLabels },
        stemY: original.stemY,
      };
      instances.set(copy.id, copy);
      renderInstance(copy);
      created.push(copy);
    }
    emitChange();
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
    // Speglingen ligger innerst (längst till höger) så den sker före
    // rotationen. Etiketterna ligger utanför den här gruppen och speglas
    // därför aldrig — bara deras ankarpunkter räknas om.
    const mirror = instance.mirrored ? ` translate(${type.width} 0) scale(-1 1)` : "";
    rotWrap.setAttribute("transform", `rotate(${instance.rotation} ${cx} ${cy})${mirror}`);
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
      const designationPos = localToOffset(instance, type, type.designationX, type.designationY);
      group.appendChild(
        makeLabel("designation-label", designationPos.x, designationPos.y, instance.designation, {
          instanceId: instance.id,
          labelKind: "designation",
        })
      );
    }

    for (const pin of type.pins) {
      const labelPos = localToOffset(instance, type, pin.x + pin.labelDx, pin.y + pin.labelDy);
      group.appendChild(
        makeLabel("pin-label", labelPos.x, labelPos.y, instance.pinLabels[pin.id], {
          instanceId: instance.id,
          labelKind: "pin",
          pinId: pin.id,
        })
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
   * En punkt i symbolens eget system → läge relativt instansens origo.
   *
   * Speglingen görs FÖRE rotationen, precis som i renderingens transform,
   * annars skulle en speglad och roterad symbol få sina etiketter och
   * anslutningar på fel sida.
   */
  function localToOffset(instance, type, x, y) {
    const mirroredX = instance.mirrored ? type.width - x : x;
    return rotatePoint(mirroredX, y, type.width / 2, type.height / 2, instance.rotation);
  }

  /** Motsatsen: en world-punkt → symbolens eget, oroterade och ospeglade system. */
  function worldToLocal(instance, type, worldX, worldY) {
    const p = rotatePoint(
      worldX - instance.x,
      worldY - instance.y,
      type.width / 2,
      type.height / 2,
      -instance.rotation
    );
    return { x: instance.mirrored ? type.width - p.x : p.x, y: p.y };
  }

  /**
   * Flyttar den fria änden på en instans mekaniska förbindelse till punkten
   * under muspekaren. Fungerar i alla fyra rotationslägen.
   *
   * Steget är avsiktligt 1 enhet och INTE hela rutnätssteg: stammen är en
   * mekanisk förbindelse, inte en elektrisk anslutning, och måste kunna sluta
   * exakt vid kontaktens rörliga del. En NO-kontakts blad ligger t.ex. på
   * y≈48 — mellan två rutnätslinjer — så rutnätssnäppning skulle göra just
   * det som funktionen finns till för omöjligt.
   */
  const MIN_STEM_LENGTH = 2;

  function setStemFromWorld(instanceId, worldX, worldY) {
    const instance = instances.get(instanceId);
    if (!instance) return;
    const type = getSymbolType(library, instance.typeId);
    if (!type.stem) return;

    const local = worldToLocal(instance, type, worldX, worldY);

    // Behåll alltid en kort stump, så stammen aldrig vänds in genom kroppen.
    const pointsUp = type.stem.defaultY < type.stem.attachY;
    const limit = pointsUp
      ? type.stem.attachY - MIN_STEM_LENGTH
      : type.stem.attachY + MIN_STEM_LENGTH;
    const wanted = Math.round(local.y);
    instance.stemY = pointsUp ? Math.min(wanted, limit) : Math.max(wanted, limit);
    renderInstance(instance);
    emitChange();
  }

  /** Markerar instansgrupperna i DOM så CSS kan visa t.ex. stamhandtaget. */
  function setSelectedIds(ids) {
    const set = new Set(ids);
    for (const [id, el] of elements) el.classList.toggle("selected", set.has(id));
  }

  /**
   * Instansen längst fram (sist ritad) som träffas av punkten.
   *
   * Testet görs i symbolens eget koordinatsystem: dels mot symbolkroppen,
   * dels mot ett smalt band längs den mekaniska förbindelsen. Att inte
   * använda hela den utvidgade rutan är viktigt — en lång utdragen stam
   * skulle annars ge tillägget en stor rektangulär träffyta som sväljer
   * symboler som ligger under den.
   *
   * Marginalen fyller två syften: greppmån runt symbolernas tunna streck,
   * och täckning för flyttalsavrundningen i skärm→world-omräkningen (ett
   * klick exakt på symbolens kant kan annars landa på 579.9999999 mot en
   * gräns vid 580 och missa).
   */
  const HIT_TOLERANCE = 2;
  const STEM_HIT_HALF_WIDTH = 4;

  function hitsInstance(instance, worldX, worldY) {
    const type = getSymbolType(library, instance.typeId);
    const p = worldToLocal(instance, type, worldX, worldY);

    const inBody =
      p.x >= -HIT_TOLERANCE &&
      p.x <= type.width + HIT_TOLERANCE &&
      p.y >= -HIT_TOLERANCE &&
      p.y <= type.height + HIT_TOLERANCE;
    if (inBody) return true;

    if (!type.stem) return false;
    const top = Math.min(type.stem.attachY, instance.stemY);
    const bottom = Math.max(type.stem.attachY, instance.stemY);
    return (
      Math.abs(p.x - type.stem.x) <= STEM_HIT_HALF_WIDTH &&
      p.y >= top - HIT_TOLERANCE &&
      p.y <= bottom + HIT_TOLERANCE
    );
  }

  /** En instans anslutningspunkter i world-koordinater, med rotation inräknad. */
  function getPinPositions(instance) {
    const type = getSymbolType(library, instance.typeId);
    return type.pins.map((pin) => {
      const p = localToOffset(instance, type, pin.x, pin.y);
      return { x: instance.x + p.x, y: instance.y + p.y, instanceId: instance.id, pinId: pin.id };
    });
  }

  // ---------- spara / öppna ----------

  /** Instanserna som ren data, redo att serialiseras till JSON. */
  function serialize() {
    return getAllInstances().map((i) => ({
      id: i.id,
      typeId: i.typeId,
      x: i.x,
      y: i.y,
      rotation: i.rotation,
      mirrored: Boolean(i.mirrored),
      designation: i.designation,
      pinLabels: { ...i.pinLabels },
      stemY: i.stemY,
    }));
  }

  /**
   * Ersätter allt innehåll med det inlästa. Id:n behålls som de var i filen,
   * eftersom ledningarnas bindningar pekar på dem — och räknaren flyttas förbi
   * det högsta använda numret så nya symboler inte krockar.
   */
  function loadState(list) {
    removeInstances(getAllInstances().map((i) => i.id));

    for (const raw of list) {
      const type = getSymbolType(library, raw.typeId); // kastar vid okänd typ
      const instance = {
        id: raw.id,
        typeId: raw.typeId,
        x: raw.x,
        y: raw.y,
        rotation: raw.rotation ?? 0,
        mirrored: Boolean(raw.mirrored),
        designation: raw.designation ?? "",
        pinLabels: { ...Object.fromEntries(type.pins.map((p) => [p.id, p.defaultLabel])), ...raw.pinLabels },
        stemY: type.stem ? raw.stemY ?? type.stem.defaultY : null,
      };
      instances.set(instance.id, instance);
      renderInstance(instance);

      const num = parseInt(String(raw.id).replace(/^sym-/, ""), 10);
      if (!Number.isNaN(num) && num >= nextInstanceNumber) nextInstanceNumber = num + 1;
    }
    emitChange();
  }

  /** Sätter en instans beteckning (t.ex. "K1"). Tom sträng är tillåtet. */
  function setDesignation(instanceId, text) {
    const instance = instances.get(instanceId);
    if (!instance) return;
    instance.designation = text;
    renderInstance(instance);
    emitChange();
  }

  /** Sätter namnet på en anslutningspunkt (t.ex. "13"). */
  function setPinLabel(instanceId, pinId, text) {
    const instance = instances.get(instanceId);
    if (!instance || !(pinId in instance.pinLabels)) return;
    instance.pinLabels[pinId] = text;
    renderInstance(instance);
    emitChange();
  }

  /** Ett bestämt anslutningsläge, eller null om symbolen/pinnen inte finns. */
  function getPinPosition(instanceId, pinId) {
    const instance = instances.get(instanceId);
    if (!instance) return null;
    return getPinPositions(instance).find((p) => p.pinId === pinId) ?? null;
  }

  /**
   * Närmaste anslutningspunkt inom maxDist — används av ledningsverktyget för
   * att låta ändpunkter fästa i symbolernas anslutningar i stället för att
   * bara snäppa mot rutnätet.
   */
  function findNearestPin(worldX, worldY, maxDist) {
    let best = null;
    let bestDist2 = maxDist * maxDist;
    for (const instance of instances.values()) {
      for (const p of getPinPositions(instance)) {
        const dist2 = (p.x - worldX) ** 2 + (p.y - worldY) ** 2;
        if (dist2 <= bestDist2) {
          bestDist2 = dist2;
          best = p;
        }
      }
    }
    return best;
  }

  function hitTestPoint(worldX, worldY) {
    const all = getAllInstances();
    for (let i = all.length - 1; i >= 0; i--) {
      if (hitsInstance(all[i], worldX, worldY)) return all[i];
    }
    return null;
  }

  return {
    addInstance,
    removeInstances,
    moveInstances,
    snapInstances,
    rotateInstances,
    mirrorInstances,
    duplicateInstances,
    getInstance,
    getAllInstances,
    getInstanceBounds,
    hitTestPoint,
    findNearestPin,
    getPinPositions,
    getPinPosition,
    serialize,
    loadState,
    setDesignation,
    findHostContact,
    setPinLabel,
    onChange: (fn) => changeListeners.add(fn),
    setStemFromWorld,
    setSelectedIds,
    renderAll,

    // Adapter mot selection.js, som hanterar symboler och ledningar likadant.
    selectionProvider: {
      owns: (id) => instances.has(id),
      getAll: getAllInstances,
      getBounds: getInstanceBounds,
      hitTestPoint,
      move: moveInstances,
      snap: snapInstances,
      remove: removeInstances,
      setSelectedIds,
      rotate: rotateInstances,
      mirror: mirrorInstances,
      duplicate: duplicateInstances,
      startHandleDrag(event) {
        if (!event.target.classList?.contains("stem-handle")) return null;
        const instanceId = event.target.dataset.instanceId;
        return {
          move: (world) => setStemFromWorld(instanceId, world.x, world.y),
          end: () => {},
        };
      },
    },
  };
}

function makeLabel(className, x, y, text, data = {}) {
  const el = document.createElementNS(SVG_NS, "text");
  el.setAttribute("class", className);
  Object.assign(el.dataset, data);
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
