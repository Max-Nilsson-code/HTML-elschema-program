// Rutnät: ren visuell justeringshjälp i pixlar (SVG user units).
// Ingen koppling till verkliga mått i v1 — se ROADMAP.md, "Rutnät".
//
// Steget bor bara här. Övriga moduler går via snapToGrid() eller läser
// GRID_SIZE inne i en funktion, aldrig till en egen modulkonstant — det är
// vad som gör att steget går att ställa om vid start (Studio kör 10).

export let GRID_SIZE = 20;

/**
 * Ändrar rutnätssteget (world units).
 *
 * Måste anropas innan setupGrid() kör: mönstret byggs en gång och
 * återanvänds sedan, så en senare omställning skulle inte synas i linjerna.
 */
export function setGridSize(size) {
  GRID_SIZE = size;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const PATTERN_ID = "grid-pattern";

/**
 * Snäpper ett punkt-koordinatpar till närmaste rutnätsskärning.
 * Används av alla senare faser (placera symbol, dra wire, m.m.).
 */
export function snapToGrid(x, y) {
  return {
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
  };
}

/**
 * Skapar (eller återanvänder) rutnätsmönstret i SVG:ns <defs> och lägger en
 * <rect> som fyller angiven world-yta med mönstret. Ytan görs generös
 * (marginal runt viewBox) så att panorering inte hinner visa kant.
 */
export function setupGrid(svg) {
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  let pattern = defs.querySelector(`#${PATTERN_ID}`);
  if (!pattern) {
    pattern = document.createElementNS(SVG_NS, "pattern");
    pattern.setAttribute("id", PATTERN_ID);
    pattern.setAttribute("width", GRID_SIZE);
    pattern.setAttribute("height", GRID_SIZE);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");

    // Ett L-format streck per ruta bygger ihop till ett fullt rutnät när
    // rutorna upprepas — vanligt SVG-knep, slipper rita varje linje för sig.
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", `M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`);
    path.setAttribute("fill", "none");
    path.setAttribute("class", "grid-line");
    pattern.appendChild(path);

    defs.appendChild(pattern);
  }

  let gridRect = svg.querySelector("#grid-background");
  if (!gridRect) {
    gridRect = document.createElementNS(SVG_NS, "rect");
    gridRect.setAttribute("id", "grid-background");
    gridRect.setAttribute("fill", `url(#${PATTERN_ID})`);
    svg.insertBefore(gridRect, defs.nextSibling);
  }

  return gridRect;
}

/**
 * Uppdaterar rutnäts-rektangeln så den täcker den synliga world-ytan
 * (med marginal) för aktuell viewBox. Anropas vid pan/zoom.
 */
export function updateGridExtent(gridRect, viewBox, margin = GRID_SIZE * 10) {
  gridRect.setAttribute("x", viewBox.x - margin);
  gridRect.setAttribute("y", viewBox.y - margin);
  gridRect.setAttribute("width", viewBox.w + margin * 2);
  gridRect.setAttribute("height", viewBox.h + margin * 2);
}
