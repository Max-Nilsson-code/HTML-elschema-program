# Roadmap – HTML Elschema-program

Ett ritprogram för **industriella styrscheman** (reläer, kontaktorer, motorer,
PLC-I/O, kraftfördelning) som körs helt i webbläsaren, utan installation eller
byggsteg. Ritytan är ett rutnät (grid) som symboler och ledningar snäpper till,
för konsekvent placering och alignment.

Det här dokumentet är resultatet av en genomgång av alla större design- och
arkitekturbeslut. Varje beslut nedan är medvetet valt (inte antaget), och
faserna är ordnade efter beroenden — varje fas bygger vidare på det som redan
finns.

## Arkitekturbeslut

| Område | Beslut | Motivering |
|---|---|---|
| **Renderingsteknik** | SVG (varje symbol/wire = eget DOM-element) | Skarpt i alla zoom-nivåer, klick/hover/val fungerar via DOM-events utan egen hit-testing, matchar att symboler i grunden är vektorlinjeteckningar, gör SVG-export nästan gratis. |
| **Teknikstack** | Vanilla JS, flera filer (ES-moduler), inget ramverk | Inget byggsteg, inga beroenden, lätt att underhålla själv. |
| **Distribution** | Statiska filer via GitHub Pages | Nås via en länk, noll installation för vem som helst som ska använda det. |
| **Anslutningsmodell** | Rent visuellt — ledningar (wires) är grafiska linjer utan elektrisk validering eller netlist | Håller v1 realistiskt byggbart. Datamodellen är dock förberedd för mer (se Backlog). |
| **Symbol-metadata** | Varje symbolinstans har en redigerbar **beteckning** (t.ex. "K1", "M3") och namngivna, redigerbara **anslutningspunkter/pinnar** (t.ex. "A1"/"A2", "13"/"14") | Ger spårbarhet/dokumentationsvärde utan att kräva en full netlist-motor. |
| **Wire-metadata** | Ledningar har ingen egen text/etikett | Bekräftat — behövs inte. |
| **Etikettplacering** | Fast/automatisk per symboltyp, följer med vid rotation/flytt | Matchar användarens referensfil rakt av, konsekvent utseende mellan scheman. |
| **Rutnät** | Ren visuell pixel-grid (t.ex. 20×20px), ingen koppling till verkliga mått | Räcker för tydlig dokumentation. Cellstorlek hålls som en konfigurerbar konstant så skalenlig utskrift kan läggas till senare utan omskrivning. |
| **Rotation** | Låst till 90°-steg | Matchar grid + IEC-konvention, håller etiketter läsbara i alla lägen. |
| **Ritblad** | Ett ritblad per projekt (v1) | Enklare datamodell och UI att börja med. |
| **Spara/ladda** | JSON-export/import via fil (ladda ner/ladda upp) | Funkar i alla webbläsare, användaren äger sina filer. |
| **Export** | SVG (primärt), PNG (bonus) | SVG-export är i praktiken en serialisering av det som redan ritas. PNG blir en biprodukt (rendera samma SVG via canvas). |
| **Layout-konvention** | Horisontella rader, fas (L) vänster / nolla (N) höger — ren användarkonvention | Ritas med de generella verktygen (symboler + linjer), inget särskilt "skena"-objekt i v1. |
| **Symbolkälla** | `symboler och vägledning/Symboler-vägledning.svg` (draw.io-export) är designreferensen | Innehåller både symbolutseende och etikettplaceringskonvention. Måste ritas om som fristående SVG:er — draw.io:s inbyggda shape-bibliotek (`mxgraph.electrical.*`) går inte att bädda in direkt i en egen app. |

### Projektstruktur

