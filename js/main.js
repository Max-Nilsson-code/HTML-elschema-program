// Startpunkt — kopplar ihop modulerna. Hålls medvetet tunn; själva logiken
// bor i respektive modul (grid.js, canvas.js, ...) enligt ROADMAP.md.

import { initCanvas } from "./canvas.js";
import { loadSymbolLibrary } from "./symbol-library.js";
import { initSymbols } from "./symbols.js";
import { initWires } from "./wires.js";
import { initPalette } from "./palette.js";
import { initSelection } from "./selection.js";
import { initTools } from "./tools.js";

const svg = document.getElementById("canvas");
const paletteEl = document.getElementById("palette");
const statusEl = document.getElementById("status");

const canvasApi = initCanvas(svg);
const tools = initTools(svg);

const STATUS = {
  select:
    "Markera: klicka eller dra ram · R = rotera · Ctrl+D = duplicera · " +
    "Delete = radera · Mellanslag+dra = panorera",
  wire:
    "Ledning: klicka startpunkt, klicka slutpunkt · E = byt håll på knäet · " +
    "Escape = avbryt · ändpunkter fäster i anslutningar",
  place: "Klicka på ritytan för att placera symbolen · Escape = avbryt",
};

try {
  const library = await loadSymbolLibrary();
  const symbolsApi = initSymbols(svg, library);
  const wiresApi = initWires(svg, canvasApi, symbolsApi, tools);

  // Ordningen spelar roll: paletten och ledningsverktyget registrerar sina
  // mousedown-lyssnare före markeringen, så att ett placerings- eller
  // ritklick aldrig också tolkas som markering.
  initPalette(paletteEl, svg, canvasApi, symbolsApi, library, tools);

  // Ledningar först i listan = de ligger under symbolerna vid träfftest.
  initSelection(svg, canvasApi, [wiresApi.selectionProvider, symbolsApi.selectionProvider], tools);

  function showStatus() {
    if (tools.isWire()) statusEl.textContent = STATUS.wire;
    else if (tools.placingTypeId()) statusEl.textContent = STATUS.place;
    else statusEl.textContent = STATUS.select;
  }
  tools.onChange(showStatus);
  showStatus();
} catch (error) {
  console.error(error);
  statusEl.textContent = `Fel vid start: ${error.message}`;
  statusEl.classList.add("error");
}
