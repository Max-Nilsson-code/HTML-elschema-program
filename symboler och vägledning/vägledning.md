# Vägledning – symboler och namngivning

Den här mappen är **källan** för symbolbiblioteket. Filerna som appen laddar
vid körning ligger i `assets/symbols/`.

- `Symboler-vägledning.svg` — originalritningen (draw.io/diagrams.net-export)
  med symbol 1–10. Det är härifrån geometrin är hämtad.
- `Elschema-symboler2.svg` — påbyggnad med symbol 11–12.
- `Elschema-Symboler3.drawio.svg` — påbyggnad med symbol 13–14.
- `vägledning.md` — det här dokumentet.

## Hur symbolerna kommit till

Geometrin är **extraherad direkt ur `Symboler-vägledning.svg`** — samma
paths, koordinater och proportioner som i originalritningen. Den renderade
delen av draw.io-filen innehåller symbolerna som riktiga `<path>`-,
`<rect>`- och `<ellipse>`-element, vilka konverterats till fristående
SVG-filer.

Vid konverteringen har varje symbol flyttats så att anslutningspunkterna
hamnar på `x=0` och `x=80`, med den elektriska axeln på `y=40`. Det gör att
anslutningarna hamnar exakt på rutnätet (20 px) när symbolen placeras.

**En avvikelse från originalet:** lampan (nr 9) ritades i originalet utan
anslutningsledningar — bara cirkeln med kryss. I appen har den fått
ledningar ut till `x=0` respektive `x=80`, som övriga symboler, så att den
går att koppla in och hamnar rätt på rutnätet.

## Symboluppsättning

| # | Fil | Namn | Beteckning | Anslutningar |
|---|---|---|---|---|
| 1 | `kontakt-no.svg` | Kontakt NO (slutande) | S | 1 / 2 |
| 2 | `kontakt-nc.svg` | Kontakt NC (brytande) | S | 1 / 2 |
| 3 | `tillslagsfordrojd-kontakt-no.svg` | Tillslagsfördröjd kontakt NO | K | 1 / 2 |
| 4 | `tillslagsfordrojd-kontakt-nc.svg` | Tillslagsfördröjd kontakt NC | K | 1 / 2 |
| 5 | `sakring.svg` | Säkring | F | 1 / 2 |
| 6 | `aterfjadrande-knapp.svg` | Återfjädrande knapp | — | *tillägg* |
| 7 | `tryckknapp-bistabil.svg` | Tryckknapp bistabil | — | *tillägg* |
| 8 | `motorskyddskontakt.svg` | Motorskyddskontakt | — | *tillägg* |
| 9 | `lampa.svg` | Lampa | P | 1 / 2 |
| 10 | `spole.svg` | Spole | K | A1 / A2 |
| 11 | `granslagesbrytare.svg` | Gränslägesbrytare | — | *tillägg* |
| 12 | `summer.svg` | Summer/ringklocka | P | 1 / 2 |
| 13 | `photocell.svg` | Photocell | B | 1 / 2 |
| 14 | `vaxlande-kontakt.svg` | Växlande kontakt | K | 11 / 14 / 12 |

> **Not:** originalritningen stavar nr 5 "Säring" — tolkat som en felstavning
> av "Säkring".

> **Nr 11 och 12** kommer från `Elschema-symboler2.svg`. Två saker justerades
> vid konverteringen:
> - Gränslägesbrytaren ritades ~3 enheter vänster om mitten; den är
>   centrerad så stammen hamnar på `x=40` som övriga tillägg och därmed
>   linjerar med kontakten under. En osynlig rektangel runt symbolen
>   (draw.io:s behållare, `stroke="none" fill="none"`) följde inte med.
> - Summerns anslutningsledningar gick till `x=10` och `x=70`; de är
>   förlängda till `x=0` och `x=80` så anslutningarna hamnar på rutnätet,
>   samma justering som lampan fick.

