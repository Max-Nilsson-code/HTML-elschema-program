// Export av ritningen till SVG (primärt) och PNG (biprodukt).
// Se ROADMAP.md, Fas 7.
//
// Eftersom appen redan ritar i SVG är exporten i grunden en serialisering av
// det som syns. Två saker skiljer den från en rå kopia:
//
//  1. UI-element städas bort — rutnät, markeringsramar, draghandtag och
//     ledningsförhandsvisning hör till redigeringen, inte till schemat.
//  2. Stilarna bäddas in. Appens CSS ligger i en extern fil, och en
//     exporterad SVG måste stå för sig själv i vilket program som helst.

const SVG_NS = "http://www.w3.org/2000/svg";

// Element som bara finns för redigeringens skull.
const STRIP = [
  "defs",
  "#grid-background",
  "#selection-layer",
  "#junction-preview",
  "#wire-preview",
  ".rubber-band",
  ".stem-handle",
  ".wire-handle",
  ".pin-marker",
  ".wire-hit",
];

// Stilar som annars bara finns i style.css. Måste följa med i filen för att
// ritningen ska se likadan ut någon annanstans.
const EXPORT_CSS = `
.symbol-geometry { fill: none; stroke: #18181b; stroke-width: 1.5;
  stroke-linecap: round; stroke-linejoin: round; }
.stem { stroke: #18181b; stroke-width: 1.5; stroke-linecap: round; fill: none; }
.stem-dashed { stroke-dasharray: 3 3; }
.wire { fill: none; stroke: #18181b; stroke-width: 1.5;
  stroke-linecap: round; stroke-linejoin: round; }
.wire-dashed { stroke-dasharray: 5 4; }
.junction-dot { fill: #18181b; }
.designation-label, .pin-label { font-family: system-ui, -apple-system,
  "Segoe UI", Arial, sans-serif; fill: #18181b; }
.designation-label { font-size: 13px; font-weight: 600; }
.pin-label { font-size: 11px; }
`;

const MARGIN = 20;

export function initExport(svg, onStatus) {
  /**
   * Bygger en fristående SVG av ritningens innehåll, beskuren till det som
   * faktiskt ritats. Returnerar null om ritytan är tom.
   */
  function buildSvg() {
    const clone = svg.cloneNode(true);
    for (const selector of STRIP) {
      clone.querySelectorAll(selector).forEach((el) => el.remove());
    }
    clone.removeAttribute("class");
    clone.removeAttribute("style");

    const style = document.createElementNS(SVG_NS, "style");
    style.textContent = EXPORT_CSS;
    clone.insertBefore(style, clone.firstChild);

    // Måtten måste läsas av en renderad kopia — getBBox() ger inget vettigt
    // på ett element som inte sitter i dokumentet. Den placeras utanför bild
    // i stället för att döljas, eftersom display:none ger nollstorlek.
    clone.setAttribute("style", "position:absolute; left:-99999px; top:0;");
    document.body.appendChild(clone);
    let box;
    try {
      box = clone.getBBox();
    } finally {
      clone.remove();
    }
    clone.removeAttribute("style");

    if (box.width === 0 || box.height === 0) return null;

    const x = Math.floor(box.x - MARGIN);
    const y = Math.floor(box.y - MARGIN);
    const width = Math.ceil(box.width + MARGIN * 2);
    const height = Math.ceil(box.height + MARGIN * 2);

    clone.setAttribute("xmlns", SVG_NS);
    clone.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
    clone.setAttribute("width", width);
    clone.setAttribute("height", height);

    // Vit botten: utan den blir bakgrunden genomskinlig, vilket ger svarta
    // linjer på svart i visare med mörkt tema.
    const background = document.createElementNS(SVG_NS, "rect");
    background.setAttribute("x", x);
    background.setAttribute("y", y);
    background.setAttribute("width", width);
    background.setAttribute("height", height);
    background.setAttribute("fill", "#ffffff");
    clone.insertBefore(background, clone.firstChild.nextSibling);

    return { markup: new XMLSerializer().serializeToString(clone), width, height };
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportSvg() {
    const result = buildSvg();
    if (!result) return onStatus?.("Ritytan är tom — inget att exportera.", true);
    download(new Blob([result.markup], { type: "image/svg+xml" }), "elschema.svg");
    onStatus?.("Exporterade elschema.svg");
  }

  /** PNG renderas ur samma SVG, i dubbel upplösning för skärpa. */
  function exportPng(scale = 2) {
    const result = buildSvg();
    if (!result) return onStatus?.("Ritytan är tom — inget att exportera.", true);

    const image = new Image();
    const url = URL.createObjectURL(new Blob([result.markup], { type: "image/svg+xml" }));

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = result.width * scale;
      canvas.height = result.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        download(blob, "elschema.png");
        onStatus?.("Exporterade elschema.png");
      }, "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      onStatus?.("Kunde inte rendera PNG.", true);
    };
    image.src = url;
  }

  return { exportSvg, exportPng, buildSvg };
}
