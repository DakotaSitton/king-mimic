// King Mimic Developer Lab. This file is inert unless BOTH gates are present:
//   1) server started with KM_SCENARIO=1
//   2) browser opened with ?dev=1 (client marks the room dev=true)
// The public server therefore serves this harmless file but never exposes a mutation surface.
(() => {
  const PRESETS = {
    minotaur: {
      name: "dev-ranked-minotaur", phase: "playing", floor: 1,
      players: [{
        body: "bloodfund", level: 5,
        levelAllocation: { hp: 1, melee: 1, ranged: 0, mastery: 0, specialty: 1 },
        maxHp: 30, hp: 30, moxie: 10,
        deck: ["oSword", "oSword", "dShield", "dShield", "oAnimatedBlade", "oAnimatedBlade", "oDagger", "oDagger", "dHeartGuard", "dHeartGuard"],
        hand: ["oSword", "dShield", "oAnimatedBlade"]
      }],
      foes: [{ body: "rookie", gear: ["oSword", "oSword", "oSword"], lane: 0 }]
    },
    five: {
      name: "dev-five-foes", phase: "playing", floor: 1,
      players: [{ body: "rookie", maxHp: 999, hp: 999, treasure: 99 }],
      foes: [
        { body: "frugal", gear: ["oDagger", "oSword", "oSpear"], lane: 0 },
        { body: "discountDuel", gear: ["oDagger", "oBow", "oArcane"], lane: 0 },
        { body: "mutualMend", gear: ["oSword", "oSpear", "dShield"], lane: 0 },
        { body: "ratTrader", gear: ["oDagger", "oHatchet", "dShield"], lane: 0 },
        { body: "bloodfund", gear: ["oSword", "oBow", "dShield"], lane: 0 }
      ]
    },
    sixteen: {
      name: "dev-sixteen-foes", phase: "playing", floor: 2,
      players: [{ body: "rookie", maxHp: 999, hp: 999 }],
      foes: [
        { body: "frugal", gear: ["oDagger", "oSword", "oSpear"], count: 4, lane: 0 },
        { body: "discountDuel", gear: ["oDagger", "oBow", "oArcane"], count: 4, lane: 0 },
        { body: "mutualMend", gear: ["oSword", "oSpear", "dShield"], count: 4, lane: 0 },
        { body: "ratTrader", gear: ["oDagger", "oHatchet", "dShield"], count: 4, lane: 0 }
      ]
    },
    summons: {
      name: "dev-summon-parity", phase: "playing", floor: 2,
      players: [{ body: "hedge", maxHp: 999, hp: 999, moxie: 10 }],
      foes: [{ body: "frugal", gear: ["oDagger", "oSword", "oSpear"], lane: 0 }],
      summons: [
        { side: "hero", body: "rat", count: 2, lane: 0, player: 0 },
        { side: "hero", body: "hedgeKnight", count: 1, lane: 0, player: 0 },
        { side: "foe", body: "tentacle", count: 2, lane: 0 }
      ]
    }
  };

  let root = null, textarea = null, status = null, toggle = null;
  const pretty = (v) => JSON.stringify(v, null, 2);
  const send = (o) => window.KM?.send?.(o);

  function setPreset(key) {
    if (textarea && PRESETS[key]) textarea.value = pretty(PRESETS[key]);
  }

  function build() {
    if (root) return;
    const style = document.createElement("style");
    style.textContent = `
      #kmDevToggle{position:fixed;left:8px;top:8px;z-index:400;background:#c64b45;color:#fff;border:1px solid #ff8b80;padding:6px 9px;font:700 11px ui-monospace,monospace;box-shadow:0 3px 14px #0009}
      #kmDevLab{position:fixed;z-index:399;left:8px;top:42px;width:min(420px,calc(100vw - 16px));max-height:calc(100dvh - 50px);overflow:auto;background:#0c1017f5;border:1px solid #80433f;border-radius:10px;padding:10px;box-shadow:0 12px 40px #000c;color:#dce4ef;font:12px ui-monospace,monospace}
      #kmDevLab.hidden{display:none!important} #kmDevLab h3{margin:0;color:#ff8b80;font-size:14px} #kmDevLab p{margin:3px 0 8px;color:#9eabba;font-size:10px}
      .km-dev-row{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}.km-dev-row button,.km-dev-row select{font:700 10px ui-monospace,monospace;padding:7px 8px;border-radius:6px;letter-spacing:0}
      .km-dev-row button{background:#252d3a;color:#e6edf6;border:1px solid #465166}.km-dev-row button.hot{background:#7b342f;border-color:#c96860}
      #kmDevJson{width:100%;height:210px;resize:vertical;background:#080b10;color:#cbd6e4;border:1px solid #354052;border-radius:7px;padding:8px;font:10px/1.35 ui-monospace,monospace;text-transform:none}
      #kmDevStatus{color:#8fd6a8;min-height:1.2em}.km-dev-badge{margin-left:auto;color:#f0c96c}
      @media(max-height:600px){#kmDevLab{width:360px}#kmDevJson{height:120px}}
    `;
    document.head.appendChild(style);
    toggle = document.createElement("button");
    toggle.id = "kmDevToggle"; toggle.textContent = "DEV";
    root = document.createElement("section"); root.id = "kmDevLab"; root.className = "hidden";
    root.innerHTML = `<h3>DEVELOPER LAB <span class="km-dev-badge">LOCAL ONLY</span></h3>
      <p>Validated starting states + live controls. These rooms never write telemetry.</p>
      <div class="km-dev-row">
        <button data-act="invincible">999 HP</button><button data-act="heal">Heal</button>
        <button data-act="moxie">10 moxie</button><button data-act="treasure">+10 ◈</button>
        <button data-act="unlock">Unlock bodies</button><button data-act="foesOneHp">Foes → 1 HP</button>
      </div>
      <div class="km-dev-row">
        <button data-act="pause">Pause / resume</button><button data-act="step">Step 100ms</button>
        <select id="kmDevPreset"><option value="minotaur">ranked Minotaur passive</option><option value="five">5 foes · one lane</option><option value="sixteen">16 foes · crush</option><option value="summons">summon parity</option></select>
        <button id="kmDevLoad">Load preset</button>
      </div>
      <textarea id="kmDevJson" spellcheck="false"></textarea>
      <div class="km-dev-row"><button id="kmDevApply" class="hot">Apply scenario</button><span id="kmDevStatus"></span></div>`;
    document.body.append(toggle, root);
    textarea = root.querySelector("#kmDevJson"); status = root.querySelector("#kmDevStatus");
    setPreset("minotaur");
    toggle.onclick = () => root.classList.toggle("hidden");
    root.querySelectorAll("[data-act]").forEach((b) => b.onclick = () => send({ type: "devAction", action: b.dataset.act }));
    root.querySelector("#kmDevLoad").onclick = () => setPreset(root.querySelector("#kmDevPreset").value);
    root.querySelector("#kmDevApply").onclick = () => {
      try {
        const spec = JSON.parse(textarea.value);
        status.textContent = "applying…";
        send({ type: "scenario", spec });
      } catch (e) { status.textContent = "invalid JSON: " + e.message; }
    };
  }

  window.KM?.onState?.((state) => {
    if (!state?.dev) return;
    build();
    status.textContent = `${state.phase} · tick ${state.tick}${state.dev.paused ? " · PAUSED" : ""}${state.scenario ? " · " + state.scenario : ""}`;
  });
})();
