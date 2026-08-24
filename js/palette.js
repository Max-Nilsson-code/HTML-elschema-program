// Symbolpalett: sidopanel som listar alla symboltyper. Klick "armar"
// placeringsläge (visuellt markerad knapp + korshårs-muspekare på
// ritytan); nästa klick på ritytan droppar instansen snäppt till grid.
// Escape avbryter. Se ROADMAP.md, Fas 3.

const SVG_NS = "http://www.w3.org/2000/svg";

export function initPalette(container, svg, canvasApi, symbolsApi, library) {
  let armedTypeId = null;
  const buttons = new Map();

  container.replaceChildren();

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
      if (armedTypeId === type.id) disarm();
      else arm(type.id);
    });

    list.appendChild(button);
    buttons.set(type.id, button);
  }

  function arm(typeId) {
    armedTypeId = typeId;
    for (const [id, btn] of buttons) btn.classList.toggle("armed", id === typeId);
    svg.classList.add("placing");
  }

  function disarm() {
    armedTypeId = null;
    for (const btn of buttons.values()) btn.classList.remove("armed");
    svg.classList.remove("placing");
  }

  // Registreras före selection.js i main.js — stopImmediatePropagation här
  // gör att selection.js aldrig ser klicket som ett markerings-/gummiband-
  // klick när en placering faktiskt genomförs.
  svg.addEventListener("mousedown", (event) => {
    if (!armedTypeId || event.button !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const world = canvasApi.screenToWorld(event.clientX, event.clientY);
    symbolsApi.addInstance(armedTypeId, world.x, world.y);
    disarm();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && armedTypeId) disarm();
  });

  return { isArmed: () => armedTypeId !== null };
}

function buildPreview(type) {
  const preview = document.createElementNS(SVG_NS, "svg");
  preview.setAttribute("viewBox", `0 0 ${type.width} ${type.height}`);
  preview.setAttribute("class", "palette-preview");
  preview.appendChild(document.importNode(type.geometryElement, true));
  return preview;
}
