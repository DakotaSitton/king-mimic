// === LEVEL MAP PANEL (left side) ============================================
// Owned by the map build. Renders the level's room nodes into #map and lets the
// party advance after clearing a room. Reads live state via window.KM.onState,
// sends actions via window.KM.send.
//
// Layout: each node has x,y in 0..1 (top = start, bottom = boss). The map is a clean
// icon grid: path connectors are intentionally omitted. Every node opens perfect-info
// inspection; actual room entry remains on the three large room cards.
(function () {
  const el = document.getElementById("map");
  if (!el) return;
  const panelClose = document.getElementById("mapPanelClose");

  // Build the persistent scaffold once: icon nodes plus an in-panel detail sheet.
  const board = document.createElement("div");
  board.className = "map-board";
  const nodeLayer = document.createElement("div");
  nodeLayer.className = "map-nodes";
  board.appendChild(nodeLayer);

  const inspector = document.createElement("section");
  inspector.className = "map-inspector hidden";
  inspector.setAttribute("role", "dialog");
  inspector.setAttribute("aria-modal", "false");
  inspector.setAttribute("aria-live", "polite");

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
  el.appendChild(inspector);

  // "elite" is the internal key for a DOUBLE FEATURE room (every player invites TWO foes)
  const TYPE_LABEL = { combat: "⚔", elite: "★", boss: "♛" };
  const TYPE_NAME = { combat: "combat", elite: "double feature — 2 invites each", boss: "boss" };
  const esc = (s) => String(s ?? "").replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  let selectedId = null, inspectorSig = "", nodeSig = "";
  let latestState = null, latestMap = null, latestById = Object.create(null), latestAdvanceable = new Set();

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
  // The map dot's native `title` tooltip (desktop hover): name/Lv/❤, the foe's PASSIVE, then its deck
  // cards WITH their descriptions (owner 2026-06-29) — the same detail the overlay's tap tooltip shows.
  const foeLine = (g) => g.name + (g.count > 1 ? " ×" + g.count : "") +
    " (" + (g.level != null ? "Lv" + g.level + ", " : "") + "❤" + (g.maxHp != null ? g.maxHp : "?") + ")" +
    (g.passive ? "\n      ✦ " + g.passive : "") +
    ((g.deck || []).length ? "\n" + g.deck.map((d) =>
      "      🃏 " + d.name + (d.count > 1 ? " ×" + d.count : "") + (d.text ? " — " + d.text : "")).join("\n") : "");

  function inspectorHtml(n, map, state, reachable) {
    const status = [n.id === map.currentId ? "CURRENT" : "", n.cleared ? "CLEARED" : "",
      reachable ? "AVAILABLE NOW" : ""].filter(Boolean);
    const statusHtml = status.map((s) => `<span>${s}</span>`).join("");
    const head = `<header><div><small>${esc(n.type === "boss" ? "BOSS" : n.type === "start" ? "TRAILHEAD" : "ROOM INTEL")}</small>` +
      `<h3>${esc(n.type === "boss" ? (map.bossName || "Boss") : n.type === "start" ? "Trailhead" : n.type === "combat" ? "Fight" : (TYPE_NAME[n.type] || "Combat room"))}</h3></div>` +
      `<button type="button" data-map-close="1" aria-label="Back to full map">← MAP</button></header>` +
      (statusHtml ? `<div class="map-inspector-status">${statusHtml}</div>` : "");

    if (n.type === "start") return head + `<p class="map-inspector-note">Your current floor began here. Tap any fight icon to inspect its complete known roster.</p>`;

    if (n.type === "boss") {
      const boss = map.bossPreview || {};
      const cards = (boss.cards || []).map((card) => `<div class="map-inspector-card"><b>${esc(card.name)}</b><span>${esc(card.intent)}</span></div>`).join("");
      return head + `<div class="map-inspector-boss">${window.KM.bodyIconHtml?.(boss.bodyKey) || ""}` +
        `<div><b>❤${esc(boss.maxHp ?? "?")}</b><span>${esc((state.floor || 1) >= 4 ? "Throne fight" : `Floor ${state.floor || 1} boss`)}</span></div></div>` +
        (boss.passive ? `<p class="map-inspector-passive">✦ ${esc(boss.passive)}</p>` : "") +
        `<div class="map-inspector-reward">◈ ${esc(boss.rareLoot ?? "?")} guaranteed rare card${boss.rareLoot === 1 ? "" : "s"}</div>` +
        (boss.deckCadence ? `<p class="map-inspector-note">One active action · next draw every ${Number(boss.deckCadence).toFixed(1)}s</p>` : "") +
        `<div class="map-inspector-cards">${cards || `<span class="map-inspector-note">Boss actions unavailable.</span>`}</div>`;
    }

    const groups = groupFoes(n.contents);
    const loot = n.loot != null ? `<div class="map-inspector-reward">◈${esc(n.loot)} possible loot</div>` : "";
    const dropRule = n.randomCommonLoot != null
      ? `<p class="map-inspector-note">Every carried card shown below can drop, plus ${esc(n.randomCommonLoot)} random common card${n.randomCommonLoot === 1 ? "" : "s"}.</p>` : "";
    const foes = groups.map((g) => {
      const deck = (g.deck || []).map((d) => `<div class="map-inspector-card"><b>${d.cost != null ? `⚡${esc(d.cost)} ` : ""}${esc(d.name)}${d.count > 1 ? ` ×${esc(d.count)}` : ""}</b>` +
        (d.text ? `<span>${esc(d.text)}</span>` : "") + `</div>`).join("");
      return `<article class="map-inspector-foe"><div class="map-inspector-foehead">${window.KM.bodyIconHtml?.(g.bodyKey) || ""}` +
        `<div><b>${esc(g.name)}${g.count > 1 ? ` ×${esc(g.count)}` : ""}</b><span>${g.level != null ? `Lv${esc(g.level)} · ` : ""}❤${esc(g.maxHp ?? "?")}</span></div></div>` +
        (g.passive ? `<p class="map-inspector-passive">✦ ${esc(g.passive)}</p>` : "") +
        `<div class="map-inspector-cards">${deck || `<span class="map-inspector-note">— no carried cards —</span>`}</div></article>`;
    }).join("");
    return head + `<div class="map-inspector-meta"><span>⚖${esc(n.ante ?? "?")} threat</span>${loot}</div>${dropRule}` +
      `<div class="map-inspector-foes">${foes || `<p class="map-inspector-note">Roster unavailable.</p>`}</div>` +
      (reachable ? `<p class="map-inspector-enter">Enter from the large room card →</p>` : "");
  }

  function showInspector(n, map, state, reachable) {
    selectedId = n.id;
    const sig = JSON.stringify([n, map.bossPreview, state.floor, reachable]);
    if (sig !== inspectorSig) {
      inspectorSig = sig;
      inspector.innerHTML = inspectorHtml(n, map, state, reachable);
      inspector.scrollTop = 0;
    }
    board.classList.add("is-inspecting");
    inspector.classList.remove("hidden");
    inspector.setAttribute("aria-label", `Room details: ${n.type === "boss" ? map.bossName || "Boss" : TYPE_NAME[n.type] || n.type}`);
    nodeLayer.querySelectorAll(".node").forEach((node) => {
      const selected = node.dataset.nodeId === selectedId;
      node.classList.toggle("is-selected", selected);
      node.setAttribute("aria-pressed", String(selected));
    });
  }

  function closeInspector() {
    selectedId = null; inspectorSig = "";
    board.classList.remove("is-inspecting");
    inspector.classList.add("hidden");
    inspector.innerHTML = "";
    nodeLayer.querySelectorAll(".node.is-selected").forEach((node) => node.classList.remove("is-selected"));
  }
  function closePanel() {
    document.body.classList.remove("map-panel-open");
    el.removeAttribute("role");
    el.removeAttribute("aria-modal");
    closeInspector();
  }
  function openPanel() {
    closeInspector();
    document.body.classList.add("map-panel-open");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    panelClose?.focus();
  }
  window.KM.openLevelMap = openPanel;
  panelClose?.addEventListener("click", closePanel);
  inspector.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-map-close]")) closeInspector();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (selectedId) closeInspector();
    else if (document.body.classList.contains("map-panel-open")) closePanel();
  });

  // Resolve inspection against the newest authoritative snapshot. Buttons stay mounted across
  // ordinary live-state refreshes, so a finger can press and release the same DOM target.
  function inspectNode(id) {
    const node = latestById[id];
    if (node && latestMap && latestState) {
      showInspector(node, latestMap, latestState, latestAdvanceable.has(id));
    }
  }

  window.KM?.onState((state) => {
    if (state?.phase !== "won" && document.body.classList.contains("map-panel-open")) closePanel();
    const map = state && state.map;
    if (!map || !Array.isArray(map.nodes)) {
      nodeSig = "";
      latestState = null;
      latestMap = null;
      latestById = Object.create(null);
      latestAdvanceable = new Set();
      closeInspector();
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
    latestState = state;
    latestMap = map;
    latestById = byId;
    latestAdvanceable = advanceable;

    // KMDelta mutates state in place, so use a structural signature. Rebuilding an unchanged map
    // detaches the pressed element before touchend and makes a normal mobile tap disappear.
    const nextNodeSig = JSON.stringify([compactMobile, state.phase, map]);
    if (nextNodeSig !== nodeSig) {
      nodeSig = nextNodeSig;
      nodeLayer.innerHTML = "";
      for (const n of nodes) {
      const dot = document.createElement("button");
      dot.type = "button";
      let cls = "node node-" + (n.type || "combat");
      if (n.cleared) cls += " is-cleared";
      if (n.id === map.currentId) cls += " is-current";
      if (advanceable.has(n.id)) cls += " is-open";
      dot.className = cls;
      dot.dataset.nodeId = n.id;
      dot.style.left = (n.x * 100) + "%";
      dot.style.top = (n.y * 100) + "%";
      dot.textContent = TYPE_LABEL[n.type] || "⚔";
      if (compactMobile && n.type === "boss" && map.bossPreview?.bodyKey) {
        dot.classList.add("has-body-art");
        dot.innerHTML = window.KM.bodyIconHtml?.(map.bossPreview.bodyKey) || "♛";
      }
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
      const mobileFoes = compactMobile && Array.isArray(n.contents) ? n.contents : [];
      const foeTipGroups = compactMobile ? mobileFoes : foeGroups;
      const foeTip = foeTipGroups.length ? "\n👹 Inside:\n  " + foeTipGroups.map(compactMobile
        ? (f) => `${f.name || f.bodyKey || "foe"}${f.level != null ? ` (Lv${f.level})` : ""}` : foeLine).join("\n  ") : "";
      dot.title = typeName + (n.cleared ? " (cleared)" : "") + anteTip + costTip + foeTip;

      // Map taps are inspection-only. The large right-side cards remain the deliberate room-entry
      // targets, preventing a curiosity tap on a tiny future icon from committing the run's path.
      dot.setAttribute("aria-label", `Inspect ${typeName}`);
      dot.setAttribute("aria-pressed", String(selectedId === n.id));
      dot.addEventListener("click", () => inspectNode(n.id));
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
      if (compactMobile && mobileFoes.length) {
        const roster = document.createElement("span");
        roster.className = "map-bodies" + (n.cleared ? " is-cleared" : "");
        roster.style.left = (n.x * 100) + "%";
        roster.style.top = (n.y * 100) + "%";
        roster.setAttribute("aria-label", mobileFoes.map((f) => `${f.name || f.bodyKey || "foe"}${f.level != null ? ` level ${f.level}` : ""}`).join(", "));
        roster.innerHTML = mobileFoes.map((f) => `<span class="map-body" title="${esc(f.name || f.bodyKey || "foe")}">${window.KM.bodyIconHtml?.(f.bodyKey) || ""}<small>${f.level != null ? `Lv${esc(f.level)}` : "Lv?"}</small></span>`).join("");
        nodeLayer.appendChild(roster);
      }
      }
    }

    // Preserve an open inspector across ordinary snapshot refreshes, but always re-read the latest
    // authoritative node rather than holding a stale object from an earlier snapshot.
    if (selectedId) {
      const selected = byId[selectedId];
      if (selected) showInspector(selected, map, state, advanceable.has(selected.id));
      else closeInspector();
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