> **Nr 13 och 14** kommer från `Elschema-Symboler3.drawio.svg`. Photocellen
> ritades utan anslutningsledningar (som lampan) och har fått sådana.
> Växlande kontakt följer IEC-numreringen: `11` gemensam, `12` det slutna
> läget (heldraget blad) och `14` det andra läget (streckat blad). Det
> streckade bladet hör till symbolen och ritas alltid — det är inte samma
> sak som det streckade linjeverktyget.

> **NO-kontakternas bladriktning.** På de öppna kontakterna (nr 1 och 3)
> hänger bladet från **höger** kontaktpunkt med den fria änden nedåt vänster,
> så det pekar uppåt-höger mot sitt slutläge. Geometrin är originalets,
> speglad kring `x=40`; på nr 3 följde tidsfördröjningssymbolen med
> speglingen så den fortfarande hänger i bladet. Anslutningarna rör sig inte:
> `1` sitter kvar till vänster och `2` till höger. Bladet passerar `x=40` på
> `y≈48` precis som förut, så tilläggens mekaniska förbindelse når lika långt.
>
> Har du ett sparat schema där du speglat en NO-kontakt med `M` för att få
> just den här riktningen ligger speglingen kvar i filen och vänder nu
> symbolen åt andra hållet — tryck `M` en gång till på den så stämmer det.

## Tilläggssymboler (6, 7, 8, 11)

Nr 6, 7, 8 och 11 är i originalritningarna markerade som **"tillägg på
kontakt"**.
De är manöverdon, inte egna komponenter: de placeras *ovanpå* en
kontaktsymbol (1–4) för att visa hur kontakten manövreras.

Därför har de medvetet:
- **inga anslutningspunkter** — kontakten under bär anslutningarna
- **ingen egen beteckning** — beteckningen hör till kontakten

**Tillägget sätter kontaktens beteckningsprefix.** Det är manöverdonet som
avgör vad komponenten *är*: placerar man en tryckknapp (nr 6 eller 7) på en
kontakt blir kontakten ett `S`, ett motorskydd (nr 8) gör den till ett `B`,
och en gränslägesbrytare (nr 11) ger `S` — den är en brytare i manöverkretsen,
och `S` täcker "brytare" enligt tabellen nedan. Numret tas från nästa lediga i den serien. Har kontakten redan rätt
prefix lämnas den i fred, så ett nummer man satt själv inte byts ut.

Symbolerna är ritade i samma koordinatsystem som kontakterna, så en
tilläggssymbol placerad på samma rutnätspunkt som en kontakt hamnar i rätt
läge i sidled. Höjdläget behöver däremot justeras för hand — se nästa
avsnitt. Tillägget och kontakten är inte heller sammankopplade i
datamodellen: flyttar du kontakten följer tillägget inte med.

### Justerbar mekanisk förbindelse

Den lodräta stammen från manöverdonet är den mekaniska förbindelsen till
kontakten (streckad på nr 6 och 8, heldragen på nr 7 och 11).

**Stammens längd går att justera per instans.** Det behövs eftersom hur långt
den måste nå beror på vilken kontakt tillägget sitter på: en NO-kontakts blad
hänger nedåt och ligger lägre än en NC-kontakts raka bygel.

Markera tillägget och dra i den blå punkten i stammens fria ände. Stammen
kan aldrig dras in genom symbolkroppen — en kort stump behålls alltid.
Justeringen fungerar i alla fyra rotationslägen.

Till skillnad från symbolplacering snäpper stammen **inte** mot rutnätet
utan går i steg om 1 enhet. Det är avsiktligt: stammen är en mekanisk
förbindelse, inte en elektrisk anslutning, och måste kunna sluta exakt vid
kontaktens rörliga del. En NO-kontakts blad ligger t.ex. på y≈48, mellan två
rutnätslinjer — med rutnätssnäppning hade stammen aldrig kunnat nå det.

I symbolfilen deklareras stammen med `data-stem-*` i stället för att ritas
som en fast `<path>`:

| Attribut | Betydelse |
|---|---|
| `data-stem-x` | stammens x-läge (alla nuvarande stammar är lodräta) |
| `data-stem-attach-y` | där stammen möter symbolkroppen (fast punkt) |
| `data-stem-default-y` | fria änden vid placering (utgångslängd) |
| `data-stem-dashed` | `true` = streckad, `false` = heldragen |

