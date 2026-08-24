# Vägledning – symboler och namngivning

Den här mappen är **källan** för symbolbiblioteket. Filerna som appen laddar
vid körning ligger i `assets/symbols/`.

- `Symboler-vägledning.svg` — originalritningen (draw.io/diagrams.net-export).
  Det är härifrån symbolernas geometri är hämtad.
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

> **Not:** originalritningen stavar nr 5 "Säring" — tolkat som en felstavning
> av "Säkring".

## Tilläggssymboler (6, 7, 8)

Nr 6, 7 och 8 är i originalritningen markerade som **"tillägg på kontakt"**.
De är manöverdon, inte egna komponenter: de placeras *ovanpå* en
kontaktsymbol (1–4) för att visa hur kontakten manövreras.

Därför har de medvetet:
- **inga anslutningspunkter** — kontakten under bär anslutningarna
- **ingen egen beteckning** — beteckningen hör till kontakten

Symbolerna är ritade i samma koordinatsystem som kontakterna, så en
tilläggssymbol placerad på samma rutnätspunkt som en kontakt hamnar i rätt
läge i sidled. Höjdläget behöver däremot justeras för hand — se nästa
avsnitt. Tillägget och kontakten är inte heller sammankopplade i
datamodellen: flyttar du kontakten följer tillägget inte med.

### Justerbar mekanisk förbindelse

Den lodräta stammen från manöverdonet är den mekaniska förbindelsen till
kontakten (streckad på nr 6 och 8, heldragen med låshake på nr 7).

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
| `B` | Givare och övervakning |
| `P` | Signal- och indikeringsdon (lampor) |
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
roteras 90/180/270°.

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
