// === INVENTORY PANEL (right side) ===========================================
// Owned by the inventory build. Renders the local player's BODY + equipment into
// #inventory. Reads live state via the panel bridge:
//   window.KM.onState((state, you) => { ... })  -- fires ~10x/sec (10 ticks = 1s).
//
// Layout:
//   [BODY card]  current body name, hp/maxHp bar, # of unlocked bodies
//   [item 1..N]  slot number (maps to 1-3 number keys), name, effect text,
//                and a live cooldown bar that fills charge -> cd, showing the
//                remaining seconds while charging and a GOLD "READY" when usable.
//
// We build a stable DOM once and then only mutate text/widths/classes each tick
// so there is no flicker and no per-tick garbage. Structure is rebuilt only when
// the set of items actually changes (count or keys).
(function () {
  const el = document.getElementById("inventory");
  if (!el) return;

  // ---- root containers (created once) -------------------------------------
  const bodyCard = document.createElement("div");
  bodyCard.className = "inv-body";
  bodyCard.innerHTML =
    '<div class="inv-body-name"></div>' +
    '<div class="inv-body-stats"></div>' +
    '<div class="inv-hpbar"><div class="inv-hpfill"></div><span class="inv-hptext"></span></div>' +
    '<div class="inv-unlocked"></div>';
  el.appendChild(bodyCard);

  // Body-swap POPUP: clicking the body card opens a full-screen overlay to browse every
  // available body and pick one for YOURSELF. Lives at document.body over the whole
  // viewport (not cramped in the side panel). Built live from state.unlockedBodies.
  const modal = document.createElement("div");
  modal.className = "km-body-modal hidden";
  modal.innerHTML =
    '<div class="km-body-card">' +
      '<div class="km-body-head"><span>Swap Body</span>' +
        '<button type="button" class="km-body-x" aria-label="close">✕</button></div>' +
      '<div class="km-body-grid"></div>' +
    "</div>";
  document.body.appendChild(modal);
  const modalGrid = modal.querySelector(".km-body-grid");
  const closeModal = () => modal.classList.add("hidden");
  bodyCard.classList.add("clickable");
  bodyCard.addEventListener("click", () => modal.classList.remove("hidden"));
  modal.addEventListener("click", (ev) => { if (ev.target === modal) closeModal(); }); // backdrop click
  modal.querySelector(".km-body-x").addEventListener("click", closeModal);
  // overlays (won/shop) cover the inventory panel on phones — they open the modal via this
  if (window.KM) window.KM.openBodyModal = () => modal.classList.remove("hidden");
  document.addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeModal(); });

  const list = document.createElement("div");
  list.className = "inv-list";
  el.appendChild(list);

  // DECK panel (owner 2026-06-25) — shown during combat (see inventory.css). The whole deck as tiles:
  // drawable bright, in-hand / in-play greyed. Rebuilt only when the deck composition changes.
  const deckBox = document.createElement("div");
  deckBox.className = "inv-deck";
  deckBox.innerHTML = '<div class="inv-deck-h"></div><div class="inv-deck-grid"></div>';
  deckBox.style.display = "none";
  el.appendChild(deckBox);
  const deckH = deckBox.querySelector(".inv-deck-h");
  const deckGrid = deckBox.querySelector(".inv-deck-grid");
  const KIND_ICON = { melee: "🗡", ranged: "🎯" };
  let deckSig = null;

  const empty = document.createElement("div");
  empty.className = "inv-empty";
  empty.textContent = "No game in progress.";
  el.appendChild(empty);

  // cache of body-card sub-nodes
  const bName = bodyCard.querySelector(".inv-body-name");
  const bStats = bodyCard.querySelector(".inv-body-stats");
  const bFill = bodyCard.querySelector(".inv-hpfill");
  const bText = bodyCard.querySelector(".inv-hptext");
  const bUnlocked = bodyCard.querySelector(".inv-unlocked");

  // signature of the currently built item rows, so we only rebuild on change
  let builtSig = null;
  let rows = []; // [{ root, name, text, bar, fill, status }]

  function buildRows(inv) {
    list.textContent = "";
    rows = [];
    inv.forEach((item, i) => {
      const root = document.createElement("div");
      root.className = "inv-row";

      // NOTE: item "size" (how much room it takes on the cooldown bar) is not yet
      // in the data contract -- `size` is null server-side. When it lands, render
      // it here (e.g. a slot-width indicator next to the slot number). Placeholder:
      // const size = item.size; // TODO: visualize once provided.

      root.innerHTML =
        '<div class="inv-row-head">' +
          '<span class="inv-slot">' + (i + 1) + '</span>' +
          '<span class="inv-name"></span>' +
        '</div>' +
        '<div class="inv-text"></div>' +
        '<div class="inv-cd"><div class="inv-cd-fill"></div>' +
          '<span class="inv-cd-status"></span></div>';

      list.appendChild(root);
      rows.push({
        root,
        name: root.querySelector(".inv-name"),
        text: root.querySelector(".inv-text"),
        bar: root.querySelector(".inv-cd"),
        fill: root.querySelector(".inv-cd-fill"),
        status: root.querySelector(".inv-cd-status"),
      });
    });
  }

  function setText(node, val) {
    if (node.textContent !== val) node.textContent = val;
  }

  // Render the DECK: drawable (bright) then in-hand + in-play (greyed). Header counts update every
  // tick; the tile grid rebuilds only when the composition changes (no per-tick flicker).
  function renderDeck(me) {
    const draw = me.drawPile || [], hand = me.hand || [], play = me.inPlayCards || [];
    const tiles = [].concat(
      draw.map((c) => ({ c, dim: false, note: "" })),
      hand.map((c) => ({ c, dim: true, note: "in hand" })),
      play.map((c) => ({ c, dim: true, note: "in play" }))
    );
    setText(deckH, "🃏 DECK · " + draw.length + " drawable / " + tiles.length);
    const sig = tiles.map((t) => t.c.key + (t.dim ? "·" + t.note : "")).join(",");
    if (sig === deckSig) return;
    deckSig = sig;
    deckGrid.textContent = "";
    for (const t of tiles) {
      const tile = document.createElement("div");
      tile.className = "inv-deck-tile" + (t.dim ? " dim" : "");
      if (t.c.color) tile.style.borderLeftColor = t.c.color;
      const ic = KIND_ICON[t.c.kind] || "";
      tile.innerHTML = '<span class="dt-cost">⚡' + (t.c.cost != null ? t.c.cost : "") + "</span>" +
        '<span class="dt-name">' + (ic ? ic + " " : "") + (t.c.name || t.c.key) + "</span>" +
        (t.note ? '<span class="dt-note">' + t.note + "</span>" : "");
      deckGrid.appendChild(tile);
    }
  }

  // Rebuild the body-swap menu. Each option is a button that swaps THIS player to
  // that body. Bodies are now FREE (owner 2026-06-24: gold gone) — any felled body the
  // party has released is wearable, the only gate is ally-exclusivity. Rebuilt only when
  // the unlocked set / your body / anyone's worn body changes (see the signature in onState).
  let menuSig = null;
  function buildMenu(state, me) {
    const bodies = state.bodies || {};
    const pool = new Set(state.unlockedBodies || []);   // bodies the party has felled/released
    const heldBy = {};                                  // bodies are EXCLUSIVE — off-limits if another wears it
    (state.players || []).forEach((p) => { if (p.id !== me.id) heldBy[p.bodyKey] = p.name || "ally"; });

    // EVERY felled body the party has released, plus the one you're wearing. All free to wear.
    const keys = Object.keys(bodies).filter((k) => {
      const b = bodies[k]; if (!b || b.boss || b.summon) return false;
      return pool.has(k);
    });
    if (!keys.includes(me.bodyKey)) keys.push(me.bodyKey);
    keys.sort((x, y) => (bodies[x].name || x).localeCompare(bodies[y].name || y));

    modalGrid.textContent = "";
    keys.forEach((key) => {
      const bd = bodies[key] || {};
      const isMe = key === me.bodyKey;
      const owner = heldBy[key];
      const tempo = bd.itemCdMul ? "⏩ fast cd" : bd.itemCdCap ? "⏳ capped cd" : "";
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "km-body-opt" + (isMe ? " current" : owner ? " taken" : "");
      opt.disabled = !!owner && !isMe;                  // ally-held bodies can't be taken
      const tag = isMe ? " ✓ (you)" : owner ? " — held by " + owner : "";
      opt.innerHTML =
        '<span class="opt-name" style="color:' + (bd.color || "#e0c0ff") + '">' +
          (bd.name || key) + tag + "</span>" +
        '<span class="opt-stats">❤' + (bd.maxHp != null ? bd.maxHp : "?") +
          (tempo ? "  " + tempo : "") + "</span>" +      // school-free: no ⚔/✦ Power, no 💰 price (owner 2026-06-24)
        (bd.passiveText ? '<span class="opt-passive">' + bd.passiveText + "</span>" : "");
      opt.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (isMe || owner) return;
        window.KM.send({ type: "swapBody", to: key });  // body swap is FREE now
        closeModal();
      });
      modalGrid.appendChild(opt);
    });
  }

  window.KM?.onState((state, you) => {
    const me = state && state.players && state.players.find((p) => p.id === you);

    // No live player yet (pre-game / spectating) -> show empty, hide the rest.
    if (!me) {
      bodyCard.style.display = "none";
      list.style.display = "none";
      empty.style.display = "";
      return;
    }
    bodyCard.style.display = "";
    list.style.display = "";
    empty.style.display = "none";

    // ---- BODY card --------------------------------------------------------
    const bodies = state.bodies || {};
    const body = bodies[me.bodyKey] || {};
    const maxHp = me.maxHp || body.maxHp || 0;
    const hp = me.hp != null ? me.hp : 0;

    setText(bName, body.name || me.bodyKey || "—");
    bName.style.color = body.color || "var(--gold)";
    // the mimic you're wearing: its combat identity (school-free, gold-free now — owner 2026-06-24)
    const tempo = body.itemCdMul ? "⏩ fast" : body.itemCdCap ? "⏳ capped" : "";
    const deck = me.deckSize != null ? `🃏 deck ${me.deckSize}/${me.minDeck ?? 10} min` : "";
    setText(bStats, [tempo, deck].filter(Boolean).join(" · ") || "school-free");
    const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    bFill.style.width = (pct * 100).toFixed(1) + "%";
    bFill.classList.toggle("low", pct <= 0.4);
    setText(bText, hp + "/" + maxHp);
    bodyCard.classList.toggle("dead", me.alive === false);

    const unlocked = (state.unlockedBodies && state.unlockedBodies.length) || 0;
    setText(bUnlocked, "▾ swap body (" + unlocked + " available)");

    // rebuild the popup when the released-body pool, your body, or anyone's worn body changes
    const usig = (state.unlockedBodies || []).join(",") + "|me:" + me.bodyKey +
      "|" + (state.players || []).map((p) => p.id + ":" + p.bodyKey).join(",");
    if (usig !== menuSig) { buildMenu(state, me); menuSig = usig; }

    // DECK in combat vs ITEM list otherwise (owner 2026-06-25): cards are the mechanic in a fight, so
    // the panel shows your deck (drawable bright, in-hand/in-play greyed); the worn-item list returns
    // between fights. This toggle runs AFTER the early `list.style.display=""` above, so it wins.
    const inCombat = state.phase === "playing" && (me.hand != null || me.drawPile != null);
    deckBox.style.display = inCombat ? "" : "none";
    list.style.display = inCombat ? "none" : "";
    if (inCombat) renderDeck(me);

    // ---- equipment list ---------------------------------------------------
    const inv = Array.isArray(me.inv) ? me.inv : [];
    const sig = inv.length + "|" + inv.map((it) => it.key || it.name).join(",");
    if (sig !== builtSig) {
      buildRows(inv);
      builtSig = sig;
    }

    inv.forEach((item, i) => {
      const r = rows[i];
      if (!r) return;
      setText(r.name, item.name || "Item " + (i + 1));
      setText(r.text, item.text || "");

      const cd = item.cd || 0;
      const charge = item.charge || 0;
      const ready = !item.stolen && (!!item.ready || (cd > 0 && charge >= cd));
      const fillPct = cd > 0 ? Math.max(0, Math.min(1, charge / cd)) : (ready ? 1 : 0);

      r.fill.style.width = (fillPct * 100).toFixed(1) + "%";
      if (item.stolen) {                  // Kraken lock — the entity holds it until killed
        r.root.classList.remove("ready");
        setText(r.status, "STOLEN");
      } else if (ready) {
        r.root.classList.add("ready");
        setText(r.status, "READY");
      } else {
        r.root.classList.remove("ready");
        const remain = ((cd - charge) / 10);
        setText(r.status, (remain > 0 ? remain : 0).toFixed(1) + "s");
      }
    });
  });
})();
