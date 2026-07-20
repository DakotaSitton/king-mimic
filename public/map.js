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

  const banner = document.createElement("button");
  banner.type = "button";
  banner.className = "map-complete hidden";
  banner.textContent = "FLOOR CLEARED — DESCEND ▶";
  banner.addEventListener("click", () => window.KM.send({ type: "descend" }));

  el.appendChild(banner);
  el.appendChild(board);
  el.appendChild(note);

  // "elite" is the internal key for a DOUBLE FEATURE room (every player invites TWO foes)
  const TYPE_LABEL = { combat: "⚔", elite: "★", boss: "♛" };
  const TYPE_NAME = { combat: "combat", elite: "double feature — 2 invites each", boss: "boss" };

  // Group a node's pre-built roster (`contents`, one entry per foe) into "Name ×count (Lv L, ❤hp)"
  // rows — the WHAT'S-INSIDE preview (owner 2026-06-28). [] when the engine shipped no contents (an
  // older snapshot), so callers degrade to the ante-only display and never render undefined.
  function groupFoes(contents) {
    const groups = [], idx = Object.create(null);
    for (const f of contents || []) {
      const deck = Array.isArray(f.deck) ? f.deck : [];
      const sig = deck.map((d) => d.key + "x" + d.count).join(",");   // foes with different decks stay separate
      const key = (f.bodyKey || "") + "|" + f.level + "|" + f.maxHp + "|" + sig;
      let g = idx[key];
      if (!g) { g = idx[key] = { bodyKey: f.bodyKey, name: f.name || f.bodyKey || "foe", level: f.level, maxHp: f.maxHp, passive: f.passive ?? null, deck, count: 0 }; groups.push(g); }
      g.count++;
    }
    return groups;
  }
  // The phone map intentionally collapses builds that differ only by level/cards into body counts.
  function groupBodies(contents) {
    const groups = [], idx = Object.create(null);
    for (const f of contents || []) {
      const key = f.bodyKey || f.name || "foe";
      let g = idx[key];
      if (!g) { g = idx[key] = { bodyKey: f.bodyKey, name: f.name || f.bodyKey || "foe", count: 0 }; groups.push(g); }
      g.count++;
    }
    return groups;
  }
  // The map dot's native `title` tooltip (desktop hover): name/Lv/❤, the foe's PASSIVE, then its deck
  // cards WITH their descriptions (owner 2026-06-29) — the same detail the overlay's tap tooltip shows.
  const foeLine = (g) => g.name + (g.count > 1 ? " ×" + g.count : "") +
    " (" + (g.level != null ? "Lv" + g.level + ", " : "") + "❤" + (g.maxHp != null ? g.maxHp : "?") + ")" +
    (g.passive ? "\n      ✦ " + g.passive : "") +
    ((g.deck || []).length ? "\n" + g.deck.map((d) =>
      "      🃏 " + d.name + (d.count > 1 ? " ×" + d.count : "") + (d.text ? " — " + d.text : "")).join("\n") : "");

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
    const compactMobile = document.body.classList.contains("touch") && window.matchMedia("(max-width: 980px)").matches;
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
      // the run-seeded rotation lets the preview NAME the floor's boss (BOSS_SPEC_V1)
      const typeName = n.type === "boss" && map.bossName ? `boss — ${map.bossName}` : (TYPE_NAME[n.type] || n.type || "combat");
      // ROOM ANTE (owner 2026-06-27): each combat/elite node previews the threat you'll face. Elites
      // are double-ante. (Room enchants are retired — nodes carry an `ante` now, not an `enchant`.)
      const showAnte = !compactMobile && n.ante != null && (n.type === "combat" || n.type === "elite") && !n.cleared;
      const anteTip = showAnte ? `\n⚖ room ante ${n.ante}${n.type === "elite" ? " (double feature)" : ""}` : "";
      // elite ENTRY COST (owner 2026-06-27): show the spare-card price on every elite node; 🔒 only when
      // the party can't afford it yet.
      const costTip = !compactMobile && n.cost != null ? `\n◈ costs ${n.cost} spare card${n.cost === 1 ? "" : "s"} to enter${n.locked ? " — 🔒 can't afford yet" : ""}` : "";
      // WHAT'S INSIDE (owner 2026-06-28): the room's actual foe roster, on the tooltip for every
      // combat/elite room (and inline below the node for the ones you can advance into).
      const foeGroups = (n.type === "combat" || n.type === "elite") ? groupFoes(n.contents) : [];
      const mobileBodies = compactMobile ? groupBodies(n.contents) : [];
      const foeTipGroups = compactMobile ? mobileBodies : foeGroups;
      const foeTip = foeTipGroups.length ? "\n👹 Inside:\n  " + foeTipGroups.map(compactMobile
        ? (g) => g.name + (g.count > 1 ? " ×" + g.count : "") : foeLine).join("\n  ") : "";
      dot.title = typeName + (n.cleared ? " (cleared)" : "") + anteTip + costTip + foeTip;

      if (advanceable.has(n.id)) {
        dot.addEventListener("click", () => window.KM.send({ type: "advance", to: n.id }));
      } else {
        dot.disabled = true;
      }
      nodeLayer.appendChild(dot);

      // a small ⚖N badge beside the node so the threat preview reads off the map too (the buttons
      // carry it on a phone where the map is off-screen). Elite badges run gold/bold.
      if (showAnte) {
        const lab = document.createElement("span");
        lab.className = "map-ante" + (n.type === "elite" ? " elite" : "");
        lab.style.left = (n.x * 100) + "%";
        lab.style.top = (n.y * 100) + "%";
        lab.textContent = "⚖" + n.ante;
        nodeLayer.appendChild(lab);
      }

      // a compact WHAT'S-INSIDE chip on the rooms you can advance into right now — so the next-room
      // roster reads off the map without hovering. (Far/cleared rooms keep it to the tooltip to avoid
      // cluttering the whole graph.) Degrades to nothing when the snapshot carries no contents.
      if (!compactMobile && advanceable.has(n.id) && foeGroups.length) {
        const fl = document.createElement("span");
        fl.className = "map-foes";
        fl.style.left = (n.x * 100) + "%";
        fl.style.top = (n.y * 100) + "%";
        fl.textContent = foeGroups.map((g) => g.name + (g.count > 1 ? "×" + g.count : "")).join(", ");   // FULL foe names (owner 2026-06-29: "Atlas, Shrugging", not "Atlas")
        nodeLayer.appendChild(fl);
      }

      // Mobile between-room map: keep the complete floor topology, but label every fight only with
      // the bodies inside it. Cards/items, passives, HP, ante, and loot stay off this compact map.
      if (compactMobile && mobileBodies.length) {
        const roster = document.createElement("span");
        roster.className = "map-bodies" + (n.cleared ? " is-cleared" : "");
        roster.style.left = (n.x * 100) + "%";
        roster.style.top = (n.y * 100) + "%";
        roster.setAttribute("aria-label", mobileBodies.map((g) => g.name + (g.count > 1 ? ` times ${g.count}` : "")).join(", "));
        roster.innerHTML = mobileBodies.map((g) => `<span class="map-body" title="${g.name}">${window.KM.bodyIconHtml?.(g.bodyKey) || ""}${g.count > 1 ? `<b>×${g.count}</b>` : ""}</span>`).join("");
        nodeLayer.appendChild(roster);
      } else if (compactMobile && n.type === "boss") {
        const bossName = document.createElement("span");
        bossName.className = "map-boss-name";
        bossName.style.left = (n.x * 100) + "%";
        bossName.style.top = (n.y * 100) + "%";
        bossName.textContent = map.bossName || "Boss";
        nodeLayer.appendChild(bossName);
      }
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
