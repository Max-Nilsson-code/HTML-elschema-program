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
| **Symbolkälla** | `symboler och vägledning/Symboler-vägledning.svg` (draw.io-export) — symbolerna är **extraherade direkt** ur filen | Den renderade delen av draw.io-exporten innehåller symbolerna som riktiga `<path>`/`<rect>`/`<ellipse>`, så geometrin kunde återanvändas exakt i stället för att ritas om. Vid konverteringen normaliseras varje symbol så anslutningspunkterna hamnar på rutnätet. |

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
│   ├── selection.js                ← markering (klick + gummiband), typoberoende
│   ├── tools.js                    ← delat verktygsläge (markera/ledning/placera)
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
├── symboler och vägledning/        ← symbolkälla & dokumentation
│   ├── README.md
│   ├── Symboler-vägledning.svg     ← originalritningen (draw.io), symbolernas källa
│   └── vägledning.md               ← skriven guide: standard, namngivningskonvention, etikettplacering
└── ROADMAP.md                      ← detta dokument
```

**Varför två symbolmappar?** `symboler och vägledning/` håller
originalritningen och den skrivna guiden — källan och förklaringen.
`assets/symbols/` är de körfärdiga filer som appen laddar in, med geometrin
extraherad ur originalet och normaliserad mot rutnätet. Anledningen till
uppdelningen: mappnamnet `symboler och vägledning` innehåller mellanslag,
vilket är onödigt krångligt att referera från kod (URL-encoding vid `fetch`);
bättre att låta appen läsa från en egen, url-vänlig assets-mapp.

---

## Faser

### Fas 0 – Projektgrund
- [x] Skapa filstruktur enligt ovan (`index.html`, `css/`, `js/`, `assets/`)
- [x] Minimalt HTML-skal med ett `<svg>`-element som fyller fönstret
- [ ] Konfigurera GitHub Pages i repo-inställningarna (Settings → Pages →
      källa: main-branchen, rot-mappen) — **manuellt steg, kräver
      repo-admin-behörighet, inget verktyg tillgängligt för att göra det
      automatiskt**
- [x] Verifiera att sidan laddar tomt utan konsolfel — verifierat lokalt
      (statisk server + headless Chromium), återstår att verifiera via den
      riktiga Pages-länken när Pages är påslaget

### Fas 1 – Rityta & grid
- [x] Rendera rutnätet visuellt (linjer, 20px celler, `GRID_SIZE`-konstant i
      `js/grid.js`)
- [x] Zoom (scrollhjul, centrerad på muspekaren) och panorering
      (mellanslag+dra eller mellanknapp-dra), i `js/canvas.js`
- [x] Gemensam `snapToGrid(x, y)`-hjälpfunktion i `js/grid.js`, redo att
      användas av senare faser

### Fas 2 – Symbolbibliotek (datamodell + innehåll) ✅
- [x] Datastruktur per symboltyp: SVG-geometri, storlek, namngivna
      anslutningspunkter, etikett-ankare — allt som `data-`-attribut i
      symbolfilen själv
- [x] Symbolerna **extraherade direkt ur** `Symboler-vägledning.svg`
      (samma paths/proportioner som originalet), normaliserade så
      anslutningarna hamnar på rutnätet:
  1. Kontakt NO
  2. Kontakt NC
  3. Tillslagsfördröjd kontakt NO
  4. Tillslagsfördröjd kontakt NC
  5. Säkring
  6. Återfjädrande knapp *(tillägg på kontakt)*
  7. Tryckknapp bistabil *(tillägg på kontakt)*
  8. Motorskyddskontakt *(tillägg på kontakt)*
  9. Lampa
  10. Spole
- [x] `symboler och vägledning/vägledning.md`: standard, beteckningsprefix,
      pinnamnskonvention, filformat
- [x] `js/symbol-library.js`: laddar och exponerar symboltyperna

> Ändring mot ursprunglig plan: listan blev 10 symboler, inte 11 — den
> tänkta "brytaren" fanns bara som draw.io:s inbyggda shape på sida 2 i
> referensen, inte som egen ritad symbol. Nr 6–8 visade sig vara
> *tillägg på kontakt* utan egna anslutningar eller beteckning.
> Lampan (nr 9) har fått anslutningsledningar som originalet saknade.

### Fas 3 – Placera & manipulera symboler ✅
- [x] Symbolpalett med förhandsvisningar (`js/palette.js`)
- [x] Placera symbolinstans (klick i palett → klick på rityta, snäppt till
      grid), med autonumrerad beteckning per prefix (K1, K2 …)
- [x] Markering: klick, shift-toggle, gummiband (`js/selection.js`)
- [x] Flytta (drag, snäppt till grid vid släpp)
- [x] Rotera i 90°-steg — etiketterna räknas om men hålls horisontella
- [x] Duplicera (Ctrl/Cmd+D)
- [x] Radera (Delete/Backspace)

### Fas 4 – Ledningar (wires) ✅
- [x] Verktygsval i sidopanelen (Markera / Ledning), `js/tools.js`
- [x] Rittyg: klicka startpunkt, klicka slutpunkt, med levande
      förhandsvisning däremellan (`js/wires.js`)
- [x] **Ortogonal ruttning** — ledningen går vågrätt och lodrätt, aldrig
      snett, eftersom styrscheman ritas så. Ligger punkterna i linje blir
      det en rak linje, annars ett knä. `E` byter håll på knäet.
- [x] Snap mot symbolernas anslutningspunkter (inom 12 enheter, markeras med
      en ring i förhandsvisningen), annars mot rutnätet
- [x] Markera, dra ändpunkt, flytta hela ledningen, radera
- [x] Ingen elektrisk validering — bekräftat ur scope för v1

> `js/selection.js` generaliserades i samma veva: den känner inte längre
> till någon objekttyp, utan tar emot "providers" (en från `symbols.js`, en
> från `wires.js`) med ett litet gemensamt gränssnitt. Klick, gummiband,
> flytt, Delete och Escape fungerar därmed likadant för symboler och
> ledningar utan duplicerad logik.

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
  **"Säring"** för symbol nr 5 — tolkat som en felstavning av **"Säkring"**,
  vilket är namnet som används i appen.
- **Lampan (nr 9)** ritades i originalet utan anslutningsledningar. Den har
  fått sådana i `assets/symbols/lampa.svg` för att kunna kopplas in och
  hamna rätt på rutnätet — enda avvikelsen från originalgeometrin.
- **Tilläggssymbolerna (6–8)** placeras ovanpå en kontakt och har varken
  anslutningspunkter eller beteckning. De snäpper till samma rutnätspunkt
  som kontakten, men det finns ingen koppling mellan dem i datamodellen —
  flyttar man kontakten följer inte tillägget med. Kan behöva ses över om
  det visar sig irriterande i praktiken.
- Mappnamnet `symboler och vägledning` har mellanslag i sig — fungerar för
  dokumentation men undviks som körtidssökväg i kod (se "Varför två
  symbolmappar?" ovan).