## Beteckningar (komponentbenämning)

Varje symbolinstans får en beteckning som placeras **ovanför** symbolen.
Appen föreslår automatiskt nästa lediga nummer per prefix (K1, K2, K3 …),
men beteckningen är fritt redigerbar.

| Prefix | Används för |
|---|---|
| `K` | Reläer, kontaktorer, spolar, tidreläer |
| `S` | Manöverdon: tryckknappar, brytare, väljare |
| `Q` | Effektbrytare, huvudbrytare, lastfrånskiljare |
| `F` | Säkringar och skyddsutrustning |
| `B` | Givare och övervakning (gränslägen, fotoceller) |
| `P` | Signal- och indikeringsdon (lampor, summer) |
| `M` | Motorer |

## Pinnamn (anslutningsnummer)

Pinnamn placeras vid respektive anslutningspunkt. Varje symboltyp har
förifyllda standardnummer, som också går att redigera fritt.

| Funktion | Konvention | Exempel |
|---|---|---|
| Spole (manöverlindning) | `A1` / `A2` | Kontaktorspole |
| Slutande hjälpkontakt (NO) | `13` / `14`, `23` / `24`, … | Hjälpkontakt på kontaktor |
| Brytande hjälpkontakt (NC) | `11` / `12`, `21` / `22`, … | Hjälpkontakt på kontaktor |
| Motorskydd, utlösningskontakt | `95` / `96` (NC), `97` / `98` (NO) | Termiskt överlastskydd |
| Huvudkontakter (kraft) | `1`/`2`, `3`/`4`, `5`/`6` | Kontaktorns huvudpoler |
| Manöverdon (tryckknapp) | `1` / `2` (NC), `3` / `4` (NO) | Tryckknapp |

Tiotalssiffran anger vilken kontakt i ordningen det gäller, entalssiffran
vilken sida av kontakten. Ett relä med två slutande hjälpkontakter får
alltså `13`/`14` på den första och `23`/`24` på den andra.

## Etikettplacering

Placeringen är **fast per symboltyp** och följer med automatiskt vid flytt
och rotation — användaren ändrar texten, inte positionen:

- **Beteckningen** sitter centrerad ovanför symbolen.
- **Pinnamnen** sitter ovanför anslutningslinjen vid respektive
  anslutningspunkt.

Etiketttexterna hålls alltid horisontella och läsbara, även när symbolen
roteras 90/180/270° eller spegelvänds.

### Spegelvända

`M` spegelvänder markerade symboler kring deras lodräta mittlinje. Praktiskt
när en komponent behöver matas från andra hållet, t.ex. en växlande kontakt
vars gemensamma anslutning ska sitta till höger.

**Texten speglas aldrig.** Etiketterna ligger utanför den speglade gruppen —
bara deras ankarpunkter räknas om, så beteckning och anslutningsnamn följer
med till rätt sida men står fortfarande rättvända. Anslutningsnamnen byter
alltså plats, inte utseende.

En **lodrät** spegling behövs inte som eget kommando: den är samma sak som
`M` följt av ett halvt varv (`R` två gånger). Fyra rotationslägen gånger två
speglingslägen ger alla åtta möjliga orienteringar.

### Redigera en etikett

**Dubbelklicka** på beteckningen eller ett pinnamn så öppnas ett textfält på
plats. `Enter` eller ett klick utanför sparar, `Escape` ångrar. Fältet tar
över tangentbordet medan det är öppet, så genvägarna (`R`, `Delete`,
`Ctrl+D`) inte kapar det man skriver.

Positionen går inte att flytta — den är fast per symboltyp så att alla
scheman ser likadana ut. Det är bara texten som ändras.

### Egenskapspanelen

Markerar man en symbol listas **alla dess texter som fält** till höger:
beteckningen överst, sedan ett fält per anslutning. Ändringar slår igenom
direkt i ritningen. Panelen och redigering på plats skriver till samma
ställe, så de kan inte glida isär — använd det som passar.

