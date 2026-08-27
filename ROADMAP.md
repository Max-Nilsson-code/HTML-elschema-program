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
├── studio.html                     ← andra skalet: Elschema Studio (samma motor)
├── css/
│   └── style.css
├── js/
│   ├── main.js                     ← startpunkt, kopplar ihop modulerna nedan
│   ├── grid.js                     ← rutnät, snap-to-grid-logik
│   ├── canvas.js                   ← SVG-rityta, zoom/pan
│   ├── symbol-library.js           ← registry: laddar symboldefinitioner
│   ├── symbols.js                  ← placera/flytta/rotera/duplicera/radera symbolinstanser
│   ├── selection.js                ← markering (klick + gummiband), typoberoende
│   ├── tools.js                    ← delat verktygsläge (markera/ledning/streckad/text/placera)
│   ├── palette.js                  ← originalets symbolpalett
│   ├── palette-shared.js           ← förhandsvisning + placeringsklick, delat av båda paletterna
│   ├── wires.js                    ← rita/redigera ledningar
│   ├── junctions.js                ← kopplingsprickar (räknas ut, ritas inte för hand)
│   ├── labels.js                   ← redigera beteckning + pinnamn på plats
│   ├── texts.js                    ← fristående textetiketter (eget objekt)
│   ├── inspector.js                ← egenskapspanel: alla texter som fält
│   ├── history.js                  ← undo/redo
│   ├── persistence.js              ← JSON spara/öppna
│   └── export.js                   ← SVG-/PNG-export
├── studio/                         ← enbart Studios skal, motorn ligger kvar i js/
│   ├── app.js                      ← startpunkt: kopplar js/-modulerna till skalet
│   ├── palette.js                  ← palett med kategorier och ikoner
│   ├── sheet.js                    ← pappersark (A5/A4/A3) som referensram
│   ├── icons.js                    ← ikonerna som inline-SVG (inget CDN)
│   ├── studio.css                  ← skalets utseende
│   └── nocturne-tokens.css         ← designsystemets tokens
├── assets/
│   └── symbols/                    ← appens egna, rena SVG-filer (en per symboltyp)
│       ├── kontakt-no.svg
│       ├── kontakt-nc.svg
│       └── … (se Fas 2)
├── symboler och vägledning/        ← symbolkälla & dokumentation
│   ├── README.md
│   ├── Symboler-vägledning.svg     ← originalritningen (draw.io), symbol 1–10
│   ├── Elschema-symboler2.svg      ← påbyggnad, symbol 11–12
│   ├── Elschema-Symboler3.drawio.svg ← påbyggnad, symbol 13–14
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

### Två skal, en motor

Det finns **två sidor mot samma kod**:

| | `index.html` | `studio.html` |
|---|---|---|
| Rutnät | 20 units | 10 units |
| Symbolskala | 1 (80 units bred) | 0,5 (40 units bred) |
| Linjetjocklek | 1,5 | 1,25 |
| Palett | flat lista | kategorier, ikoner |
| Rityta | oändlig, vit | pappersark A5/A4/A3, ljus eller mörk |
| Kommandon | knappar i sidopanelen | topprad, zoomruta, `?`-fönster |

Allt under skalet — symboler, ledningar, markering, etiketter, historik,
spara/öppna, export — är samma moduler i `js/`. Skalet bestämmer bara hur de
kopplas ihop och hur de ser ut.

Tre saker gjordes ställbara för att det skulle gå:

- `js/grid.js` — `GRID_SIZE` är `let` med en `setGridSize()`. Den läses bara
  inne i modulen och alltid vid anropet, så en omställning slår igenom
  överallt. Måste ske innan `setupGrid()` kör.
- `js/symbols.js` — `initSymbols(svg, library, scale)`. Geometrin ritas i
  skalan medan etiketterna ligger utanför den skalade gruppen och behåller
  sin läsbara storlek. Vid `scale = 1` utelämnas `scale()` helt, så
  originalets DOM och export ser exakt ut som förut.
- `js/export.js` — `initExport(svg, onStatus, { extraStrip, extraCss })`.
  Studio städar bort sitt pappersark och skickar in sina linjetjocklekar,
  räknade ur samma konstanter som ritytan använder.

