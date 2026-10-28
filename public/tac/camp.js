// King Mimic — hex tactics CAMP: the lane game's between-rooms loop, between floors (owner 2026-10-28:
// "that loop should stay the same between floors just much prettier"). Loot (co-op bid points /
// solo backpack), level up with card value, gem points, change form, deck editing, ready to descend.
// Pure view: every action is a message; the server validates.

const GEM_NAME = { ruby: "Ruby", emerald: "Emerald", sapphire: "Sapphire", diamond: "Diamond" };
const GEM_GIVES = (cat) => ({
  ruby: `+1 damage on Ruby cards · +${cat.gemRules.rubyHp} health`,
  emerald: `+1 damage on Emerald cards · +${cat.gemRules.emeraldSpeed} movement`,
  sapphire: `+1 damage on Sapphire cards · +${cat.gemRules.sapphireMana} mana`,
  diamond: "+1 to Diamond cards (divine)",
});
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let tab = "loot";

export function renderCamp(root, S, CAT, send, { artUrl, cardOf, bodyOf }) {
  const you = S.you, camp = S.camp;
  if (!you || !camp) return;
  const me = S.heroes.find((h) => h.id === you.id);
  const coop = camp.party.length > 1;
  const gemPill = (g, n) => `<span class="gem gem-${g}" title="${GEM_NAME[g]}">${n}</span>`;
  const cardTile = (key, extra = "", cls = "") => {
    const c = cardOf(key);
    return `<div class="ccard ${cls}" style="--g:var(--${c.gem ?? "ruby"})"><span class="c">${c.cost}</span><b>${esc(c.name)}</b><em>${esc(c.text)}</em>${extra}</div>`;
  };
  // ---- you: body, level, gems
  const b = bodyOf(you.body);
  const gemRows = ["ruby", "emerald", "sapphire", "diamond"].map((g) => `
    <div class="gemrow gem-${g}">
      <span class="gdot"></span><b>${GEM_NAME[g]}</b><span class="gval">${you.gems[g]}</span>
      <small>${esc(GEM_GIVES(CAT)[g])}</small>
      <span class="gbtns"><button data-alloc="${g}" data-d="-1" ${you.alloc[g] > 0 ? "" : "disabled"} aria-label="Take a point from ${GEM_NAME[g]}">−</button><button data-alloc="${g}" data-d="1" ${you.pointsFree > 0 ? "" : "disabled"} aria-label="Put a point in ${GEM_NAME[g]}">+</button></span>
    </div>`).join("");
  const canLevel = you.treasure + you.bagValue >= you.nextLevelCost;
  const left = `
    <div class="you">
      <header><img src="${artUrl(you.body)}" alt=""><div><p class="eyebrow">Level ${you.level}${you.pointsFree ? ` · <span class="hot">${you.pointsFree} point${you.pointsFree > 1 ? "s" : ""} to spend</span>` : ""}</p><h3>${esc(b.name)}</h3>
        <p class="meta">♥ ${me?.mhp ?? you.mhp} · Speed ${me?.speed ?? b.speed}${you.maxMana ? ` · Mana ${you.maxMana}` : ""}</p></div></header>
      <div class="gems">${gemRows}</div>
      <p class="fine">◈${you.treasure} banked + ◈${you.bagValue} in spare cards. Levels are paid from the bank first, then your cheapest spares.</p>
    </div>`;
  // ---- tabs
  const tabs = [["loot", coop ? `Loot · ${camp.pool.length}` : `Backpack · ${you.bag.length}`], ["form", `Form · ${camp.bodies.length}`], ["deck", `Deck · ${you.deckList.length}`]];
  let body = "";
  if (tab === "loot") {
    const pool = coop ? `
      <p class="sect">Party loot <span class="pts">You have ${you.points} point${you.points === 1 ? "" : "s"}</span></p>
      <div class="grid">${camp.pool.map((it, i) => cardTile(it.key, `<button class="claim" data-claim="${i}" ${you.points >= it.value ? "" : "disabled"}>Claim · ${it.value}</button>`)).join("") || `<p class="fine">Nothing left to claim.</p>`}</div>` : "";
    body = `${pool}
      <p class="sect">Your backpack <span class="pts">◈${you.bagValue}</span>${you.bag.length ? `<button class="ghost small" data-act="melt">Melt all → ◈${you.bagValue}</button>` : ""}</p>
      <div class="grid">${you.bag.map((k, i) => cardTile(k, `<button class="claim" data-todeck="${i}">Add to deck</button>`)).join("") || `<p class="fine">${coop ? "Claim cards from the party loot." : "Everything you loot lands here."}</p>`}</div>`;
  } else if (tab === "form") {
    body = `<p class="sect">Bodies the party has felled</p><div class="grid bodies">${[{ key: you.body, adopt: 0, worn: you.id }, ...camp.bodies.filter((x) => x.key !== you.body)].map((x) => {
      const bb = bodyOf(x.key), mine = x.key === you.body, other = x.worn && x.worn !== you.id;
      const who = other ? camp.party.find((p) => p.id === x.worn)?.name ?? "an ally" : "";
      const g = bb.gems ?? {};
      return `<div class="form${mine ? " mine" : ""}"><img src="${artUrl(x.key)}" alt=""><b>${esc(bb.name)}</b>
        <span class="meta">♥ ${bb.hp} · ${["ruby", "emerald", "sapphire", "diamond"].map((k) => gemPill(k, g[k] ?? 0)).join("")}</span>
        <p>${esc(bb.passive)}</p>
        <button class="claim" data-form="${x.key}" ${mine || other ? "disabled" : ""}>${mine ? "Wearing" : other ? `Worn by ${esc(who)}` : x.adopt ? `Adopt · ◈${x.adopt}` : "Wear"}</button></div>`;
    }).join("")}</div>`;
  } else {
    body = `<p class="sect">Deck <span class="pts">${you.deckList.length} cards · minimum ${CAT.minDeck}</span></p>
      <div class="grid">${you.deckList.map((k, i) => cardTile(k, `<button class="claim" data-tobag="${i}" ${you.deckList.length > CAT.minDeck ? "" : "disabled"}>To backpack</button>`)).join("")}</div>`;
  }
  const readyNames = camp.party.map((p) => `<i class="${camp.ready[p.id] ? "on" : ""}">${esc(p.id === you.id ? "You" : p.name)}</i>`).join("");
  root.innerHTML = `
    <div class="camp-head"><div><p class="eyebrow">Camp · floor ${S.floor} cleared</p><h2>Rest, loot and grow</h2></div>
      ${coop ? `<div class="readies">${readyNames}</div>` : ""}</div>
    <div class="camp-cols">${left}
      <div class="panel-r"><nav>${tabs.map(([id, label]) => `<button class="${tab === id ? "on" : ""}" data-tab="${id}">${label}</button>`).join("")}</nav><div class="tabbody">${body}</div></div>
    </div>
    <div class="camp-foot">
      <button class="levelup ghost" data-act="levelup" ${canLevel ? "" : "disabled"}>Level up <b>◈${you.nextLevelCost}</b></button>
      <button class="primary descend" data-act="ready">${you.ready ? (coop ? "Waiting for the party… (tap to cancel)" : "Descending…") : `Descend to floor ${S.floor + 1}`}</button>
    </div>`;
  root.querySelectorAll("[data-tab]").forEach((el) => el.onclick = () => { tab = el.dataset.tab; renderCamp(root, S, CAT, send, { artUrl, cardOf, bodyOf }); });
  root.querySelectorAll("[data-alloc]").forEach((el) => el.onclick = () => send({ t: "alloc", gem: el.dataset.alloc, d: +el.dataset.d }));
  root.querySelectorAll("[data-claim]").forEach((el) => el.onclick = () => send({ t: "claim", i: +el.dataset.claim }));
  root.querySelectorAll("[data-todeck]").forEach((el) => el.onclick = () => send({ t: "todeck", i: +el.dataset.todeck }));
  root.querySelectorAll("[data-tobag]").forEach((el) => el.onclick = () => send({ t: "tobag", i: +el.dataset.tobag }));
  root.querySelectorAll("[data-form]").forEach((el) => el.onclick = () => send({ t: "form", key: el.dataset.form }));
  root.querySelector('[data-act="levelup"]').onclick = () => send({ t: "levelup" });
  const meltBtn = root.querySelector('[data-act="melt"]'); if (meltBtn) meltBtn.onclick = () => send({ t: "melt" });
  root.querySelector('[data-act="ready"]').onclick = () => send({ t: "ready", on: !you.ready });
}
