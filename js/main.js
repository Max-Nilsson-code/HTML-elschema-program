// Startpunkt — kopplar ihop modulerna. Hålls medvetet tunn; själva logiken
// bor i respektive modul (grid.js, canvas.js, ...) enligt ROADMAP.md.

import { initCanvas } from "./canvas.js";
import { loadSymbolLibrary } from "./symbol-library.js";
import { initSymbols } from "./symbols.js";
import { initPalette } from "./palette.js";
import { initSelection } from "./selection.js";

const svg = document.getElementById("canvas");
const paletteEl = document.getElementById("palette");
const statusEl = document.getElementById("status");

const canvasApi = initCanvas(svg);

try {
  const library = await loadSymbolLibrary();
  const symbolsApi = initSymbols(svg, library);

  // Paletten registrerar sin mousedown-lyssnare före markeringen, så att en
  // placerings-klick inte också tolkas som markering (se palette.js).
  initPalette(paletteEl, svg, canvasApi, symbolsApi, library);
  initSelection(svg, canvasApi, symbolsApi);

  statusEl.textContent =
    "Klicka på en symbol i listan, klicka sedan på ritytan. " +
    "R = rotera · Ctrl+D = duplicera · Delete = radera · Mellanslag+dra = panorera";
} catch (error) {
  console.error(error);
  statusEl.textContent = `Fel vid start: ${error.message}`;
  statusEl.classList.add("error");
}
