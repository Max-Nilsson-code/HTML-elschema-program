// Markering och manipulation, gemensam för symboler och ledningar.
//
// Modulen känner inte till någon objekttyp: varje modul som har markerbara
// objekt (symbols.js, wires.js) lämnar in en "provider" med ett litet
// gemensamt gränssnitt, och markeringen slår upp rätt provider via id.
// Det gör att klick, gummiband, flytt, Delete och Escape fungerar likadant
// för allt utan att logiken dupliceras.
//
// Provider-gränssnitt:
//   owns(id), getAll(), getBounds(obj), hitTestPoint(x,y),
//   move(ids,dx,dy), snap(ids), remove(ids), setSelectedIds(ids),
//   rotate?(ids,deg), duplicate?(ids), startHandleDrag?(event) -> {move,end}|null

const SVG_NS = "http://www.w3.org/2000/svg";

export function initSelection(svg, canvasApi, providers, tools) {
  const overlayLayer = document.createElementNS(SVG_NS, "g");
  overlayLayer.setAttribute("id", "selection-layer");
  svg.appendChild(overlayLayer);

  const selected = new Set();
  let dragState = null;

  // Prenumeranter på markeringen — egenskapspanelen (inspector.js) speglar
  // vad som är markerat.
  const changeListeners = new Set();

  const providerOf = (id) => providers.find((p) => p.owns(id));

  /** Grupperar markerade id:n per provider, så varje anrop går till rätt ägare. */
  function byProvider(ids) {
    return providers
      .map((provider) => ({ provider, ids: ids.filter((id) => provider.owns(id)) }))
      .filter((entry) => entry.ids.length > 0);
  }

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
    for (const fn of changeListeners) fn(Array.from(selected));
    Array.from(overlayLayer.children).forEach((el) => {
      if (!el.classList.contains("rubber-band")) el.remove();
    });

    const ids = Array.from(selected);
    // Alla providers måste få veta, även de utan markerade objekt — annars
    // ligger en tidigare markering kvar visuellt hos den andra typen.
    for (const provider of providers) {
      provider.setSelectedIds(ids.filter((id) => provider.owns(id)));
    }

    for (const id of ids) {
      const provider = providerOf(id);
      if (!provider) continue;
      const obj = provider.getAll().find((o) => o.id === id);
      if (!obj) continue;
      const b = provider.getBounds(obj);
      const rect = document.createElementNS(SVG_NS, "rect");
      rect.setAttribute("class", "selection-outline");
      rect.setAttribute("x", b.x - 6);
      rect.setAttribute("y", b.y - 6);
      rect.setAttribute("width", b.width + 12);
      rect.setAttribute("height", b.height + 12);
      overlayLayer.appendChild(rect);
    }
  }

  /** Träff längst fram: providers testas i omvänd ordning (ledningar under symboler). */
  function hitTest(worldX, worldY) {
    for (let i = providers.length - 1; i >= 0; i--) {
      const hit = providers[i].hitTestPoint(worldX, worldY);
      if (hit) return hit;
    }
    return null;
  }

  svg.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (!tools.isSelect()) return; // annat verktyg äger klicket
    if (canvasApi.isSpaceHeld() || canvasApi.isPanning()) return; // panorering äger klicket

    const world = canvasApi.screenToWorld(event.clientX, event.clientY);

    // Draghandtag (stammens fria ände, ledningarnas ändpunkter) har företräde
    // framför vanlig markering/flytt — annars går de inte att greppa.
    for (const provider of providers) {
      const handle = provider.startHandleDrag?.(event);
      if (handle) {
        dragState = { mode: "handle", handle };
        return;
      }
    }

    const hit = hitTest(world.x, world.y);

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

    if (dragState.mode === "handle") {
      dragState.handle.move(world);
      updateSelectionVisuals();
    } else if (dragState.mode === "move") {
      const dx = world.x - dragState.lastWorld.x;
      const dy = world.y - dragState.lastWorld.y;
      if (dx !== 0 || dy !== 0) {
        for (const { provider, ids } of byProvider(Array.from(selected))) {
          provider.move(ids, dx, dy);
        }
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

    if (dragState.mode === "handle") {
      dragState.handle.end();
    } else if (dragState.mode === "move") {
      if (dragState.moved) {
        for (const { provider, ids } of byProvider(Array.from(selected))) provider.snap(ids);
        updateSelectionVisuals();
      }
    } else if (dragState.mode === "rubber") {
      dragState.rectEl.remove();
      if (dragState.currentBounds) {
        const hits = [];
        for (const provider of providers) {
          for (const obj of provider.getAll()) {
            if (rectsIntersect(dragState.currentBounds, provider.getBounds(obj))) hits.push(obj.id);
          }
        }
        setSelection(hits);
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

    if (!tools.isSelect()) return;
    const ids = Array.from(selected);

    if ((event.key === "Delete" || event.key === "Backspace") && ids.length > 0) {
      event.preventDefault();
      for (const { provider, ids: own } of byProvider(ids)) provider.remove(own);
      clearSelection();
    } else if (event.key.toLowerCase() === "r" && ids.length > 0) {
      for (const { provider, ids: own } of byProvider(ids)) provider.rotate?.(own, 90);
      updateSelectionVisuals();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && ids.length > 0) {
      event.preventDefault();
      const copies = [];
      for (const { provider, ids: own } of byProvider(ids)) {
        for (const copy of provider.duplicate?.(own) ?? []) copies.push(copy.id);
      }
      if (copies.length > 0) setSelection(copies);
    } else if (event.key === "Escape") {
      clearSelection();
    }
  });

  // Byte av verktyg ska inte lämna kvar en markering som Delete kan råka på.
  tools.onChange(() => {
    if (!tools.isSelect()) clearSelection();
  });

  return {
    getSelectedIds: () => Array.from(selected),
    setSelection,
    clearSelection,
    /** Anropas med de markerade id:na varje gång markeringen ändras. */
    onChange: (fn) => changeListeners.add(fn),
    /** Ritar om markeringsramarna, t.ex. när ett objekt ändrat storlek. */
    refresh: updateSelectionVisuals,
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
