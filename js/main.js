// Startpunkt — kopplar ihop modulerna. Hålls medvetet tunn; själva logiken
// bor i respektive modul (grid.js, canvas.js, ...) enligt ROADMAP.md.

import { initCanvas } from "./canvas.js";

const svg = document.getElementById("canvas");
initCanvas(svg);
