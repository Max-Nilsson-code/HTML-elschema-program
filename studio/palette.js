// Studio-palett: verktyg med ikoner överst, därunder symbolerna i
// kategorier. Samma placeringslogik som originalets palette.js.
import { TOOL_SELECT, TOOL_WIRE, TOOL_DASHED, TOOL_TEXT, placeTool } from "../js/tools.js";
import { iconElement } from "./icons.js";
import { buildPreview, initPlacement } from "../js/palette-shared.js";


const CATEGORIES = [
  { name: "Kontakter", ids: ["kontakt-no", "kontakt-nc", "vaxlande-kontakt", "tillslagsfordrojd-kontakt-no", "tillslagsfordrojd-kontakt-nc"] },
  { name: "Manöverdon · tillägg", ids: ["aterfjadrande-knapp", "tryckknapp-bistabil", "motorskyddskontakt", "granslagesbrytare"] },
  { name: "Apparater", ids: ["sakring", "spole", "lampa", "summer", "photocell"] },
  { name: "Huvudkrets", ids: ["sakring-trefas", "mekanisk-brytare", "trefas-kontakt", "kontaktor", "kontaktor-motorskydd", "motor", "motor-nedre"] },
];

const TOOLS = [
  [TOOL_SELECT, "Markera", "markera", "Markera, flytta och radera"],
  [TOOL_WIRE, "Ledning", "ledning", "Rita ledningar mellan anslutningar"],
  [TOOL_DASHED, "Streckad", "streckad", "Streckad linje — mekanisk förbindelse, ingen ledare"],
  [TOOL_TEXT, "Text", "text", "Placera en fristående textetikett"],
];

export function initPalette(container, svg, canvasApi, symbolsApi, library, tools) {
  const buttons = new Map();
  container.replaceChildren();

  const toolHeading = document.createElement("h2");
  toolHeading.textContent = "Verktyg";
  container.appendChild(toolHeading);

  const toolList = document.createElement("div");
  toolList.className = "tool-list";
  container.appendChild(toolList);

  for (const [tool, label, icon, hint] of TOOLS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-item";
    btn.title = hint;
    const iconHolder = document.createElement("span");
    iconHolder.className = "icon";
    iconHolder.appendChild(iconElement(icon));
    const span = document.createElement("span");
    span.textContent = label;
    btn.append(iconHolder, span);
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

  for (const category of CATEGORIES) {
    const cat = document.createElement("h3");
    cat.className = "palette-cat";
    cat.textContent = category.name;
    container.appendChild(cat);

    const list = document.createElement("div");
    list.className = "palette-list";
    container.appendChild(list);

    for (const id of category.ids) {
      const type = library.get(id);
      if (!type) continue;
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
        button.blur();
      });
      list.appendChild(button);
      buttons.set(placeTool(type.id), button);
    }
  }

  function syncActiveButton() {
    const current = tools.get();
    for (const [key, btn] of buttons) btn.classList.toggle("armed", key === current);
  }
  tools.onChange(syncActiveButton);
  syncActiveButton();

  initPlacement(svg, canvasApi, symbolsApi, tools);

  return {};
}
