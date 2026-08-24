// Symbolbibliotek: laddar in de fristående SVG-filerna i assets/symbols/ och
// tolkar deras data-attribut till strukturerad symboltyp-data (geometri,
// pinnar, etikett-ankare). SVG-filen är källan till sanning för både
// utseende och anslutningspunkter — se ROADMAP.md, Fas 2.

const ASSET_PATH = "assets/symbols/";

// Manifest över symboltyperna, i samma ordning som numreringen 1–10 i
// "symboler och vägledning/Symboler-vägledning.svg".
//
// 6–8 är "tillägg på kontakt": de saknar egna anslutningspunkter och
// beteckning, och placeras ovanpå en kontaktsymbol.
const SYMBOL_IDS = [
  "kontakt-no",
  "kontakt-nc",
  "tillslagsfordrojd-kontakt-no",
  "tillslagsfordrojd-kontakt-nc",
  "sakring",
  "aterfjadrande-knapp",
  "tryckknapp-bistabil",
  "motorskyddskontakt",
  "lampa",
  "spole",
];

let libraryPromise = null;

/**
 * Laddar (en gång, cachas) samtliga symboltyper. Returnerar en Map från
 * symbol-id till typdata.
 */
export function loadSymbolLibrary() {
  if (!libraryPromise) {
    libraryPromise = Promise.all(SYMBOL_IDS.map(loadSymbolType)).then(
      (types) => new Map(types.map((type) => [type.id, type]))
    );
  }
  return libraryPromise;
}

async function loadSymbolType(id) {
  const url = `${ASSET_PATH}${id}.svg`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Kunde inte ladda symbol "${id}": HTTP ${response.status} (${url})`);
  }

  const text = await response.text();
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svgEl = doc.documentElement;

  if (svgEl.querySelector("parsererror")) {
    throw new Error(`Ogiltig SVG för symbol "${id}" (${url})`);
  }

  const geometryEl = svgEl.querySelector(".symbol-geometry");
  if (!geometryEl) {
    throw new Error(`Symbol "${id}" saknar en .symbol-geometry-grupp (${url})`);
  }

  const pins = Array.from(svgEl.querySelectorAll(".pin")).map((pinEl) => ({
    id: pinEl.dataset.pinId,
    defaultLabel: pinEl.dataset.defaultLabel ?? pinEl.dataset.pinId,
    x: parseFloat(pinEl.getAttribute("cx")),
    y: parseFloat(pinEl.getAttribute("cy")),
    labelDx: parseFloat(pinEl.dataset.labelDx || "0"),
    labelDy: parseFloat(pinEl.dataset.labelDy || "0"),
  }));

  // Tilläggssymboler (t.ex. tryckknapp, motorskyddskontakt) saknar avsiktligt
  // både pinnar och beteckning — de ritas ovanpå en kontaktsymbol, som i sin
  // tur bär anslutningarna. Därför är tom pin-lista giltigt.
  const hasDesignation = svgEl.dataset.designationX !== undefined;

  // Mekanisk förbindelse (stam) på tilläggssymboler. Ritas inte i SVG-filen
  // utan av symbols.js, eftersom längden justeras per instans — hur långt
  // stammen behöver nå beror på vilken kontakt tillägget sitter på (en NO-
  // kontakts blad ligger lägre än en NC-kontakts raka bygel).
  const stem =
    svgEl.dataset.stemX === undefined
      ? null
      : {
          x: parseFloat(svgEl.dataset.stemX),
          attachY: parseFloat(svgEl.dataset.stemAttachY),
          defaultY: parseFloat(svgEl.dataset.stemDefaultY),
          dashed: svgEl.dataset.stemDashed === "true",
        };

  return {
    id: svgEl.dataset.symbolId || id,
    name: svgEl.dataset.symbolName || id,
    designationPrefix: svgEl.dataset.designationPrefix || "X",
    width: parseFloat(svgEl.dataset.width),
    height: parseFloat(svgEl.dataset.height),
    hasDesignation,
    designationX: hasDesignation ? parseFloat(svgEl.dataset.designationX) : 0,
    designationY: hasDesignation ? parseFloat(svgEl.dataset.designationY) : 0,
    pins,
    stem,
    // Behåll den faktiska DOM-noden (inte en sträng) så den kan importeras
    // rent med document.importNode() vid rendering — se symbols.js.
    geometryElement: geometryEl,
  };
}

export function getSymbolType(library, typeId) {
  const type = library.get(typeId);
  if (!type) {
    throw new Error(`Okänd symboltyp: "${typeId}"`);
  }
  return type;
}