`js/canvas.js` fick `zoomBy()`, `fitWorldRect()` och `onView()` för
zoomrutan, och slutade kapa mellanslag som skrivs i ett textfält.

**Inga externa beroenden.** Studio kom från designverktyget med en ikonfont
från unpkg.com och Inter från Google Fonts. Båda är borta: ikonerna ligger
som inline-SVG i `studio/icons.js` och texten går på systemstacken. Skälet är
inte bara principen — zoom- och ångra-knapparna är rena ikonknappar, så ett
uteblivet CDN-svar hade gjort dem till tomma rutor utan att något syntes vara
fel. Systemstacken är dessutom densamma som exporten bäddar in, så
etiketterna får samma bredd på skärmen som i den exporterade filen.

**Mörkt läge är en skärminställning**, inte en egenskap hos ritningen:
exporten blir svart på vitt oavsett vilket läge ritytan står i.

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
  11. Gränslägesbrytare *(tillägg på kontakt)*
  12. Summer/ringklocka
  13. Photocell
  14. Växlande kontakt
- [x] `symboler och vägledning/vägledning.md`: standard, beteckningsprefix,
      pinnamnskonvention, filformat
- [x] `js/symbol-library.js`: laddar och exponerar symboltyperna

> Ändring mot ursprunglig plan: listan blev 10 symboler, inte 11 — den
> tänkta "brytaren" fanns bara som draw.io:s inbyggda shape på sida 2 i
> referensen, inte som egen ritad symbol. Nr 6–8 visade sig vara
> *tillägg på kontakt* utan egna anslutningar eller beteckning.
> Lampan (nr 9) har fått anslutningsledningar som originalet saknade.
> De öppna kontakterna (nr 1 och 3) är speglade kring `x=40` så bladet
> hänger från höger kontaktpunkt och pekar uppåt-höger — pinnarna behåller
> sina sidor, och bladet korsar `x=40` på samma `y≈48` som förut.

### Fas 3 – Placera & manipulera symboler ✅
- [x] Symbolpalett med förhandsvisningar (`js/palette.js`)
- [x] Placera symbolinstans (klick i palett → klick på rityta, snäppt till
      grid), med autonumrerad beteckning per prefix (K1, K2 …)
- [x] Markering: klick, shift-toggle, gummiband (`js/selection.js`)
- [x] Flytta (drag, snäppt till grid vid släpp)
- [x] Rotera i 90°-steg — etiketterna räknas om men hålls horisontella
- [x] **Spegelvända** (`M`) kring lodräta mittlinjen. Texten speglas aldrig:
      etiketterna ligger utanför den speglade gruppen, bara ankarpunkterna
      räknas om. Fyra rotationslägen × två speglingslägen ger alla åtta
      orienteringar, så en lodrät spegling behövs inte som eget kommando.
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
- [x] **Streckad linje** som eget verktyg: mekanisk förbindelse, inte en
      ledare. Räknas därför inte med när kopplingsprickarna beräknas.
- [x] **Ledningar följer symbolen**: en ändpunkt som fäst i en anslutning
      binds till den och flyttas med när symbolen flyttas eller roteras.
      Bindningen släpper när ledningen dras bort eller symbolen raderas.
- [x] **Kopplingsprickar** (`js/junctions.js`): en fylld prick ritas bara
      där tre eller fler ledare möts, alltså vid en förgrening. Två symboler
      i serie, eller två ledningar som möts i ett hörn, får ingen prick.
      Prickarna är inte fast geometri utan räknas ut från var ledningar och
      anslutningar faktiskt ligger, och ritas om när något flyttas.

> `js/selection.js` generaliserades i samma veva: den känner inte längre
> till någon objekttyp, utan tar emot "providers" (en från `symbols.js`, en
> från `wires.js`) med ett litet gemensamt gränssnitt. Klick, gummiband,
> flytt, Delete och Escape fungerar därmed likadant för symboler och
> ledningar utan duplicerad logik.

### Fas 5 – Etiketter & namngivning ✅
- [x] Redigerbar beteckning per symbolinstans: dubbelklick öppnar ett
      textfält på plats, Enter eller klick utanför sparar, Escape ångrar
      (`js/labels.js`)
