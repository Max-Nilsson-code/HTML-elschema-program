// Sidopanel: verktygsval överst, därunder symbollistan. Klick på en symbol
// "armar" placeringsläge (visuellt markerad knapp + korshårs-muspekare på
// ritytan); nästa klick på ritytan droppar instansen snäppt till grid.
// Escape avbryter. Se ROADMAP.md, Fas 3 och Fas 4.

import { TOOL_SELECT, TOOL_WIRE, TOOL_DASHED, TOOL_TEXT, placeTool } from "./tools.js";
import { buildPreview, initPlacement } from "./palette-shared.js";

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

  // Ångra/gör om på egen rad — de hör till redigeringen, inte till filerna,
  // men platsen överst gör dem lätta att hitta.
  const historyList = document.createElement("div");
  historyList.className = "tool-list file-list";
  for (const [label, handler, title] of [
    ["Ångra", () => fileApi.undo(), "Ångra senaste ändringen (Ctrl+Z)"],
    ["Gör om", () => fileApi.redo(), "Gör om (Ctrl+Y)"],
  ]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "file-item";
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener("click", () => { handler(); btn.blur(); });
    historyList.appendChild(btn);
  }
  container.append(historyList);

  const toolHeading = document.createElement("h2");
  toolHeading.textContent = "Verktyg";
  container.appendChild(toolHeading);

  const toolList = document.createElement("div");
  toolList.className = "tool-list";
  container.appendChild(toolList);

  for (const [tool, label, hint] of [
    [TOOL_SELECT, "Markera", "Markera, flytta och radera"],
    [TOOL_WIRE, "Ledning", "Rita ledningar mellan anslutningar"],
    [TOOL_DASHED, "Streckad", "Rita streckad linje — mekanisk förbindelse, ingen ledare"],
    [TOOL_TEXT, "Text", "Placera en fristående textetikett"],
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

  initPlacement(svg, canvasApi, symbolsApi, tools);

  return {};
}
