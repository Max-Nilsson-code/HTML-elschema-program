// Redigering av etiketter: beteckning (t.ex. "K1") och pinnamn (t.ex. "13").
// Se ROADMAP.md, Fas 5.
//
// Placeringen är fast per symboltyp — användaren ändrar bara texten, inte
// var den sitter. Redigeringen sker med ett vanligt HTML-<input> som läggs
// ovanpå etiketten: SVG har ingen egen textinmatning, och ett <input> ger
// markering, urklipp och tangentbordsnavigering gratis.

export function initLabels(svg, workspace, symbolsApi, tools) {
  let editor = null;

  /** Etikettelementet under punkten, om det är en redigerbar sådan. */
  function labelAt(target) {
    if (!(target instanceof Element)) return null;
    const kind = target.dataset?.labelKind;
    return kind === "designation" || kind === "pin" ? target : null;
  }

  function beginEdit(labelEl) {
    commit(); // en pågående redigering avslutas först

    const { instanceId, labelKind, pinId } = labelEl.dataset;
    const box = labelEl.getBoundingClientRect();
    const frame = workspace.getBoundingClientRect();

    const input = document.createElement("input");
    input.className = "label-editor";
    input.value = labelEl.textContent;
    input.spellcheck = false;
    // Tomma etiketter har ingen bredd att utgå från — håll en minsta yta så
    // fältet går att träffa och se.
    const width = Math.max(box.width + 18, 44);
    input.style.left = `${box.left - frame.left + box.width / 2 - width / 2}px`;
    input.style.top = `${box.top - frame.top - 3}px`;
    input.style.width = `${width}px`;

    workspace.appendChild(input);
    input.focus();
    input.select();

    editor = { input, instanceId, labelKind, pinId, cancelled: false };

    input.addEventListener("keydown", (event) => {
      event.stopPropagation(); // annars fångar genvägarna R/Delete tecknen
      if (event.key === "Enter") {
        event.preventDefault();
        commit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        editor.cancelled = true;
        commit();
      }
    });
    input.addEventListener("blur", () => commit());
  }

  /** Skriver in värdet och stänger fältet. */
  function commit() {
    if (!editor) return;
    const { input, instanceId, labelKind, pinId, cancelled } = editor;
    editor = null; // nollställ först, så blur inte kommer tillbaka hit

    if (!cancelled) {
      const text = input.value.trim();
      if (labelKind === "designation") symbolsApi.setDesignation(instanceId, text);
      else symbolsApi.setPinLabel(instanceId, pinId, text);
    }
    input.remove();
  }

  svg.addEventListener("dblclick", (event) => {
    if (!tools.isSelect()) return;
    const labelEl = labelAt(event.target);
    if (!labelEl) return;
    event.preventDefault();
    beginEdit(labelEl);
  });

  // Byter man verktyg mitt i en redigering ska den avslutas, inte ligga kvar
  // och sväva över ritytan.
  tools.onChange(() => commit());

  return { commit, isEditing: () => editor !== null };
}
