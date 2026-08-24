// Delat verktygsläge. Paletten, ledningsverktyget och markeringen behöver
// alla veta vad som är aktivt för att hålla sig ur vägen för varandra —
// men ska inte känna till varandra. Därför bor läget här.

export const TOOL_SELECT = "select";
export const TOOL_WIRE = "wire";
const PLACE_PREFIX = "place:";

export const placeTool = (symbolTypeId) => `${PLACE_PREFIX}${symbolTypeId}`;

export function initTools(svg) {
  let current = TOOL_SELECT;
  const listeners = new Set();

  function set(tool) {
    if (current === tool) return;
    current = tool;
    svg.classList.toggle("placing", current.startsWith(PLACE_PREFIX));
    svg.classList.toggle("wiring", current === TOOL_WIRE);
    for (const fn of listeners) fn(current);
  }

  return {
    get: () => current,
    set,
    reset: () => set(TOOL_SELECT),
    onChange: (fn) => listeners.add(fn),
    isSelect: () => current === TOOL_SELECT,
    isWire: () => current === TOOL_WIRE,
    /** Symboltypen som ska placeras, eller null om placeringsläge inte är aktivt. */
    placingTypeId: () =>
      current.startsWith(PLACE_PREFIX) ? current.slice(PLACE_PREFIX.length) : null,
  };
}
