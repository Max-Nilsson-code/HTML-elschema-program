// Egenskapspanel: när en symbol är markerad listas alla dess texter som
// fält, så man kan sätta beteckning och samtliga anslutningsnamn på ett
// ställe i stället för att dubbelklicka på varje etikett för sig.
//
// Panelen är ett komplement till redigering på plats (labels.js) — båda
// skriver till samma ställen i symbols.js, så de kan inte glida isär.

export function initInspector(container, symbolsApi, textsApi, selectionApi, tools, library) {
  // Panelen tar alltid sin plats i layouten, även när inget är markerat.
  // Att fälla ut den vid markering skulle krympa ritytan och flytta hela
  // ritningen i sidled just när man klickat på något — förvirrande, och
  // dessutom hamnar andra klicket i ett dubbelklick fel.
  container.hidden = false;

  // Fälten skrivs igenom vid varje ändring; håll koll på vilken instans som
  // visas, så vi slipper bygga om panelen medan användaren skriver i den.
  let shownId = null;

  function render(selectedIds) {
    // Fri text har egna fält (innehåll + storlek) och hanteras för sig.
    const textIds = selectedIds.filter((id) => textsApi.getText(id));
    if (selectedIds.length === 1 && textIds.length === 1) {
      shownId = null;
      if (container.contains(document.activeElement)) return;
      buildText(textsApi.getText(textIds[0]));
      return;
    }

    const symbolIds = selectedIds.filter((id) => symbolsApi.getInstance(id));

    if (symbolIds.length !== 1) {
      shownId = null;
      if (selectedIds.length === 0) showSimple("Inget markerat. Klicka på en symbol.");
      else if (selectedIds.length === 1) showSimple("Ledning markerad — ledningar har ingen text.");
      else showSimple(`${selectedIds.length} objekt markerade.`);
      return;
    }

    const instance = symbolsApi.getInstance(symbolIds[0]);
    if (shownId === instance.id && container.contains(document.activeElement)) return;
    shownId = instance.id;
    build(instance);
  }

  function showSimple(text) {
    container.replaceChildren(el("h2", {}, "Egenskaper"), el("p", { class: "inspector-note" }, text));
  }

  function buildText(item) {
    container.replaceChildren(
      el("h2", {}, "Egenskaper"),
      el("p", { class: "inspector-type" }, "Textetikett"),
      field("Text", item.text, (value) => textsApi.setText(item.id, value)),
      field("Storlek", String(item.size), (value) => textsApi.setSize(item.id, value))
    );
  }

  function build(instance) {
    const type = library.get(instance.typeId);
    container.replaceChildren();
    container.append(
      el("h2", {}, "Egenskaper"),
      el("p", { class: "inspector-type" }, type.name)
    );

    if (type.hasDesignation) {
      container.append(
        field("Beteckning", instance.designation, (value) => {
          symbolsApi.setDesignation(instance.id, value);
        }, "inspector-designation")
      );
    } else {
      // Tillägg har ingen egen beteckning — visa vilken kontakt den styr, så
      // det syns var beteckningen faktiskt bor.
      const host = symbolsApi.findHostContact(instance);
      container.append(
        el(
          "p",
          { class: "inspector-note" },
          host
            ? `Manöverdon på ${host.designation}. Beteckningen hör till kontakten.`
            : "Manöverdon. Placera det på en kontakt — kontakten bär beteckningen."
        )
      );
    }

    if (type.pins.length > 0) {
      container.append(el("h3", {}, "Anslutningar"));
      for (const pin of type.pins) {
        container.append(
          field(pin.id, instance.pinLabels[pin.id], (value) => {
            symbolsApi.setPinLabel(instance.id, pin.id, value);
          })
        );
      }
    }
  }

  /** Ett etikettat textfält som skriver igenom medan man skriver. */
  function field(labelText, value, commit, extraClass = "") {
    const input = el("input", { type: "text", value: value ?? "", spellcheck: "false" });
    if (extraClass) input.classList.add(extraClass);

    input.addEventListener("input", () => commit(input.value));
    // Genvägarna (R, Delete, Ctrl+D) får inte kapa tecknen man skriver.
    input.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter" || event.key === "Escape") input.blur();
    });

    return el("label", { class: "inspector-field" }, el("span", {}, labelText), input);
  }

  selectionApi.onChange(render);
  // Byter man verktyg försvinner markeringen; panelen ska följa med.
  tools.onChange(() => render(selectionApi.getSelectedIds()));
  render(selectionApi.getSelectedIds());

  return { render };
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "value") node.value = v;
    else node.setAttribute(k, v);
  }
  node.append(...children.filter(Boolean));
  return node;
}
