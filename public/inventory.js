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
    '<div class="inv-hpbar"><div class="inv-hpfill"></div><span class="inv-hptext"></span></div>' +
    '<div class="inv-unlocked"></div>';
  el.appendChild(bodyCard);

  const list = document.createElement("div");
  list.className = "inv-list";
  el.appendChild(list);

  const empty = document.createElement("div");
  empty.className = "inv-empty";
  empty.textContent = "No game in progress.";
  el.appendChild(empty);

  // cache of body-card sub-nodes
  const bName = bodyCard.querySelector(".inv-body-name");
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
    const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
    bFill.style.width = (pct * 100).toFixed(1) + "%";
    bFill.classList.toggle("low", pct <= 0.4);
    setText(bText, hp + "/" + maxHp);
    bodyCard.classList.toggle("dead", me.alive === false);

    const unlocked = (state.unlockedBodies && state.unlockedBodies.length) || 0;
    setText(bUnlocked, "Bodies unlocked: " + unlocked);

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
      const ready = !!item.ready || (cd > 0 && charge >= cd);
      const fillPct = cd > 0 ? Math.max(0, Math.min(1, charge / cd)) : (ready ? 1 : 0);

      r.fill.style.width = (fillPct * 100).toFixed(1) + "%";
      if (ready) {
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
