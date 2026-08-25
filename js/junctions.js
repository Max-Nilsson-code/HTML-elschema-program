// Kopplingsprickar (junction dots).
//
// Konventionen i elscheman: en fylld prick ritas BARA där tre eller fler
// ledare möts — alltså vid en förgrening. Två symboler som kopplas ihop
// ände mot ände, eller två ledningar som möts i ett hörn, får ingen prick;
// där är det bara en genomgående ledare och prickar skulle bara skräpa ner
// och antyda en förgrening som inte finns.
//
// Prickarna ritas därför inte som fast geometri utan räknas ut från var
// ledningar och anslutningspunkter faktiskt hamnar, och ritas om när något
// flyttas.

const SVG_NS = "http://www.w3.org/2000/svg";

// Två punkter räknas som samma om de ligger närmare varandra än så här.
// Ledningsändar snäpper mot rutnät eller anslutningspunkt, så exakta
// träffar är regel — toleransen finns för flyttalsavrundning.
const EPS = 0.5;

export function initJunctions(svg, symbolsApi, wiresApi) {
  const layer = document.createElementNS(SVG_NS, "g");
  layer.setAttribute("id", "junctions-layer");
  const symbolsLayer = svg.querySelector("#symbols-layer");
  // Ovanför symbolerna, så pricken syns även där en ledning möter en
  // symbolkropp.
  svg.insertBefore(layer, symbolsLayer ? symbolsLayer.nextSibling : null);

  let scheduled = false;

  /** Samlar ihop uppdateringar så ett drag inte räknar om per musrörelse. */
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }

  function update() {
    layer.replaceChildren();

    const wires = wiresApi.getAllWires();
    // Alla ledningars ritade segment, en gång, så vi slipper räkna om dem
    // för varje kandidatpunkt.
    const segments = [];
    const candidates = [];

    for (const wire of wires) {
      // Streckade linjer är mekaniska förbindelser, inte ledare — de ska
      // varken ge upphov till en kopplingsprick eller räknas in i en.
      if (wire.dashed) continue;
      const pts = wiresApi.routePoints(wire);
      for (const p of pts) candidates.push({ x: p.x, y: p.y });
      for (let i = 0; i < pts.length - 1; i++) segments.push([pts[i], pts[i + 1]]);
    }

    const pins = collectPinPositions();
    for (const pin of pins) candidates.push(pin);

    // En prick per unik punkt, inte per kandidat.
    const seen = new Set();
    for (const c of candidates) {
      const key = `${Math.round(c.x / EPS)}:${Math.round(c.y / EPS)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (countConductors(c, segments, pins) >= 3) drawDot(c);
    }
  }

  /** Anslutningspunkternas world-lägen för samtliga placerade symboler. */
  function collectPinPositions() {
    const out = [];
    for (const instance of symbolsApi.getAllInstances()) {
      for (const p of symbolsApi.getPinPositions(instance)) out.push(p);
    }
    return out;
  }

  /**
   * Antalet ledaränder som möts i punkten.
   *
   * En ledning som SLUTAR i punkten bidrar med 1. En som går RAKT IGENOM
   * (eller har sitt knä där) bidrar med 2, eftersom det är två ledare som
   * möts. En symbolanslutning bidrar med 1 — symbolens egen ledare.
   * Summan 3 eller mer betyder förgrening.
   */
  function countConductors(point, segments, pins) {
    let count = 0;

    for (const pin of pins) {
      if (same(pin, point)) count += 1;
    }

    for (const [a, b] of segments) {
      if (same(a, point)) count += 1;
      else if (same(b, point)) count += 1;
      else if (onSegmentInterior(point, a, b)) count += 2;
    }

    return count;
  }

  function drawDot(p) {
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("class", "junction-dot");
    dot.setAttribute("cx", p.x);
    dot.setAttribute("cy", p.y);
    dot.setAttribute("r", 3.5);
    layer.appendChild(dot);
  }

  symbolsApi.onChange(scheduleUpdate);
  wiresApi.onChange(scheduleUpdate);
  update();

  return { update, scheduleUpdate };
}

const same = (a, b) => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS;

/** Ligger punkten på segmentet, men inte i någon av dess ändar? */
function onSegmentInterior(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return false;

  const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  if (t <= 0 || t >= 1) return false;

  const dist = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  return dist < EPS;
}
