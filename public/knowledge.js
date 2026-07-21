// Landing-page knowledge book. Content comes from /knowledge.json, which projects the live engine
// tables; this file owns only browsing, filtering, and accessible modal behavior.
(() => {
  const button = document.getElementById("knowledgeBtn");
  const modal = document.getElementById("knowledgeBook");
  const shell = modal?.querySelector(".knowledge-shell");
  const content = document.getElementById("knowledgeContent");
  const tabs = [...(modal?.querySelectorAll("[data-knowledge-tab]") ?? [])];
  if (!button || !modal || !shell || !content) return;

  let catalog = null;
  let activeTab = "basics";
  const esc = (value) => String(value ?? "").replace(/[&<>\"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[char]));
  const bodyIcon = (key) => window.KM?.bodyIconHtml?.(key)
    ?? `<img class="km-ico" src="/foes/${esc(key)}.svg" alt="" onerror="this.remove()">`;
  const cardIcon = (key) => `<img class="km-ico" src="/cards/${esc(key)}.svg" alt="" onerror="this.remove()">`;
  const tierName = (tier) => !tier ? "Common" : tier === 3 ? "Elite III · Mythic" : `Elite ${tier === 2 ? "II" : "I"}`;
  const countLabel = (kind, count) => `${count} ${count === 1 ? (kind === "bodies" ? "body" : "card") : kind}`;
  const scaleName = (scale) => scale === "both" ? "⚔ + 🎯 both"
    : scale === "melee" ? "⚔ melee" : scale === "ranged" ? "🎯 ranged" : "no damage scaling";

  function searchSurface(kind, count, cards) {
    return `<div class="knowledge-tools">
      <label for="knowledgeSearch">Search ${esc(kind)}</label>
      <input id="knowledgeSearch" type="search" placeholder="Name or effect…" autocomplete="off" />
      <span id="knowledgeCount">${countLabel(kind, count)}</span>
    </div><div class="knowledge-grid knowledge-${esc(kind)}">${cards}</div>
    <p id="knowledgeEmpty" class="knowledge-empty hidden">No matches.</p>`;
  }

  function wireSearch(kind) {
    const search = document.getElementById("knowledgeSearch");
    const count = document.getElementById("knowledgeCount");
    const empty = document.getElementById("knowledgeEmpty");
    const entries = [...content.querySelectorAll("[data-knowledge-search]")];
    if (!search) return;
    search.addEventListener("input", () => {
      const query = search.value.trim().toLocaleLowerCase();
      let shown = 0;
      for (const entry of entries) {
        const match = !query || entry.dataset.knowledgeSearch.includes(query);
        entry.classList.toggle("hidden", !match);
        if (match) shown++;
      }
      count.textContent = countLabel(kind, shown);
      empty.classList.toggle("hidden", shown !== 0);
    });
  }

  function renderBasics() {
    const steps = catalog.mechanics.map((item, index) => `<article class="knowledge-step">
      <span>${index + 1}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div>
    </article>`).join("");
    const leveling = catalog.leveling.choices.map((choice) => `<li><b>${esc(choice.name)}</b><span>${esc(choice.text)}</span><em>${choice.cost} point${choice.cost === 1 ? "" : "s"}</em></li>`).join("");
    content.innerHTML = `<section class="knowledge-basics">
      <p class="knowledge-lead">Wear defeated foes. Build a deck. Take the throne.</p>
      <div class="knowledge-step-grid">${steps}</div>
      <section class="knowledge-leveling"><h3>Level points</h3><p>${esc(catalog.leveling.summary)}</p><ul>${leveling}</ul></section>
    </section>`;
  }

  function renderBodies() {
    const cards = catalog.bodies.map((body) => {
      const mastery = body.upgrades?.mastery;
      const specialty = body.upgrades?.specialty;
      const searchable = `${body.name} ${body.passive} ${mastery?.text ?? ""} ${specialty?.text ?? ""}`.toLocaleLowerCase();
      return `<details class="knowledge-body-card" data-knowledge-search="${esc(searchable)}">
        <summary><span class="knowledge-portrait">${bodyIcon(body.key)}</span><span><b>${esc(body.name)}</b><small>♥${body.maxHp} · ${esc(tierName(body.eliteTier))}</small></span><span class="knowledge-open-label">READ +</span></summary>
        <div class="knowledge-body-copy"><p><b>Passive</b>${esc(body.passive)}</p>
          <p><b>Mastery · ${mastery?.cost ?? 2} points</b>${esc(mastery?.text ?? "No Mastery track.")}</p>
          <p><b>Specialty · ${specialty?.cost ?? 1} point/rank</b>${esc(specialty?.text ?? "No Specialty track.")}${specialty?.cap ? ` <em>Cap ${specialty.cap}.</em>` : ""}</p>
        </div>
      </details>`;
    }).join("");
    content.innerHTML = `<p class="knowledge-section-note">Every wearable body, with its base HP, passive, Mastery, and Specialty.</p>${searchSurface("bodies", catalog.bodies.length, cards)}`;
    wireSearch("bodies");
  }

  function renderCards() {
    const cards = catalog.cards.map((card) => {
      const searchable = `${card.name} ${card.text} ${card.sum} ${card.kind} ${card.scale}`.toLocaleLowerCase();
      return `<article class="knowledge-card" data-knowledge-search="${esc(searchable)}">
        <header><span class="knowledge-card-art">${cardIcon(card.key)}</span><div><h3>${esc(card.name)}</h3><small>${esc(scaleName(card.scale))}</small></div><span class="knowledge-cost">⚡${card.cost}</span></header>
        <p>${esc(card.text)}</p>
        <footer><span title="Card value">◈${card.value} value</span>${card.sum ? `<span>${esc(card.sum)}</span>` : ""}${card.ranged ? "<span>🎯 aimed</span>" : ""}</footer>
      </article>`;
    }).join("");
    content.innerHTML = `<p class="knowledge-section-note">Every card in the live player pool. ⚡ is moxie cost; ◈ is loot/tender value.</p>${searchSurface("cards", catalog.cards.length, cards)}`;
    wireSearch("cards");
  }

  function renderBosses() {
    content.innerHTML = `<p class="knowledge-section-note">Floor bosses scale with party size and floor. Their action deck cycles one card at a time.</p><div class="knowledge-boss-grid">${catalog.bosses.map((boss) => `
      <article class="knowledge-boss-card">
        <header><span class="knowledge-portrait">${bodyIcon(boss.key)}</span><div><h3>${esc(boss.name)}</h3><small>${esc(boss.hp)}${boss.cadence ? ` · action every ${boss.cadence}s` : ""}</small></div></header>
        <p>${esc(boss.passive)}</p>
        <h4>Action deck</h4><ul>${boss.cards.map((card) => `<li>${esc(card.name)}</li>`).join("")}</ul>
      </article>`).join("")}</div>`;
  }

  function render() {
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.knowledgeTab === activeTab)));
    if (!catalog) return;
    if (activeTab === "bodies") renderBodies();
    else if (activeTab === "cards") renderCards();
    else if (activeTab === "bosses") renderBosses();
    else renderBasics();
    content.scrollTop = 0;
  }

  async function loadCatalog() {
    if (catalog) return catalog;
    content.innerHTML = '<p class="knowledge-loading">Opening the book…</p>';
    const response = await fetch("/knowledge.json");
    if (!response.ok) throw new Error(`Knowledge book failed to load (${response.status}).`);
    catalog = await response.json();
    return catalog;
  }

  async function openBook() {
    modal.classList.remove("hidden");
    document.body.classList.add("knowledge-open");
    shell.focus();
    try { await loadCatalog(); render(); }
    catch (error) {
      content.innerHTML = `<p class="knowledge-error">${esc(error.message)} <button id="knowledgeRetry" type="button">Retry</button></p>`;
      document.getElementById("knowledgeRetry")?.addEventListener("click", async () => {
        catalog = null;
        try { await loadCatalog(); render(); } catch (nextError) { content.textContent = nextError.message; }
      });
    }
  }
  function closeBook() {
    modal.classList.add("hidden");
    document.body.classList.remove("knowledge-open");
    button.focus();
  }

  button.addEventListener("click", openBook);
  modal.querySelectorAll("[data-knowledge-close]").forEach((close) => close.addEventListener("click", closeBook));
  tabs.forEach((tab) => tab.addEventListener("click", () => { activeTab = tab.dataset.knowledgeTab; render(); }));
  document.addEventListener("keydown", (event) => {
    if (modal.classList.contains("hidden")) return;
    if (event.key === "Escape") { event.preventDefault(); closeBook(); }
    if (event.key === "Tab") {
      const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), details > summary')].filter((node) => node.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  window.KM ??= {};
  window.KM.knowledge = { open: openBook, close: closeBook };
})();