- [x] Redigerbara pinnamn per anslutningspunkt, samma mönster
- [x] Positionen är fast enligt symboltypens etikett-slot — användaren
      ändrar bara texten
- [x] Tangentbordsgenvägar (R, Delete, Ctrl+D) kapas inte medan man skriver
- [x] Verifierat att etiketterna hamnar rätt i alla fyra rotationslägen och
      att texten består genom rotation
- [x] **Egenskapspanel** (`js/inspector.js`): markerar man en symbol listas
      alla dess texter som fält — beteckning plus ett fält per anslutning
- [x] **Tillägg sätter kontaktens prefix**: en tryckknapp gör kontakten
      under till ett `S`, ett motorskydd till ett `B`. Redan rätt prefix
      lämnas i fred.
- [x] **Fristående textetikett** (`js/texts.js`): verktyget *Text* placerar
      en text var som helst på ritytan, oberoende av symboler — rubriker,
      anteckningar, kretsnamn, L/N-märkning. Redigeras med dubbelklick eller
      i egenskapspanelen (text + storlek), och markeras, flyttas, roteras,
      dupliceras och raderas som allt annat.

> **Varför ett eget objekt och inte en symbol i biblioteket?** En
> biblioteksymbol har fast geometri och fast storlek; en text har varken —
> dess yta beror på vad som står i den och hur stort det står. `texts.js`
> mäter därför rutan med `getBBox()` på det renderade elementet i stället
> för att räkna fram den, och lämnar in en egen provider till
> `selection.js` precis som symboler och ledningar gör.

### Fas 6 – Spara & ladda ✅
- [x] Projekt-JSON med `format` + `version`, symbolinstanser (typ, position,
      rotation, beteckning, pinnamn, stamlängd) och ledningar (ändpunkter,
      knä, bindningar till anslutningar)
- [x] "Spara" → serialiserar och laddar ner `elschema.json`
- [x] "Öppna" → filväljare → läser in och återskapar ritytan
- [x] Felhantering: ogiltig JSON, fel filformat och nyare filversion avvisas
      med begripligt meddelande, och ritningen lämnas orörd
- [x] Id:n bevaras vid inläsning (ledningarnas bindningar pekar på dem) och
      räknarna flyttas förbi högsta använda nummer

### Fas 7 – Export ✅
- [x] SVG-export (`js/export.js`): UI-element städas bort ur en kopia
      (rutnät och dess mönster, markeringsramar, draghandtag, träffytor,
      anslutningsmarkörer, ledningsförhandsvisning)
- [x] Stilarna bäddas in i filen — appens CSS ligger externt, och en
      exporterad SVG måste stå för sig själv i vilket program som helst
- [x] Beskärs till innehållet med marginal, plus vit botten (annars blir
      bakgrunden genomskinlig och svarta linjer försvinner i mörkt tema)
- [x] PNG-export: samma SVG renderad via `<canvas>` i dubbel upplösning
- [x] Tom rityta ger ett meddelande i stället för en tom fil

### Fas 8 – Historik & finputs ✅
- [x] Ångra/gör om (`js/history.js`) för alla muterande åtgärder — placera,
      flytta, rotera, radera, redigera etikett, rita och ta bort ledning
- [x] Tangentbordsgenvägar: Delete, Ctrl+Z, Ctrl+Y (och Ctrl+Shift+Z),
      Ctrl+D, R, Escape — plus knappar i sidopanelen
- [x] Visuell polish: hover på symboler och ledningar i markeringsläge,
      markeringsram, muspekare per aktivt verktyg

> **Ögonblicksbilder, inte kommandologg.** Eftersom Fas 6 redan gav
> `serialize()` för hela dokumentet lagras historiken som serialiserade
> lägen i stället för som par av gör/ångra-kommandon. Det är billigt (ett
> schema är litet) och framför allt kan det inte glida isär från
> verkligheten: varje åtgärd som ändrar något fångas automatiskt, utan att
> varje anropsställe måste komma ihåg att logga sin motsats.
>
> Ändringar under ett drag kommer en gång per musrörelse, så de samlas ihop
> — först när det varit tyst 250 ms läggs ett läge på stacken. Ett helt drag
> eller en inskriven text blir därmed **ett** steg att ångra.

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
