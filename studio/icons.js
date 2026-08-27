// Ikoner som inline-SVG.
//
// Studio hade från början en ikonfont från unpkg.com. Den togs bort: appen
// ligger som statiska filer på GitHub Pages och ska fungera utan nätverk,
// och zoom- och ångra-knapparna är rena ikonknappar — går fonten inte att
// hämta blir de helt tomma rutor utan att något syns vara fel.
//
// Ikonerna ritas därför här, i samma stil som resten av ritningen: 24×24,
// enbart konturer, `currentColor` så CSS styr färgen och `1em` så
// `font-size` styr storleken precis som den gjorde för fonten.

const SVG_NS = "http://www.w3.org/2000/svg";

/** Inre markup per ikon. Nycklarna används som `data-icon`-värden. */
const ICONS = {
  // Topprad
  krets: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 7V3M14 7V3M10 21v-4M14 21v-4M7 10H3M7 14H3M21 10h-4M21 14h-4"/>',
  nytt: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 12v5M9.5 14.5h5"/>',
  oppna: '<path d="M3 8V6a1 1 0 0 1 1-1h5l2 2h6a1 1 0 0 1 1 1v1"/><path d="M3 8h17.2a1 1 0 0 1 .96 1.28l-2.2 8A1 1 0 0 1 18 18H5a2 2 0 0 1-2-2z"/>',
  spara: '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 3v6h7V3"/><rect x="7" y="13" width="10" height="7" rx="1"/>',
  vektor: '<path d="M5 9v6M19 9v6M9 5h6M9 19h6"/><rect x="3" y="3" width="4" height="4" rx="1"/><rect x="17" y="3" width="4" height="4" rx="1"/><rect x="3" y="17" width="4" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/>',
  bild: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M20.5 16.5l-5-5-6 6-2-2-4 4"/>',
  angra: '<path d="M3 8h9a6 6 0 0 1 0 12H7"/><path d="M7 4L3 8l4 4"/>',
  gorom: '<path d="M21 8h-9a6 6 0 0 0 0 12h5"/><path d="M17 4l4 4-4 4"/>',
  tangentbord: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 13.5h.01M18 13.5h.01M8.5 15h7"/>',

  // Zoomkontroller
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  anpassa: '<path d="M9 3H3v6M15 3h6v6M15 21h6v-6M9 21H3v-6"/>',

  // Verktyg
  markera: '<path d="M5 3l6.5 17 2.5-7 7-2.5z"/>',
  ledning: '<path d="M6.9 17.1l10.2-10.2"/><circle cx="18.5" cy="5.5" r="2"/><circle cx="5.5" cy="18.5" r="2"/>',
  streckad: '<path d="M6.9 17.1l10.2-10.2" stroke-dasharray="3 2.6"/><circle cx="18.5" cy="5.5" r="2"/><circle cx="5.5" cy="18.5" r="2"/>',
  text: '<path d="M5 5h14M12 5v14M9 19h6"/>',
};

/**
 * Bygger ikonen som ett fristående `<svg>`. Ritas i currentColor och 1em, så
 * knappens egen `color` och `font-size` styr utseendet.
 */
export function iconElement(name) {
  const markup = ICONS[name];
  if (!markup) throw new Error(`Okänd ikon: ${name}`);

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "1em");
  svg.setAttribute("height", "1em");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  // DOMParser i stället för innerHTML: markupen ska tolkas i SVG-namnrymden
  // oavsett webbläsare, annars blir elementen tomma HTML-taggar som inte
  // ritar något.
  const parsed = new DOMParser().parseFromString(
    `<svg xmlns="${SVG_NS}">${markup}</svg>`,
    "image/svg+xml"
  );
  for (const child of Array.from(parsed.documentElement.childNodes)) {
    svg.appendChild(document.importNode(child, true));
  }
  return svg;
}

/** Fyller alla `<span data-icon="…">` i ett träd med sin ikon. */
export function hydrateIcons(root = document) {
  for (const holder of root.querySelectorAll("[data-icon]")) {
    holder.replaceChildren(iconElement(holder.dataset.icon));
  }
}