Panelen ligger kvar även när inget är markerat (med en uppmaning i stället
för fält). Det är avsiktligt: fälldes den ut vid markering skulle ritytan
krympa och hela ritningen hoppa i sidled just när man klickat på något.

## Fristående textetiketter

Verktyget **Text** placerar en text var som helst på ritytan. Till skillnad
från beteckningar och pinnamn hör den inte till någon symbol — den är ett
eget objekt med egen position.

Använd den till sådant som inte är en komponent: rubrik på schemat,
kretsnamn, `L`- och `N`-märkning i kanterna, en anteckning om vad en del av
kretsen gör, datum eller ritningsnummer.

**Så här gör du:** klicka *Text* i sidopanelen och sedan på ritytan.
Etiketten placeras snäppt till rutnätet, blir markerad direkt och får texten
"Text" — skriv över den i egenskapspanelen till höger, eller dubbelklicka på
den i ritningen. Verktyget går tillbaka till *Markera* efter placeringen, så
nästa klick markerar i stället för att lägga ut ännu en text.

| Vad | Hur |
|---|---|
| Ändra texten | Dubbelklick på plats, eller fältet **Text** i egenskapspanelen |
| Ändra storlek | Fältet **Storlek** i egenskapspanelen (6–96) |
| Flytta | Dra, snäpps till rutnätet vid släpp |
| Rotera | `R`, i 90°-steg — här *roteras* texten faktiskt, till skillnad från symbolernas etiketter, eftersom en lodrät text ibland är precis vad man vill ha i kanten på ett schema |
| Duplicera | `Ctrl/Cmd+D` |
| Radera | `Delete` |

Texten är ankrad i sitt **övre vänstra hörn**: det är den punkten som
snäpper till rutnätet, så flera etiketter under varandra får rak vänsterkant.
Markeringsrutan mäts av det som faktiskt renderats, med lite greppmån runtom
— en tunn text ska gå att träffa utan att pricka exakt på strecken.

Textetiketter följer med i spara/öppna, ångra/gör om och båda exporterna som
allt annat.

## Ritkonvention

Styrscheman ritas **horisontellt**, med fas (L) till vänster och nolla (N)
till höger. Symbolerna är därför ritade med sina anslutningspunkter på
vänster respektive höger sida i sitt oroterade grundläge.

I v1 finns inget särskilt "skena"-objekt — L- och N-linjerna ritas med
ledningsverktyget som vilka ledningar som helst.

Ledningar ritas ortogonalt (vågrätt/lodrätt). Ligger start- och slutpunkt i
linje blir det en rak linje, annars ett knä; `E` byter håll på knäet medan
man ritar. Ändpunkterna fäster i symbolernas anslutningspunkter när man
kommer inom ~12 enheter, vilket visas med en ring i förhandsvisningen.

En ledningsände som fäst i en anslutning **binds** till den: flyttar eller
roterar man symbolen följer ledningen med. Bindningen släpper om man drar
hela ledningen någon annanstans, drar ändpunkten till en punkt utan
anslutning, eller raderar symbolen — då blir ledningen liggande där den är.

### Streckad linje

Verktyget **Streckad** ritar en linje precis som ledningsverktyget, men
resultatet är en **mekanisk förbindelse — inte en ledare**. Den används för
att visa att delar hör ihop mekaniskt, t.ex. mellan kontakter som manövreras
tillsammans.

Eftersom en streckad linje inte leder ström räknas den **inte** med när
kopplingsprickarna beräknas: den ger aldrig upphov till en prick, och den
bidrar inte till en prick i en punkt där ledningar möts.

I övrigt beter den sig som en vanlig ledning — den snäpper mot rutnät och
anslutningar, fäster i en anslutning och följer med när symbolen flyttas,
och går att markera, flytta och radera på samma sätt.

### Kopplingsprickar

En **fylld prick ritas bara där tre eller fler ledare möts** — alltså vid en
förgrening. Det följer den vanliga konventionen i elscheman:

| Situation | Ledare i punkten | Prick |
|---|---|---|
| Två symboler i serie | anslutning + 1 ledning = 2 | nej |
| Två ledningar möts i ett hörn | 1 + 1 = 2 | nej |
| Ledning slutar mitt på en annan (T) | genomgående 2 + 1 = 3 | **ja** |
| Anslutning med två ledningar | anslutning + 2 ledningar = 3 | **ja** |
| Ledning ansluten till en skena | genomgående 2 + 1 = 3 | **ja** |

Prickarna är inget man ritar själv: de räknas ut från var ledningar och
anslutningar faktiskt ligger och uppdateras automatiskt när något flyttas,
läggs till eller raderas.

De små ringarna vid symbolernas anslutningar är bara en hjälpvisning som
syns medan ledningsverktyget är aktivt, så man ser var det går att fästa.
De är inte ritningsinnehåll och följer inte med i schemat.

## Elschema Studio

Studio är programmets **startsida** — `index.html`, alltså det du får när du
öppnar länken. Det har tätare rutnät, pappersark och kommandona i en topprad.

Det första gränssnittet finns kvar på **`klassisk.html`**, för den som hellre
vill ha det. Symbolerna, ledningarna, etiketterna, historiken, filformatet och
exporten är exakt desamma i båda — en fil sparad i det ena öppnas i det andra.

| | `klassisk.html` | `index.html` (Studio) |
|---|---|---|
| Rutnät | 20 enheter | 10 enheter |
| Symbolstorlek | 80 enheter bred | 40 enheter bred |
| Palett | flat lista | kategorier med ikoner |
| Rityta | oändlig och vit | pappersark, ljus eller mörk |

En symbol är fyra rutor bred i båda — det är rutnätet och symbolerna som
krympt tillsammans, så tillägg, stammar och anslutningar hamnar precis som
förut, bara tätare på skärmen.

### Pappersarket

Panelen **Rityta** väljer ark: A5, A4 eller A3, stående eller liggande, eller
**Inget ark**. Skalan är 2 enheter per millimeter, så ett A4 liggande är
594 × 420 enheter — knappt 60 × 42 rutor.

Arket är en **visuell referensram**, inget mer: det talar om ungefär hur
mycket som får plats på ett utskrivet papper. Det begränsar inte var du får
rita, och det följer aldrig med i exporten — den beskärs som vanligt till det
du faktiskt ritat. Knappen längst till höger i zoomrutan anpassar vyn till
arket.

### Ljus och mörk rityta

**Utseende** växlar ritytan mellan ljust och mörkt papper. Det är en ren
skärminställning för att orka titta länge — den ändrar inte ritningen.
**Exporten blir svart på vitt oavsett vilket läge du står i.**

### Topprad och zoomruta

Nytt, Öppna, Spara, SVG, PNG, Ångra och Gör om ligger i toppraden i stället
för i sidopanelen. Nere till höger finns zoomrutan: minus, plus, procentsats
och anpassa-till-ark. `?` öppnar en lista över alla kortkommandon.

**Nytt** tömmer ritytan. Det går att ångra som vilken ändring som helst, så
ett feltryck är inte farligt.

### Utan nätverk

Studio hämtar inget utifrån. Ikonerna ligger som SVG i `studio/icons.js` och
texten går på systemets egna typsnitt. Det är avsiktligt: hela programmet ska
fungera som statiska filer, även utan uppkoppling, och zoom- och
ångra-knapparna är rena ikonknappar som hade blivit tomma rutor om en
ikonfont inte gick att hämta.

## Spara och öppna

**Spara** laddar ner hela schemat som `elschema.json`. **Öppna** läser
tillbaka en sådan fil och ersätter ritytans innehåll.

Formatet är avsiktligt läsbart — samma fält som appen använder internt:

