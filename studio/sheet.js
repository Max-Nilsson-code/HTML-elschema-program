// Ritark: ett pappersark (A5/A4/A3, stående/liggande) som ritas under
// rutnätet. Rent visuell referensram — skala 2 world-enheter per mm.
const SVG_NS = "http://www.w3.org/2000/svg";
const MM = 2;

const SIZES = {
  a3: { w: 420, h: 297, label: "A3" },
  a4: { w: 297, h: 210, label: "A4" },
  a5: { w: 210, h: 148, label: "A5" },
};

export function initSheet(svg) {
  const layer = document.createElementNS(SVG_NS, "g");
  layer.setAttribute("id", "sheet-layer");
  // Under rutnätet: pappret är botten, rutnätslinjerna ritas ovanpå.
  const gridRect = svg.querySelector("#grid-background");
  svg.insertBefore(layer, gridRect);

  let state = { size: "a4", orientation: "liggande", visible: true };
  const listeners = new Set();

  function dims() {
    const s = SIZES[state.size];
    const landscape = state.orientation === "liggande";
    const wmm = landscape ? Math.max(s.w, s.h) : Math.min(s.w, s.h);
    const hmm = landscape ? Math.min(s.w, s.h) : Math.max(s.w, s.h);
    return { w: wmm * MM, h: hmm * MM, wmm, hmm, label: s.label };
  }

  function render() {
    layer.replaceChildren();
    if (!state.visible) return;
    const d = dims();

    const paper = document.createElementNS(SVG_NS, "rect");
    paper.setAttribute("class", "sheet-paper");
    paper.setAttribute("x", 0);
    paper.setAttribute("y", 0);
    paper.setAttribute("width", d.w);
    paper.setAttribute("height", d.h);
    layer.appendChild(paper);

    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("class", "sheet-label");
    label.setAttribute("x", 0);
    label.setAttribute("y", d.h + 18);
    label.textContent = `${d.label} ${state.orientation} · ${d.wmm} × ${d.hmm} mm`;
    layer.appendChild(label);
  }

  function set(partial) {
    state = { ...state, ...partial };
    render();
    for (const fn of listeners) fn(state);
  }

  function worldRect() {
    const d = dims();
    return { x: 0, y: 0, width: d.w, height: d.h };
  }

  render();

  return {
    get: () => ({ ...state }),
    set,
    worldRect,
    onChange: (fn) => listeners.add(fn),
  };
}
