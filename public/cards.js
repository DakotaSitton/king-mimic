// Card library viewer — renders every transcribed card with its crisp text.
// This is the source of truth for the in-game hover tooltips too.

const stars = (t) => "★".repeat(t || 0);

function hasTodo(entry) {
  const text = JSON.stringify(entry);
  return /"do":"special"/.test(text) || /TODO/.test(text);
}

function cardEl(id, entry, kind) {
  const el = document.createElement("div");
  el.className = "card";
  const statLine =
    entry.boss ? `<span class="stat">ATK ${entry.atk ?? entry.atkFormula} / HP ${entry.hp ?? entry.hpFormula}</span>`
    : (entry.atk !== undefined || entry.hp !== undefined) ? `<span class="stat">${entry.atk ?? 0}/${entry.hp ?? "?"}</span>`
    : "";
  const type = entry.type ? `<span class="type">${entry.type}</span>` : (kind === "foe" ? `<span class="type">foe</span>` : "");
  const tags = (entry.tags || []).map((t) => `<span class="tag">${t}</span>`).join("");
  el.innerHTML = `
    <div class="name">${entry.name} <span class="stars">${stars(entry.tier)}</span></div>
    <div>${statLine} ${type}</div>
    <div class="text">${entry.text || ""}</div>
    ${tags}
    ${hasTodo(entry) ? '<div class="todo">⚙ effect stubbed — logic TODO</div>' : ""}
  `;
  return el;
}

let DATA = null;
let activeFilter = "all";

function render() {
  const sections = document.getElementById("sections");
  sections.innerHTML = "";
  let total = 0;

  const groups = [
    ["Foes", DATA.foes, "foe"],
    ["Bosses", DATA.bosses, "foe"],
    ["Equipment", DATA.equipment, "equip"],
    ["Tokens", DATA.tokens, "foe"],
  ];

  for (const [title, obj, kind] of groups) {
    const entries = Object.entries(obj).filter(([, e]) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "todo") return hasTodo(e);
      if (["1", "2", "3"].includes(activeFilter)) return String(e.tier) === activeFilter;
      return e.type === activeFilter || (e.tags || []).includes(activeFilter) || kind === activeFilter;
    });
    if (!entries.length) continue;
    const h = document.createElement("h2");
    h.textContent = `${title} (${entries.length})`;
    sections.appendChild(h);
    const grid = document.createElement("div");
    grid.className = "grid";
    for (const [id, e] of entries) grid.appendChild(cardEl(id, e, kind));
    sections.appendChild(grid);
    total += entries.length;
  }
  document.getElementById("count").textContent = `${total} cards shown`;
}

const FILTERS = ["all", "1", "2", "3", "deal", "summon", "passive", "sale", "todo"];
const LABEL = { all: "All", 1: "★", 2: "★★", 3: "★★★", todo: "⚙ Stubbed" };

async function boot() {
  DATA = await (await fetch("/content")).json();
  document.getElementById("rules").textContent = DATA.rules;
  const fbar = document.getElementById("filters");
  for (const f of FILTERS) {
    const b = document.createElement("button");
    b.textContent = LABEL[f] || f;
    b.className = f === activeFilter ? "on" : "";
    b.onclick = () => {
      activeFilter = f;
      [...fbar.children].forEach((c) => c.classList.toggle("on", c === b));
      render();
    };
    fbar.appendChild(b);
  }
  render();
}
boot();
