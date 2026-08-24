// Sidopanel: verktygsval överst, därunder symbollistan. Klick på en symbol
// "armar" placeringsläge (visuellt markerad knapp + korshårs-muspekare på
// ritytan); nästa klick på ritytan droppar instansen snäppt till grid.
// Escape avbryter. Se ROADMAP.md, Fas 3 och Fas 4.

import { TOOL_SELECT, TOOL_WIRE, placeTool } from "./tools.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function initPalette(container, svg, canvasApi, symbolsApi, library, tools, fileApi) {
  const buttons = new Map();

  container.replaceChildren();

  // Fil-knappar överst: spara/öppna hör till projektet som helhet, inte till
  // något verktygsläge.
  const fileHeading = document.createElement("h2");
  fileHeading.textContent = "Projekt";
  const fileList = document.createElement("div");
  fileList.className = "tool-list file-list";
  for (const [label, handler] of [
    ["Spara", () => fileApi.save()],
    ["Öppna", () => fileApi.openDialog()],
    ["SVG", () => fileApi.exportSvg()],
    ["PNG", () => fileApi.exportPng()],
  ]) {
    const btn = document.createElement("button");
    btn.type = "button";
    // Egen klass, inte tool-item: de här byter inte verktygsläge och ska
    // aldrig kunna se "aktiva" ut.
    btn.className = "file-item";
    btn.textContent = label;
    btn.addEventListener("click", () => { handler(); btn.blur(); });
    fileList.appendChild(btn);
  }
  container.append(fileHeading, fileList);

  const toolHeading = document.createElement("h2");
  toolHeading.textContent = "Verktyg";
  container.appendChild(toolHeading);

  const toolList = document.createElement("div");
  toolList.className = "tool-list";
  container.appendChild(toolList);

  for (const [tool, label, hint] of [
    [TOOL_SELECT, "Markera", "Markera, flytta och radera"],
    [TOOL_WIRE, "Ledning", "Rita ledningar mellan anslutningar"],
  ]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-item";
    btn.textContent = label;
    btn.title = hint;
    btn.addEventListener("click", () => {
      tools.set(tool);
      btn.blur();
    });
    toolList.appendChild(btn);
    buttons.set(tool, btn);
  }

  const heading = document.createElement("h2");
  heading.textContent = "Symboler";
  container.appendChild(heading);

  const list = document.createElement("div");
  list.className = "palette-list";
  container.appendChild(list);

  for (const type of library.values()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "palette-item";
    button.title = type.name;

    button.appendChild(buildPreview(type));

    const label = document.createElement("span");
    label.textContent = type.name;
    button.appendChild(label);

    button.addEventListener("click", () => {
      tools.set(tools.placingTypeId() === type.id ? TOOL_SELECT : placeTool(type.id));
      // Släpp fokus: en fokuserad knapp återutlöses av mellanslag, vilket är
      // panoreringstangenten — annars skulle en panorering armera/avarmera
      // paletten bakom ryggen på användaren.
      button.blur();
    });

    list.appendChild(button);
    buttons.set(placeTool(type.id), button);
  }

  // En enda källa till sanning för vilken knapp som ser aktiv ut.
  function syncActiveButton() {
    const current = tools.get();
    for (const [key, btn] of buttons) btn.classList.toggle("armed", key === current);
  }
  tools.onChange(syncActiveButton);
  syncActiveButton();

  // Registreras före selection.js i main.js — stopImmediatePropagation här
  // gör att selection.js aldrig ser klicket som ett markerings-/gummiband-
  // klick när en placering faktiskt genomförs.
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

  return {};
}

function buildPreview(type) {
  const preview = document.createElementNS(SVG_NS, "svg");
  preview.setAttribute("viewBox", `0 0 ${type.width} ${type.height}`);
  preview.setAttribute("class", "palette-preview");
  preview.appendChild(document.importNode(type.geometryElement, true));

  // Den mekaniska förbindelsen ligger inte i .symbol-geometry utan ritas
  // från data-stem-*, så förhandsvisningen måste rita den själv — annars
  // visas tilläggen utan stam och stämmer inte med det som placeras.
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