```
/
├── index.html                      ← app-startsida (rot, så GitHub Pages kan servera direkt)
├── css/
│   └── style.css
├── js/
│   ├── main.js                     ← startpunkt, kopplar ihop modulerna nedan
│   ├── grid.js                     ← rutnät, snap-to-grid-logik
│   ├── canvas.js                   ← SVG-rityta, zoom/pan
│   ├── symbol-library.js           ← registry: laddar symboldefinitioner
│   ├── symbols.js                  ← placera/flytta/rotera/duplicera/radera symbolinstanser
│   ├── selection.js                ← markering (klick + gummiband)
│   ├── wires.js                    ← rita/redigera ledningar
│   ├── labels.js                   ← redigera beteckning + pinnamn
│   ├── history.js                  ← undo/redo
│   ├── persistence.js              ← JSON spara/öppna
│   └── export.js                   ← SVG-/PNG-export
├── assets/
│   └── symbols/                    ← appens egna, rena SVG-filer (en per symboltyp)
│       ├── kontakt-no.svg
│       ├── kontakt-nc.svg
│       └── … (se Fas 2)
├── symboler och vägledning/        ← designreferens & dokumentation (redan skapad)
│   ├── README.md
│   ├── Symboler-vägledning.svg     ← ursprunglig draw.io-referens (källa)
│   └── vägledning.md               ← skriven guide: standard, namngivningskonvention, etikettplacering
└── ROADMAP.md                      ← detta dokument
```

**Varför två symbolmappar?** `symboler och vägledning/` är den mänskligt
läsbara referensen (hur *ska* symbolerna se ut, varför) — den håller kvar
draw.io-originalet och en skriven guide. `assets/symbols/` är appens egna,
körfärdiga kopior som koden faktiskt laddar in vid körning. Anledningen till
uppdelningen: mappnamnet `symboler och vägledning` innehåller mellanslag,
vilket är onödigt krångligt att referera från kod (URL-encoding vid `fetch`);
bättre att hålla den mappen som ren dokumentation och låta appen läsa från en
egen, url-vänlig assets-mapp.

---

## Faser

### Fas 0 – Projektgrund
- [ ] Skapa filstruktur enligt ovan (`index.html`, `css/`, `js/`, `assets/`)
- [ ] Minimalt HTML-skal med ett `<svg>`-element som fyller fönstret
- [ ] Konfigurera GitHub Pages i repo-inställningarna (Settings → Pages →
      källa: main-branchen, rot-mappen)
- [ ] Verifiera att sidan laddar tomt utan konsolfel via Pages-länken

### Fas 1 – Rityta & grid
- [ ] Rendera rutnätet visuellt (linjer eller punkter, konfigurerbar
      cellstorlek som en central konstant)
- [ ] Zoom (scroll/knappar) och panorering (dra med mellanslag eller
      mellanknapp)
- [ ] Gemensam `snapToGrid(x, y)`-hjälpfunktion som alla senare faser
      återanvänder

### Fas 2 – Symbolbibliotek (datamodell + innehåll)
- [ ] Definiera datastruktur per symboltyp: SVG-geometri, storlek i
      grid-enheter, namngivna anslutningspunkter (relativ position per pinne),
      etikett-slots (var beteckning och pinnamn ska sitta, i alla 4
      rotationslägen)
- [ ] Rita om samtliga symboler från `Symboler-vägledning.svg` som fristående
      SVG-filer i `assets/symbols/`:
  1. Kontakt NO
  2. Kontakt NC
  3. Tillslagsfördröjd kontakt NO
  4. Tillslagsfördröjd kontakt NC
  5. Säkring
  6. Återfjädrande knapp (tillägg på kontakt)
  7. Tryckknapp bistabil (tillägg på kontakt)
  8. Motorskyddskontakt (tillägg på kontakt)
  9. Lampa
  10. Spole
  11. Brytare (motsvarande draw.io:s `singleSwitch`)
- [ ] Skriv `symboler och vägledning/vägledning.md`: vilken standard som
      följs, namngivningskonvention för beteckningar (K, M, Q, S, B, P …) och
      pinnamn (A1/A2, 13/14, 95/96 …)
- [ ] `symbol-library.js`: registry som laddar in och exponerar alla
      symboldefinitioner till resten av appen

### Fas 3 – Placera & manipulera symboler
- [ ] Symbolpalett/sidopanel med alla tillgängliga symboler
- [ ] Placera symbolinstans på canvas (klick i palett → klick på rityta,
      snäppt till grid)
