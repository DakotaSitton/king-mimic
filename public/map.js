// === LEVEL MAP PANEL (left side) ============================================
// Owned by the map build. Renders the level's room nodes into #map and lets the
// party advance after clearing a room. Reads live state via window.KM.onState,
// sends actions via window.KM.send.
//
// Layout: each node has x,y in 0..1 (top = start, bottom = boss). We draw link
// lines in an SVG layer and absolutely-position node buttons over it. After a room
// is WON (and the level isn't complete) the node(s) linked from the current node
// become clickable to advance.
(function () {
  const el = document.getElementById("map");
  if (!el) return;

  // Build the persistent scaffold once: an SVG line layer + a node layer.
  const board = document.createElement("div");
  board.className = "map-board";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "map-lines");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("viewBox", "0 0 100 100");
  const nodeLayer = document.createElement("div");
  nodeLayer.className = "map-nodes";
  board.appendChild(svg);
  board.appendChild(nodeLayer);

  const note = document.createElement("div");
  note.className = "map-note";

  const banner = document.createElement("div");
  banner.className = "map-complete hidden";
  banner.textContent = "LEVEL COMPLETE";

  el.appendChild(banner);
  el.appendChild(board);
  el.appendChild(note);

  const TYPE_LABEL = { combat: "⚔", elite: "★", boss: "♛" };

  window.KM?.onState((state) => {
    const map = state && state.map;
    if (!map || !Array.isArray(map.nodes)) {
      board.classList.add("hidden");
      banner.classList.add("hidden");
      note.textContent = "Level map coming soon.";
      return;
    }
    board.classList.remove("hidden");

    const nodes = map.nodes;
    const byId = Object.create(null);
    for (const n of nodes) byId[n.id] = n;
    const current = byId[map.currentId];

    // Which nodes are reachable RIGHT NOW (room cleared, not yet complete)?
    const advanceable = new Set();
    if (state.phase === "won" && !map.levelComplete && current && Array.isArray(current.links)) {
      for (const id of current.links) if (byId[id]) advanceable.add(id);
    }

    // --- link lines ---
    svg.innerHTML = "";
    for (const n of nodes) {
      for (const toId of n.links || []) {
        const t = byId[toId];
        if (!t) continue;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", n.x * 100);
        line.setAttribute("y1", n.y * 100);
        line.setAttribute("x2", t.x * 100);
        line.setAttribute("y2", t.y * 100);
        let cls = "lnk";
        if (n.cleared && t.cleared) cls += " lnk-cleared";
        else if (n.id === map.currentId && advanceable.has(toId)) cls += " lnk-open";
        line.setAttribute("class", cls);
        svg.appendChild(line);
      }
    }

    // --- node buttons ---
    nodeLayer.innerHTML = "";
    for (const n of nodes) {
      const dot = document.createElement("button");
      dot.type = "button";
      let cls = "node node-" + (n.type || "combat");
      if (n.cleared) cls += " is-cleared";
      if (n.id === map.currentId) cls += " is-current";
      if (advanceable.has(n.id)) cls += " is-open";
      dot.className = cls;
      dot.style.left = (n.x * 100) + "%";
      dot.style.top = (n.y * 100) + "%";
      dot.textContent = TYPE_LABEL[n.type] || "⚔";
      dot.title = (n.type || "combat") + (n.cleared ? " (cleared)" : "");

      if (advanceable.has(n.id)) {
        dot.addEventListener("click", () => window.KM.send({ type: "advance", to: n.id }));
      } else {
        dot.disabled = true;
      }
      nodeLayer.appendChild(dot);
    }

    // --- status note + banner ---
    if (map.levelComplete) {
      banner.classList.remove("hidden");
      note.textContent = "";
    } else {
      banner.classList.add("hidden");
      if (advanceable.size) {
        note.textContent = advanceable.size > 1
          ? "Room cleared — choose your path."
          : "Room cleared — advance.";
      } else if (state.phase === "won") {
        note.textContent = "Room cleared.";
      } else if (state.phase === "lost") {
        note.textContent = "The caravan fell.";
      } else {
        note.textContent = "";
      }
    }
  });
})();
