// Elschema Studio — startpunkt. Återanvänder originalets moduler (js/) och
// kopplar dem till det nya gränssnittet: topprad, kategoripalett,
// arkinställningar, zoomkontroller, kortkommandofönster och ljus/mörk rityta.
import { initCanvas } from "../js/canvas.js";
import { initSheet } from "./sheet.js";
import { initPalette } from "./palette.js";
import { initExport } from "../js/export.js";
import { loadSymbolLibrary } from "../js/symbol-library.js";
import { initSymbols } from "../js/symbols.js";
import { initWires } from "../js/wires.js";
import { initJunctions } from "../js/junctions.js";
import { initTexts } from "../js/texts.js";
import { initLabels } from "../js/labels.js";
import { initInspector } from "../js/inspector.js";
import { initPersistence } from "../js/persistence.js";
import { initHistory } from "../js/history.js";
import { initSelection } from "../js/selection.js";
import { initTools } from "../js/tools.js";
import { setGridSize } from "../js/grid.js";
import { hydrateIcons } from "./icons.js";

// Studio ritar tätare än originalet: mindre rutnät, och symbolerna följer
// rutnätet så att en symbol alltid är 4 rutor bred — samma proportion som
// originalets 80 units på 20-rutnät. Då hamnar tillägg och stammar exakt
// som förut, bara i mindre skala.
const GRID = 10;
const SYMBOL_SCALE = GRID / 20;
// Linjetjocklek på ritytan (world units) — ett snäpp tunnare än originalets 1,5.
const LINE = 1.25;
// Symbolgeometrin ligger i en skalad grupp, så dess stroke måste räknas upp
// för att bli lika tjock som ledningarna på ritytan.
const SYMBOL_STROKE = LINE / SYMBOL_SCALE;
// Kopplingsprickens radie följer linjetjockleken, inte rutnätet: originalet
// har 3,5 mot linje 1,5, alltså knappt 2,4 gånger.
const JUNCTION_R = Math.round(LINE * 2.4 * 10) / 10;

// Studio ritar i halv skala med egna linjetjocklekar. Exporten bäddar in
// originalets CSS och lägger de här reglerna sist, så de vinner — och
// siffrorna kommer från samma konstanter som ritytan använder i stället för
// att skrivas av för hand.
const EXPORT_OVERRIDES = {
  // Pappersarket är en referensram på skärmen, inte ritningsinnehåll.
  extraStrip: ["#sheet-layer"],
  extraCss: `
.symbol-geometry, .stem { stroke-width: ${SYMBOL_STROKE}; }
.wire { stroke-width: ${LINE}; }
.junction-dot { r: ${JUNCTION_R}; }
`,
};

const STATUS = {
  select:
    "Markera: klicka eller dra ram · dubbelklicka en etikett för att döpa om · " +
    "R = rotera · M = spegelvänd · Ctrl+D = duplicera · Delete = radera · ? = kortkommandon",
  wire: "Ledning: klicka startpunkt, klicka slutpunkt · E = byt håll på knäet · Escape = avbryt",
  dashed: "Streckad linje (mekanisk förbindelse) · klicka start- och slutpunkt · E = byt håll · Escape = avbryt",
  place: "Klicka på ritytan för att placera symbolen · Escape = avbryt",
  text: "Klicka på ritytan för att placera en textetikett · dubbelklicka för att ändra texten",
};

const $ = (id) => document.getElementById(id);

