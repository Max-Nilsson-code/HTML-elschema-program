// Ångra och gör om. Se ROADMAP.md, Fas 8.
//
// Historiken bygger på ÖGONBLICKSBILDER, inte på en kommandologg: hela
// dokumentet serialiseras (samma format som Fas 6 sparar till fil) och
// läggs på en stack. Det är billigt eftersom ett schema är litet, och
// framför allt kan det inte glida isär från verkligheten — varje ny åtgärd
// som ändrar något fångas automatiskt, utan att varje anropsställe behöver
// komma ihåg att logga sin motsats.
//
// Ändringar under ett drag kommer en gång per musrörelse. De samlas därför
// ihop: först när det varit tyst en stund läggs ett läge på stacken, så ett
// helt drag eller en inskriven text blir ETT steg att ångra.

const SETTLE_MS = 250;
const LIMIT = 100;

export function initHistory(symbolsApi, wiresApi, selectionApi, onStatus) {
  const snapshot = () =>
    JSON.stringify({ symbols: symbolsApi.serialize(), wires: wiresApi.serialize() });

  let present = snapshot();
  const past = [];
  const future = [];
  let timer = null;
  // Sant medan ett läge återställs — då ska de ändringarna inte i sin tur
  // hamna i historiken.
  let applying = false;

  function commit() {
    timer = null;
    if (applying) return;
    const current = snapshot();
    if (current === present) return; // inget ändrades i praktiken

    past.push(present);
    if (past.length > LIMIT) past.shift();
    present = current;
    future.length = 0; // ny gren: allt framåt är inte längre giltigt
  }

  function schedule() {
    if (applying) return;
    clearTimeout(timer);
    timer = setTimeout(commit, SETTLE_MS);
  }

  /** Fångar ett väntande läge direkt, så inget går förlorat vid ångra. */
  function flush() {
    if (timer !== null) {
      clearTimeout(timer);
      commit();
    }
  }

  function apply(state) {
    applying = true;
    try {
      const data = JSON.parse(state);
      selectionApi.clearSelection();
      symbolsApi.loadState(data.symbols);
      wiresApi.loadState(data.wires);
    } finally {
      applying = false;
    }
    // Läs av på nytt i stället för att lita på strängen: inläsningen fyller i
    // utelämnade fält, och present måste spegla det som faktiskt finns.
    present = snapshot();
  }

  function undo() {
    flush();
    if (past.length === 0) return onStatus?.("Inget att ångra.");
    future.push(present);
    apply(past.pop());
    onStatus?.("Ångrade");
  }

  function redo() {
    flush();
    if (future.length === 0) return onStatus?.("Inget att göra om.");
    past.push(present);
    apply(future.pop());
    onStatus?.("Gjorde om");
  }

  symbolsApi.onChange(schedule);
  wiresApi.onChange(schedule);

  window.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey)) return;
    // Rör inte tangentbordet när användaren skriver i ett fält — där ska
    // webbläsarens egen ångra-funktion gälla.
    const tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return;

    const key = event.key.toLowerCase();
    if (key === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if (key === "y" || (key === "z" && event.shiftKey)) {
      event.preventDefault();
      redo();
    }
  });

  return {
    undo,
    redo,
    flush,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
