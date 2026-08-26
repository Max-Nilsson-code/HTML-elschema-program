// Spara och öppna projekt som JSON-fil. Se ROADMAP.md, Fas 6.
//
// Formatet är avsiktligt rått och läsbart: samma fält som datamodellen
// använder internt, utan mellanlager. Filen laddas ner via en blob-länk och
// läses tillbaka med en vanlig <input type="file"> — det fungerar i alla
// webbläsare, och användaren äger sina filer.

const FORMAT = "elschema";
const VERSION = 1;

export function initPersistence(container, symbolsApi, wiresApi, textsApi, selectionApi, onStatus) {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.hidden = true;
  container.appendChild(fileInput);

  function serialize() {
    return {
      format: FORMAT,
      version: VERSION,
      symbols: symbolsApi.serialize(),
      wires: wiresApi.serialize(),
      texts: textsApi.serialize(),
    };
  }

  function save() {
    const json = JSON.stringify(serialize(), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "elschema.json";
    link.click();
    // Släpp objektet igen — annars ligger hela filen kvar i minnet.
    URL.revokeObjectURL(url);
    onStatus?.("Schemat sparat som elschema.json");
  }

  /**
   * Läser in ett projekt. Kastar med ett begripligt meddelande om filen inte
   * är ett schema — en trasig fil ska inte lämna ritytan halvinläst, så
   * innehållet valideras innan något rörs.
   */
  function load(data) {
    if (!data || typeof data !== "object") throw new Error("Filen innehåller inget schema.");
    if (data.format !== FORMAT) throw new Error("Det här är inte en elschema-fil.");
    if (!Array.isArray(data.symbols) || !Array.isArray(data.wires)) {
      throw new Error("Filen saknar symboler eller ledningar.");
    }
    if (data.version > VERSION) {
      throw new Error(`Filen är sparad i ett nyare format (version ${data.version}).`);
    }

    selectionApi.clearSelection();
    // Symbolerna först: ledningarnas bindningar pekar på dem.
    symbolsApi.loadState(data.symbols);
    wiresApi.loadState(data.wires);
    // texts saknas i filer sparade före textetiketterna fanns — tom lista då.
    textsApi.loadState(data.texts ?? []);
  }

  async function openFile(file) {
    try {
      const data = JSON.parse(await file.text());
      load(data);
      onStatus?.(`Öppnade ${file.name}`);
    } catch (error) {
      const message =
        error instanceof SyntaxError ? "Filen är inte giltig JSON." : error.message;
      onStatus?.(`Kunde inte öppna filen: ${message}`, true);
    }
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) openFile(file);
    // Nollställ, annars går det inte att öppna samma fil igen direkt efteråt.
    fileInput.value = "";
  });

  return {
    save,
    load,
    serialize,
    openDialog: () => fileInput.click(),
  };
}