```json
{
  "format": "elschema",
  "version": 1,
  "symbols": [
    { "id": "sym-1", "typeId": "spole", "x": 300, "y": 140, "rotation": 0,
      "designation": "K1", "pinLabels": { "A1": "A1", "A2": "A2" },
      "stemY": null }
  ],
  "wires": [
    { "id": "wire-1", "elbow": "h",
      "a": { "x": 380, "y": 180,
             "attach": { "instanceId": "sym-1", "pinId": "A2" } },
      "b": { "x": 600, "y": 180, "attach": null } }
  ],
  "texts": [
    { "id": "text-1", "x": 120, "y": 60, "text": "Styrkrets",
      "size": 14, "rotation": 0 }
  ]
}
```

`texts` tillkom efter `symbols` och `wires`. En fil sparad innan dess saknar
fältet och öppnas ändå — den läses då som ett schema utan textetiketter,
inte som ett fel.

Symbolernas id:n bevaras vid inläsning, eftersom ledningarnas `attach`
pekar på dem. Bindningar som pekar på en symbol filen inte innehåller
släpps tyst, och ledningen blir liggande där den är.

En fil som inte är giltig JSON, har fel `format`, eller är sparad i en
nyare `version` avvisas med ett meddelande i statusraden — ritningen lämnas
orörd i stället för att bli halvinläst.

## Ångra och gör om

`Ctrl+Z` ångrar, `Ctrl+Y` (eller `Ctrl+Shift+Z`) gör om. Samma sak finns som
knappar överst i sidopanelen.

Allt som ändrar ritningen går att ångra: placera, flytta, rotera, radera,
rita och ta bort ledningar, samt textändringar — både på plats och i
egenskapspanelen.

Ett helt drag blir **ett** steg att ångra, inte ett per musrörelse.
Detsamma gäller text: skriver man `K12` i ett svep ångras hela ordet, inte
tecken för tecken.

Står markören i ett textfält lämnas `Ctrl+Z` till webbläsarens egen
ångra-funktion, så man kan rätta det man skriver utan att rulla tillbaka
ritningen.

## Exportera

**SVG** och **PNG** exporterar ritningen som bild. Bilden beskärs till det
som faktiskt ritats — inte hela ritytan — med en liten marginal runtom.

Det som hör till redigeringen följer inte med: rutnätet, markeringsramar,
draghandtag, anslutningsmarkörer och ledningsförhandsvisningen städas bort
ur exporten. Det spelar alltså ingen roll om något är markerat när du
exporterar.

SVG:n är fristående — stilarna bäddas in i filen, så den ser likadan ut i
vilket program som helst. Den får också en vit botten; utan den blir
bakgrunden genomskinlig och det svarta linjeverket försvinner i visare med
mörkt tema. PNG:n renderas ur samma SVG i dubbel upplösning för skärpa.

## Teknisk uppbyggnad av en symbolfil

Varje SVG i `assets/symbols/` bär sin metadata som `data-`-attribut, så
filen är självbeskrivande och `js/symbol-library.js` slipper en separat
konfigurationsfil:

```svg
<svg viewBox="0 0 80 80"
     data-symbol-id="kontakt-no"          <!-- unikt id -->
     data-symbol-name="Kontakt NO"        <!-- visas i paletten -->
     data-designation-prefix="S"          <!-- prefix för autonumrering -->
     data-width="80" data-height="80"     <!-- storlek i world units -->
     data-designation-x="40"              <!-- var beteckningen placeras;  -->
     data-designation-y="10">             <!-- utelämnas för tilläggssymboler -->
  <g class="symbol-geometry"> … </g>      <!-- själva linjeverket -->
  <circle class="pin"
          data-pin-id="1"
          data-default-label="1"          <!-- förifyllt pinnamn -->
          data-label-dx="8"
          data-label-dy="-10"             <!-- etikettens läge rel. pinnen -->
          cx="0" cy="40" r="2.5" />
</svg>
```

En symbol utan `data-designation-x` och utan `.pin`-element behandlas som en
tilläggssymbol.

**Att lägga till en ny symbol:** skapa en SVG efter mallen ovan i
`assets/symbols/` och lägg till dess id i `SYMBOL_IDS`-listan i
`js/symbol-library.js`. Inget annat behöver ändras.
