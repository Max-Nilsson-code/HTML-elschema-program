// Markering: klick (+ shift för att lägga till/ta bort), gummiband för
// flera, samt drag-flytt av hela markeringen. Tangentbord: Delete/Backspace
// (radera), R (rotera 90°), Ctrl/Cmd+D (duplicera), Escape (avmarkera).
// Se ROADMAP.md, Fas 3.

const SVG_NS = "http://www.w3.org/2000/svg";

export function initSelection(svg, canvasApi, symbolsApi) {
  const overlayLayer = document.createElementNS(SVG_NS, "g");
  overlayLayer.setAttribute("id", "selection-layer");
  svg.appendChild(overlayLayer);

  const selected = new Set();
  let dragState = null;

  function setSelection(ids) {
    selected.clear();
    for (const id of ids) selected.add(id);
    updateSelectionVisuals();
  }

  function clearSelection() {
    if (selected.size === 0) return;
    selected.clear();
    updateSelectionVisuals();
  }

  function toggleSelection(id) {
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    updateSelectionVisuals();
  }

  function updateSelectionVisuals() {
    Array.from(overlayLayer.children).forEach((el) => {
      if (!el.classList.contains("rubber-band")) el.remove();
    });
    symbolsApi.setSelectedIds(Array.from(selected));
    for (const id of selected) {
      const instance = symbolsApi.getInstance(id);
      if (!instance) continue;
      const b = symbolsApi.getInstanceBounds(instance);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("class", "selection-outline");
      rect.setAttribute("x", b.x - 6);
      rect.setAttribute("y", b.y - 6);
      rect.setAttribute("width", b.width + 12);
      rect.setAttribute("height", b.height + 12);
      overlayLayer.appendChild(rect);
    }
  }

  svg.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (canvasApi.isSpaceHeld() || canvasApi.isPanning()) return; // panorering äger klicket

    const world = canvasApi.screenToWorld(event.clientX, event.clientY);

    // Draghandtaget för den mekaniska förbindelsen har företräde framför
    // vanlig markering/flytt — annars går det inte att greppa.
    if (event.target.classList?.contains("stem-handle")) {
      dragState = { mode: "stem", instanceId: event.target.dataset.instanceId };
      return;
    }

    const hit = symbolsApi.hitTestPoint(world.x, world.y);

    if (hit) {
      if (event.shiftKey) {
        toggleSelection(hit.id);
      } else if (!selected.has(hit.id)) {
        setSelection([hit.id]);
      }
      dragState = { mode: "move", lastWorld: world, moved: false };
    } else {
      if (!event.shiftKey) clearSelection();
      const rectEl = document.createElementNS(SVG_NS, "rect");
      rectEl.setAttribute("class", "rubber-band");
      overlayLayer.appendChild(rectEl);
      dragState = { mode: "rubber", startWorld: world, rectEl };
    }
  });

  window.addEventListener("mousemove", (event) => {
    if (!dragState) return;
    const world = canvasApi.screenToWorld(event.clientX, event.clientY);

    if (dragState.mode === "stem") {
      symbolsApi.setStemFromWorld(dragState.instanceId, world.x, world.y);
      updateSelectionVisuals();
    } else if (dragState.mode === "move") {
      const dx = world.x - dragState.lastWorld.x;
      const dy = world.y - dragState.lastWorld.y;
      if (dx !== 0 || dy !== 0) {
        symbolsApi.moveInstances(Array.from(selected), dx, dy);
        dragState.lastWorld = world;
        dragState.moved = true;
        updateSelectionVisuals();
      }
    } else if (dragState.mode === "rubber") {
      const b = normalizeRect(dragState.startWorld, world);
      dragState.rectEl.setAttribute("x", b.x);
      dragState.rectEl.setAttribute("y", b.y);
      dragState.rectEl.setAttribute("width", b.width);
      dragState.rectEl.setAttribute("height", b.height);
      dragState.currentBounds = b;
    }
  });

  /** Avbryter ett pågående drag och städar bort gummibandet. */
  function cancelDrag() {
    if (!dragState) return;
    if (dragState.mode === "rubber") dragState.rectEl.remove();
    dragState = null;
  }

  window.addEventListener("mouseup", () => {
    if (!dragState) return;

    if (dragState.mode === "move") {
      if (dragState.moved) {
        symbolsApi.snapInstances(Array.from(selected));
        updateSelectionVisuals();
      }
    } else if (dragState.mode === "rubber") {
      dragState.rectEl.remove();
      if (dragState.currentBounds) {
        const hits = symbolsApi
          .getAllInstances()
          .filter((inst) => rectsIntersect(dragState.currentBounds, symbolsApi.getInstanceBounds(inst)));
        setSelection(hits.map((inst) => inst.id));
      }
    }

    dragState = null;
  });

  window.addEventListener("keydown", (event) => {
    // Rör inte tangentbordsgenvägar när användaren skriver i ett textfält
    // (relevant från Fas 5 och framåt, ofarligt att ha med redan nu).
    const tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || event.target.isContentEditable) return;

    // Inte mitt i ett pågående drag: att t.ex. rotera medan stammen dras
    // flyttar handtaget bort under muspekaren och resten av draget styr då
    // fel led. Escape är undantaget — det avbryter draget.
    if (dragState) {
      if (event.key === "Escape") cancelDrag();
      return;
    }

    if ((event.key === "Delete" || event.key === "Backspace") && selected.size > 0) {
      event.preventDefault();
      symbolsApi.removeInstances(Array.from(selected));
      clearSelection();
    } else if (event.key.toLowerCase() === "r" && selected.size > 0) {
      symbolsApi.rotateInstances(Array.from(selected), 90);
      updateSelectionVisuals();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && selected.size > 0) {
      event.preventDefault();
      const copies = symbolsApi.duplicateInstances(Array.from(selected));
      setSelection(copies.map((c) => c.id));
    } else if (event.key === "Escape") {
      clearSelection();
    }
  });

  return {
    getSelectedIds: () => Array.from(selected),
    setSelection,
    clearSelection,
  };
}

function normalizeRect(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