async function boot() {
  const svg = $("canvas");
  const statusEl = $("status");
  const paletteEl = $("palette");

  hydrateIcons();
  setGridSize(GRID);
  // Symbolerna ritas i skalad grupp — kompensera linjetjockleken så symboler,
  // stammar och ledningar alla blir lika tjocka på ritytan.
  svg.style.setProperty("--line", String(LINE));
  svg.style.setProperty("--symbol-stroke", String(SYMBOL_STROKE));
  svg.style.setProperty("--junction-r", String(JUNCTION_R));
  const canvasApi = initCanvas(svg);
  const tools = initTools(svg);
  const sheet = initSheet(svg);
  const library = await loadSymbolLibrary();
  const symbolsApi = initSymbols(svg, library, SYMBOL_SCALE);
  const wiresApi = initWires(svg, canvasApi, symbolsApi, tools);
  initJunctions(svg, symbolsApi, wiresApi);
  const textsApi = initTexts(svg, canvasApi, tools);
  initLabels(svg, $("workspace"), symbolsApi, textsApi, tools);
  initPalette(paletteEl, svg, canvasApi, symbolsApi, library, tools);
  const selectionApi = initSelection(
    svg,
    canvasApi,
    [wiresApi.selectionProvider, symbolsApi.selectionProvider, textsApi.selectionProvider],
    tools
  );
  textsApi.onPlaced((item) => selectionApi.setSelection([item.id]));
  initInspector($("inspector"), symbolsApi, textsApi, selectionApi, tools, library);

  const setStatus = (text, isError) => {
    statusEl.textContent = text;
    statusEl.classList.toggle("error", Boolean(isError));
  };

  const fileApi = Object.assign(
    {},
    initPersistence(paletteEl, symbolsApi, wiresApi, textsApi, selectionApi, setStatus),
    initExport(svg, setStatus, EXPORT_OVERRIDES),
    initHistory(symbolsApi, wiresApi, textsApi, selectionApi, setStatus)
  );

  // --- Topprad ---
  $("btn-new").addEventListener("click", () => {
    selectionApi.clearSelection();
    symbolsApi.loadState([]);
    wiresApi.loadState([]);
    textsApi.loadState([]);
    setStatus("Ny ritning.");
  });
  $("btn-open").addEventListener("click", () => fileApi.openDialog());
  $("btn-save").addEventListener("click", () => fileApi.save());
  $("btn-svg").addEventListener("click", () => fileApi.exportSvg());
  $("btn-png").addEventListener("click", () => fileApi.exportPng());
  $("btn-undo").addEventListener("click", () => fileApi.undo());
  $("btn-redo").addEventListener("click", () => fileApi.redo());

  // --- Zoom ---
  const zoomLabel = $("zoom-label");
  const syncZoom = () => { zoomLabel.textContent = `${Math.round(canvasApi.currentZoom() * 100)} %`; };
  canvasApi.onView(syncZoom);
  syncZoom();
  $("zoom-in").addEventListener("click", () => canvasApi.zoomBy(1.2));
  $("zoom-out").addEventListener("click", () => canvasApi.zoomBy(1 / 1.2));
  $("zoom-fit").addEventListener("click", fitView);

  function fitView() {
    if (sheet.get().visible) canvasApi.fitWorldRect(sheet.worldRect());
  }

  // --- Ark och rityta ---
  const sheetSelect = $("sheet-size");
  sheetSelect.addEventListener("change", () => applySheet(sheetSelect.value, true));

  function applySheet(value, fit) {
    if (sheetSelect.value !== value) sheetSelect.value = value;
    if (value === "inget") {
      sheet.set({ visible: false });
      svg.classList.add("no-sheet");
    } else {
      const [size, orientation] = value.split("-");
      sheet.set({ visible: true, size, orientation: orientation === "staende" ? "stående" : "liggande" });
      svg.classList.remove("no-sheet");
      if (fit) fitView();
    }
  }

  const themeButtons = [$("theme-light"), $("theme-dark")];
  function applyTheme(mode) {
    svg.classList.toggle("canvas-dark", mode === "mörk");
    themeButtons[0].classList.toggle("armed", mode !== "mörk");
    themeButtons[1].classList.toggle("armed", mode === "mörk");
  }
  themeButtons[0].addEventListener("click", () => applyTheme("ljus"));
  themeButtons[1].addEventListener("click", () => applyTheme("mörk"));

  // --- Kortkommandon ---
  const backdrop = $("shortcuts-backdrop");
  const toggleShortcuts = (show) => { backdrop.hidden = !show; };
  $("btn-shortcuts").addEventListener("click", () => toggleShortcuts(backdrop.hidden));
  $("shortcuts-close").addEventListener("click", () => toggleShortcuts(false));
  backdrop.addEventListener("mousedown", (event) => {
    if (event.target === backdrop) toggleShortcuts(false);
  });
  window.addEventListener("keydown", (event) => {
    const tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return;
    if (event.key === "?") toggleShortcuts(backdrop.hidden);
    else if (event.key === "Escape" && !backdrop.hidden) toggleShortcuts(false);
  });

  // --- Statusrad ---
  function showStatus() {
    if (tools.isText()) setStatus(STATUS.text);
    else if (tools.isDashed()) setStatus(STATUS.dashed);
    else if (tools.isWire()) setStatus(STATUS.wire);
    else if (tools.placingTypeId()) setStatus(STATUS.place);
    else setStatus(STATUS.select);
  }
  tools.onChange(showStatus);
  showStatus();

  // --- Inställningar från värdens Tweaks-panel ---
  function applySettings(s) {
    if (!s) return;
    applyTheme(s.theme === "mörk" ? "mörk" : "ljus");
    applySheet(s.sheet ?? "a4-liggande", false);
  }
  applySettings(window.__studioSettings);
  window.__studioApplySettings = applySettings;

  fitView();
}

boot().catch((error) => {
  console.error(error);
  const statusEl = $("status");
  if (statusEl) {
    statusEl.textContent = `Fel vid start: ${error.message}`;
    statusEl.classList.add("error");
  }
});