- [ ] Markering: klick på enskild symbol, gummiband för flera
- [ ] Flytta (drag, snäppt till grid)
- [ ] Rotera i 90°-steg (etikett-slots uppdateras korrekt till nytt läge)
- [ ] Duplicera markerad symbol/markering
- [ ] Radera

### Fas 4 – Ledningar (wires)
- [ ] Rittyg: klicka start- och slutpunkt (eller klick-och-dra) för att skapa
      en ledning
- [ ] Snap till grid-punkter och till symbolers anslutningspunkter
- [ ] Markera, flytta ändpunkt, radera ledning
- [ ] (Ingen elektrisk validering — bekräftat ur scope för v1)

### Fas 5 – Etiketter & namngivning
- [ ] Redigerbar beteckning per symbolinstans (dubbelklick → textfält, fast
      position enligt etikett-slot)
- [ ] Redigerbara pinnamn per anslutningspunkt, samma redigeringsmönster
- [ ] Verifiera att etiketter hamnar rätt i alla 4 rotationslägen

### Fas 6 – Spara & ladda
- [ ] Definiera projekt-JSON-schema (version, lista av symbolinstanser med
      typ/position/rotation/beteckning/pinnamn, lista av wires)
- [ ] "Spara"-knapp → serialisera state → ladda ner `.json`
- [ ] "Öppna"-knapp → filväljare → läs in `.json` → återskapa canvas-state
- [ ] Enkelt fel-hanterande vid ogiltig/skadad fil

### Fas 7 – Export
- [ ] SVG-export: rensa bort UI-specifika element (markeringsramar,
      grid-hjälplinjer, verktygs-cursor-indikatorer) från en kopia, serialisera
      till fristående `.svg`
- [ ] PNG-export: rendera samma rensade SVG via en osynlig `<canvas>`,
      exportera som `.png`

### Fas 8 – Historik & finputs
- [ ] Undo/redo: kommandohistorik för alla muterande åtgärder (placera,
      flytta, rotera, radera, redigera etikett, rita/ta bort wire)
- [ ] Tangentbordsgenvägar: Delete, Ctrl+Z / Ctrl+Y, Ctrl+D (duplicera)
- [ ] Visuell polish: hover-states, tydlig markeringsram, muspekare per
      aktivt verktyg

### Fas 9 – Publicering
- [ ] Driftsätt via GitHub Pages, verifiera hela flödet (placera → koppla →
      spara → öppna → exportera) i en riktig deployad miljö
- [ ] Kort användarinstruktion (t.ex. i sidfoten eller en hjälp-panel)

---

## Backlog (uttryckligen utanför v1)

Funktioner som diskuterades men medvetet sköts upp, så att datamodellen ändå
hålls öppen för dem senare:

- **Flera ritblad per projekt** (flikar, likt kraftkrets/styrkrets/plintlista)
- **Skalenligt rutnät** kopplat till verkliga mått, för utskrift i exakt skala
- **Elektrisk validering/netlist**: varna för oanslutna pinnar, automatisk
  stycklista/komponentlista, kontroll av dubbla beteckningar
- **Fler symboltyper** utöver startuppsättningen på 11
- **Inbyggd mall/scaffolding** för L/N-skenor (färdig horisontell layout vid
  nytt projekt, med snap mot skenorna)
- **Fri etikettplacering**: möjlighet att flytta loss en enskild etikett från
  sin fasta position, för trånga ritningar
- **"Spara direkt"-känsla** via File System Access API (Chromium-only)

---

## Öppna trådar att hålla koll på

- Filen `symboler och vägledning/Symboler-vägledning.svg` innehåller texten
  **"Säring"** för symbol nr 5 — antas vara en felstavning av **"Säkring"**,
  rättas i samband med Fas 2.
- Mappnamnet `symboler och vägledning` har mellanslag i sig — fungerar för
  dokumentation men undviks som körtidssökväg i kod (se "Varför två
  symbolmappar?" ovan).
