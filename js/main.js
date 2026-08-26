// Startpunkt — kopplar ihop modulerna. Hålls medvetet tunn; själva logiken
// bor i respektive modul (grid.js, canvas.js, ...) enligt ROADMAP.md.

import { initCanvas } from "./canvas.js";
import { loadSymbolLibrary } from "./symbol-library.js";
import { initSymbols } from "./symbols.js";
import { initWires } from "./wires.js";
import { initJunctions } from "./junctions.js";
import { initLabels } from "./labels.js";
import { initInspector } from "./inspector.js";
import { initPersistence } from "./persistence.js";
import { initExport } from "./export.js";
import { initHistory } from "./history.js";
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
    "Markera: klicka eller dra ram · dubbelklicka en etikett för att döpa om · " +
    "R = rotera · M = spegelvänd · Ctrl+D = duplicera · Delete = radera · " +
    "Ctrl+Z = ångra · Mellanslag+dra = panorera",
  wire:
    "Ledning: klicka startpunkt, klicka slutpunkt · E = byt håll på knäet · " +
    "Escape = avbryt · ändpunkter fäster i anslutningar",
  dashed:
    "Streckad linje (mekanisk förbindelse, ingen ledare) · klicka start- och " +
    "slutpunkt · E = byt håll på knäet · Escape = avbryt",
  place: "Klicka på ritytan för att placera symbolen · Escape = avbryt",
};

try {
  const library = await loadSymbolLibrary();
  const symbolsApi = initSymbols(svg, library);
  const wiresApi = initWires(svg, canvasApi, symbolsApi, tools);
  initJunctions(svg, symbolsApi, wiresApi);
  initLabels(svg, document.getElementById("workspace"), symbolsApi, tools);

  // Ordningen spelar roll: paletten och ledningsverktyget registrerar sina
  // mousedown-lyssnare före markeringen, så att ett placerings- eller
  // ritklick aldrig också tolkas som markering.
  // Fil-API:t behöver markeringen, som i sin tur skapas efter paletten —
  // därför ett litet fördröjt objekt som paletten kan hålla i från start.
  const fileApi = {
    save: () => {}, openDialog: () => {},
    exportSvg: () => {}, exportPng: () => {},
    undo: () => {}, redo: () => {},
  };
  initPalette(paletteEl, svg, canvasApi, symbolsApi, library, tools, fileApi);

  // Ledningar först i listan = de ligger under symbolerna vid träfftest.
  const selectionApi = initSelection(svg, canvasApi, [wiresApi.selectionProvider, symbolsApi.selectionProvider], tools);

  // Egenskapspanelen speglar markeringen, så den måste komma efter den.
  initInspector(document.getElementById("inspector"), symbolsApi, selectionApi, tools, library);

  const setStatus = (text, isError) => {
    statusEl.textContent = text;
    statusEl.classList.toggle("error", Boolean(isError));
  };

  Object.assign(
    fileApi,
    initPersistence(paletteEl, symbolsApi, wiresApi, selectionApi, setStatus),
    // Exporten måste se ritytan utan markeringsramar; den städar bort dem
    // ur sin kopia, men en aktiv markering ska ändå inte hänga med.
    initExport(svg, setStatus),
    // Historiken sist: den lyssnar på ändringar och behöver markeringen för
    // att kunna nollställa den när ett läge återställs.
    initHistory(symbolsApi, wiresApi, selectionApi, setStatus)
  );

  function showStatus() {
    if (tools.isDashed()) statusEl.textContent = STATUS.dashed;
    else if (tools.isWire()) statusEl.textContent = STATUS.wire;
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
