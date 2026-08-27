// Delar som båda paletterna behöver.
//
// Originalets palett (js/palette.js) och Studios (studio/palette.js) ser
// olika ut — flat lista mot kategorier, med eller utan ikoner — men
// förhandsvisningen av en symbol och själva placeringsklicket är samma sak i
// båda. De ligger här så en rättelse räcker på ett ställe.

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Miniatyr av en symboltyp för palettknappen.
 *
 * Den mekaniska förbindelsen ligger inte i `.symbol-geometry` utan ritas
 * från `data-stem-*`, så förhandsvisningen måste rita den själv — annars
 * visas tilläggen utan stam och stämmer inte med det som placeras.
 */
export function buildPreview(type) {
  const preview = document.createElementNS(SVG_NS, "svg");
  preview.setAttribute("viewBox", `0 0 ${type.width} ${type.height}`);
  preview.setAttribute("class", "palette-preview");
  preview.appendChild(document.importNode(type.geometryElement, true));

  if (type.stem) {
    const stem = document.createElementNS(SVG_NS, "line");
    stem.setAttribute("class", type.stem.dashed ? "stem stem-dashed" : "stem");
    stem.setAttribute("x1", type.stem.x);
    stem.setAttribute("y1", type.stem.attachY);
    stem.setAttribute("x2", type.stem.x);
    stem.setAttribute("y2", type.stem.defaultY);
    preview.appendChild(stem);
  }

  return preview;
}

/**
 * Klicket som släpper en armerad symbol på ritytan, plus Escape som avbryter.
 *
 * Måste registreras före selection.js: `stopImmediatePropagation` här gör att
 * markeringen aldrig ser klicket som ett markerings- eller gummibandsklick
 * när en placering faktiskt genomförs.
 */
export function initPlacement(svg, canvasApi, symbolsApi, tools) {
  svg.addEventListener("mousedown", (event) => {
    const typeId = tools.placingTypeId();
    if (!typeId || event.button !== 0) return;
    // Panorering äger klicket — annars skulle ett mellanslag+dra för att
    // scrolla fram rätt plats släppa symbolen på utgångspositionen direkt.
    if (canvasApi.isSpaceHeld() || canvasApi.isPanning()) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const world = canvasApi.screenToWorld(event.clientX, event.clientY);
    symbolsApi.addInstance(typeId, world.x, world.y);
    tools.reset();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && tools.placingTypeId()) tools.reset();
  });
}
