import * as THREE from './vendor/three.js';

// Presentation only. Every combatant, intent, and vital comes from the public snapshot.
// Art aliases mirror the existing client: this scene adds no bodies or gameplay rules.
const ART_ALIAS = {
  centlessCentaur: 'centaur', malevolentMouse: 'mouse', rentSeekingRuneblade: 'runeblade',
  marketCrashMinotaur: 'minotaur', interestImp: 'internImp', vengefulVampire: 'vampire',
  bondBehemoth: 'behemoth', wearyWageslave: 'wageslave', tollTroll: 'balrog',
  cryptoChimera: 'cerberus', hedgeKnight: 'knight', bribedBishop: 'auditAngel',
  chequeCherub: 'auditAngel', pyramidHead: 'runeblade', pennyPixie: 'pixie',
  econElemental: 'totem', wanderCastle: 'goldenGolem', earthElemental: 'totem',
  lavaElemental: 'phoenix', grandAttacker: 'minotaur', grandCaster: 'lizardWizard',
  grandTank: 'atlas', kitchenSlow5: 'itemEntity', kitchenMedium: 'itemEntity',
  kitchenSlow3: 'itemEntity', frostOrb: 'itemEntity', iceling: 'itemEntity',
  ratKing: 'royalRat', jarSlime: 'itemEntity', splitter: 'djinn', bloodMoonOni: 'balrog',
  animatedWeapon: 'animatedSword',
};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const number = (n, fallback = 0) => Number.isFinite(Number(n)) ? Number(n) : fallback;
const artFor = (entity) => {
  let key = entity.bodyKey === 'warewolf'
    ? (entity.form === 'wolf' ? 'warewolf' : 'warewolfHuman')
    : (entity.portrait || entity.bodyKey || 'kingMimic');
  const canonical = window.KM?.bodyArtUrl?.(key)?.match(/\/foes\/([a-zA-Z0-9]+)\.svg(?:\?|$)/)?.[1];
  if (canonical) return canonical;
  for (let i = 0; i < 8 && ART_ALIAS[key] && ART_ALIAS[key] !== key; i++) key = ART_ALIAS[key];
  return /^[a-zA-Z0-9]+$/.test(key) ? key : 'kingMimic';
};

function publicIntent(entity) {
  const cards = entity.queue || [];
  const card = cards[0];
  const threats = entity.threats || entity.bodyThreats || [];
  const threat = threats.reduce((soonest, t) => !soonest || number(t.frac) > number(soonest.frac) ? t : soonest, null);
  if (card) return {
    text: `${card.name || 'Card'}${card.glyphs || card.dmgNow || card.dmg ? ` · ${card.glyphs || card.dmgNow || card.dmg}` : ''}`,
    full: card.text || card.name || 'Card',
    frac: clamp(number(entity.castFrac), 0, 1),
    harm: card.harm !== false,
  };
  if (threat) return {
    text: threat.intent || `${threat.label || 'Action'}${number(threat.dmg) > 0 ? ` · ${threat.dmg} damage` : ''}`,
    full: threat.intent || threat.label || 'Action',
    frac: clamp(number(threat.frac), 0, 1), harm: !!threat.harm,
  };
  if (entity.intentCard) return {
    text: `${entity.intentCard.mode === 'auto' ? 'Auto' : 'Queued'} · ${entity.intentCard.name || 'Card'}`,
    full: entity.intentCard.name || 'Queued card', frac: 0, harm: false,
  };
  return { text: entity.reactive ? 'Reacts to attacks' : 'No queued attack', full: entity.passive || '', frac: 0, harm: false };
}

/** Fixed-camera, server-driven stone diorama; no gameplay state is owned here. */
export function createDungeonScene({ container, onSelectEntity = () => {}, onSelectLane = () => {} }) {
  if (!container) throw new Error('Dungeon scene requires a container');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  renderer.setClearColor(0x151b1c, 1);
  renderer.domElement.className = 'dg-scene-canvas';
  renderer.domElement.setAttribute('aria-label', 'Dungeon battlefield. Select a creature or a lane.');
  container.classList.add('dg-scene-root');
  container.append(renderer.domElement);
  const labels = document.createElement('div');
  labels.className = 'dg-scene-labels';
  container.append(labels);
  const laneNav = document.createElement('div');
  laneNav.className = 'dg-scene-lanes';
  laneNav.setAttribute('role', 'group');
  laneNav.setAttribute('aria-label', 'Choose your lane');
  container.append(laneNav);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x151b1c, 20, 40);
  const camera = new THREE.OrthographicCamera(-9, 9, 5, -5, 0.1, 70);
  camera.position.set(3.4, 11.2, 20);
  camera.lookAt(0, 1.0, 0);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const geo = (g) => { geometries.add(g); return g; };
  const mat = (opts) => { const m = new THREE.MeshStandardMaterial(opts); materials.add(m); return m; };
  const basic = (opts) => { const m = new THREE.MeshBasicMaterial(opts); materials.add(m); return m; };
  const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };
  const box = geo(new THREE.BoxGeometry(1, 1, 1));
  const cylinder = geo(new THREE.CylinderGeometry(1, 1, 1, 12));
  const plane = geo(new THREE.PlaneGeometry(1, 1));
  const ring = geo(new THREE.TorusGeometry(0.69, 0.022, 6, 48));
  const unit = (parent, material, x, y, z, sx, sy, sz, geometry = box) => {
    const mesh = add(parent, geometry, material, x, y, z); mesh.scale.set(sx, sy, sz); return mesh;
  };
  const sandstone = mat({ color: 0x817461, roughness: 0.93 });
  const paleStone = mat({ color: 0xb3a184, roughness: 0.94 });
  const darkStone = mat({ color: 0x343e3d, roughness: 0.96 });
  const trim = mat({ color: 0x5c6460, roughness: 0.8 });
  const brass = mat({ color: 0xac8951, metalness: 0.64, roughness: 0.4 });
  const iron = mat({ color: 0x232c2c, metalness: 0.7, roughness: 0.58 });
  const black = mat({ color: 0x0c1718, roughness: 1 });
  const teal = mat({ color: 0x2a7771, emissive: 0x174c44, emissiveIntensity: 0.3, roughness: 0.78 });
  const goldGlow = basic({ color: 0xe8bd72 });
  const tealGlow = basic({ color: 0x68d9c4 });
  const enemyGlow = basic({ color: 0xd69470 });
  const shadeTexture = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d'), g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
    g.addColorStop(0, 'rgba(0,0,0,.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); textures.add(t); return t;
  })();
  const contactShadow = basic({ map: shadeTexture, transparent: true, depthWrite: false, opacity: 0.8 });
  scene.add(new THREE.HemisphereLight(0xd8e6df, 0x30261b, 2.25));
  const keyLight = new THREE.DirectionalLight(0xffe0ae, 3.5); keyLight.position.set(-5, 10, 8); scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x73bbbf, 2.1); rimLight.position.set(5, 5, -8); scene.add(rimLight);
  const room = new THREE.Group(); scene.add(room);
  const lanes = new THREE.Group(); scene.add(lanes);
  const actors = new Map(), artCache = new Map();
  const laneHits = [], laneButtons = [], animatedFlames = [];
  let laneCount = 0, width = 1, height = 1, disposed = false, visible = true;
  let latest = {}, raf = 0, lastFrame = 0, frameCount = 0, failedArt = 0, worldWidth = 14;
  let horizontalStretch = 1;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), projection = new THREE.Vector3();

  // Individual masonry joints and bevel-like stacked trims give the room scale.
  unit(room, darkStone, 0, -0.5, 0, 17.4, 0.8, 11.8);
  unit(room, brass, 0, -0.08, 5.85, 17.1, 0.07, 0.08);
  const floor = new THREE.InstancedMesh(box, sandstone, 168);
  const transform = new THREE.Object3D(), variation = new THREE.Color();
  for (let i = 0; i < 168; i++) {
    const col = i % 14, row = Math.floor(i / 14);
    transform.position.set((col - 6.5) * 1.21, -0.075, (row - 5.5) * 0.96);
    transform.scale.set(1.175, 0.15, 0.925); transform.updateMatrix(); floor.setMatrixAt(i, transform.matrix);
    const hash = ((i * 127 + 31) % 37) / 37;
    variation.setHSL(0.105, 0.115, 0.32 + hash * 0.095); floor.setColorAt(i, variation);
  }
  floor.instanceMatrix.needsUpdate = true; room.add(floor);
  const backWall = new THREE.InstancedMesh(box, sandstone, 60);
  for (let i = 0; i < 60; i++) {
    const row = Math.floor(i / 15), col = i % 15;
    transform.position.set((col - 7) * 1.14 + (row % 2) * 0.16, 0.45 + row * 0.86, -5.35);
    transform.scale.set(1.105, 0.81, 0.8); transform.updateMatrix(); backWall.setMatrixAt(i, transform.matrix);
    variation.setHSL(0.10, 0.12, 0.33 + ((i * 23) % 11) * 0.006); backWall.setColorAt(i, variation);
  }
  backWall.instanceMatrix.needsUpdate = true; room.add(backWall);
  unit(room, darkStone, 0, 3.9, -5.35, 17.5, 0.37, 1.04);
  unit(room, paleStone, 0, 3.68, -4.94, 17.4, 0.1, 0.15);
  // Cutaway side walls leave the battlefield fully visible.
  for (const side of [-1, 1]) {
    unit(room, sandstone, side * 8.65, 0.52, 0, 0.55, 1.12, 11);
    unit(room, paleStone, side * 8.65, 1.12, 0, 0.72, 0.13, 11.2);
    for (const z of [-4.65, 0.8, 5]) {
      unit(room, darkStone, side * 8.2, 0.14, z, 1.15, 0.26, 1.2);
      unit(room, paleStone, side * 8.2, 0.39, z, 0.83, 0.23, 0.87);
      unit(room, sandstone, side * 8.2, 1.6, z, 0.49, 2.26, 0.49, cylinder);
      unit(room, trim, side * 8.2, 2.74, z, 0.61, 0.14, 0.61, cylinder);
      unit(room, paleStone, side * 8.2, 2.94, z, 0.86, 0.28, 0.86);
    }
  }
  function arch(x) {
    const opening = new THREE.Shape();
    opening.moveTo(-1.13, 0); opening.lineTo(1.13, 0); opening.lineTo(1.13, 1.98);
    opening.absarc(0, 1.98, 1.13, 0, Math.PI, false); opening.lineTo(-1.13, 0);
    add(room, geo(new THREE.ShapeGeometry(opening)), black, x, 0.05, -4.87);
    for (let i = 0; i < 9; i++) {
      const a = (i + 0.5) * Math.PI / 9;
      const stone = unit(room, i === 4 ? paleStone : sandstone, x + Math.cos(a) * 1.36,
        2.03 + Math.sin(a) * 1.36, -4.7, 0.46, 0.49, 0.72);
      stone.rotation.z = a - Math.PI / 2;
    }
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++)
      unit(room, i % 2 ? paleStone : sandstone, x + side * 1.35, 0.28 + i * 0.51, -4.69, 0.5, 0.48, 0.72);
    for (let i = -3; i <= 3; i++) {
      const h = 1.96 + Math.sqrt(Math.max(0, 1.1 ** 2 - (i * 0.28) ** 2));
      unit(room, iron, x + i * 0.28, h / 2, -4.76, 0.055, h, 0.085);
    }
    for (const y of [0.7, 1.65]) unit(room, iron, x, y, -4.67, 2.17, 0.07, 0.09);
    unit(room, brass, x, 1.2, -4.6, 0.14, 0.22, 0.08);
    unit(room, darkStone, x, 0.055, -3.95, 2.78, 0.15, 1.4);
  }
  for (const x of [-5.65, -1.9, 1.9, 5.65]) arch(x);
  for (const x of [-7.48, 0, 7.48]) {
    unit(room, iron, x, 1.42, -4.25, 0.1, 0.75, 0.13);
    unit(room, brass, x, 1.28, -4.13, 0.25, 0.13, 0.25, cylinder);
    const flame = add(room, geo(new THREE.IcosahedronGeometry(0.19, 0)), basic({ color: 0xffcc79 }), x, 1.67, -4.1);
    flame.scale.y = 1.9; animatedFlames.push(flame);
    const halo = add(room, geo(new THREE.CircleGeometry(0.5, 24)), basic({ color: 0xca9151, transparent: true, opacity: 0.13, depthWrite: false }), x, 1.7, -4.81);
    halo.scale.y = 1.4;
  }
  // A suspended cloth pennant breaks the masonry without inventing narrative content.
  for (const x of [-3.76, 3.76]) {
    const shape = new THREE.Shape(); shape.moveTo(-0.36, 0); shape.lineTo(0.36, 0);
    shape.lineTo(0.36, -1.04); shape.lineTo(0, -1.33); shape.lineTo(-0.36, -1.04); shape.closePath();
    add(room, geo(new THREE.ShapeGeometry(shape)), teal, x, 3.16, -4.7);
    unit(room, brass, x, 3.2, -4.65, 0.89, 0.06, 0.11);
    const emblem = unit(room, brass, x, 2.64, -4.62, 0.22, 0.22, 0.045); emblem.rotation.z = Math.PI / 4;
  }

  function laneX(index) { return (index - (laneCount - 1) / 2) * 3.35; }
  function buildLanes(count) {
    laneCount = clamp(number(count, 3), 1, 4);
    lanes.clear(); laneHits.length = 0; laneButtons.length = 0; laneNav.replaceChildren();
    container.style.setProperty('--dg-scene-lane-count', laneCount);
    for (let i = 0; i < laneCount; i++) {
      const x = laneX(i);
      const pad = unit(lanes, darkStone, x, 0.023, 0.03, 3.14, 0.055, 8.1);
      pad.userData.lane = i; laneHits.push(pad);
      for (const edge of [-1, 1]) unit(lanes, trim, x + edge * 1.57, 0.064, 0.03, 0.035, 0.025, 8.12);
      for (let j = 0; j < 7; j++) unit(lanes, trim, x, 0.066, -3.5 + j * 1.1, 3.07, 0.014, 0.018);
      unit(lanes, brass, x, 0.072, 0, 2.85, 0.03, 0.055);
      const diamond = unit(lanes, teal, x, 0.08, 3.6, 0.23, 0.025, 0.23); diamond.rotation.y = Math.PI / 4;
      const button = document.createElement('button'); button.type = 'button';
      button.className = 'dg-scene-lane'; button.dataset.lane = String(i);
      button.innerHTML = `<span>LANE</span><b>${i + 1}</b>`;
      button.setAttribute('aria-label', `Move to lane ${i + 1}`);
      button.addEventListener('click', () => onSelectLane(i));
      laneNav.append(button); laneButtons.push(button);
    }
    resize();
  }

  async function loadArt(key) {
    if (artCache.has(key)) return artCache.get(key);
    const result = (async () => {
      let response = await fetch(`/foes/${key}.svg`);
      if (!response.ok) { failedArt++; response = await fetch('/foes/kingMimic.svg'); }
      if (!response.ok) throw new Error('Creature illustration unavailable');
      const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
      const svg = doc.documentElement;
      const swatch = svg.querySelector('rect[fill]')?.getAttribute('fill') || '#ddc99f';
      // Keep the original authored silhouette, removing only its square UI token backing.
      for (const rect of Array.from(svg.children).filter((node) => node.localName === 'rect')) rect.remove();
      svg.setAttribute('width', '384'); svg.setAttribute('height', '384');
      // Original silhouettes are dark ink. Their token's own color now paints the standee.
      for (const group of svg.querySelectorAll('g[fill]')) group.setAttribute('fill', '#ffffff');
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      try { image.src = url; await image.decode(); } finally { URL.revokeObjectURL(url); }
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 384;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      // Thin dark cut edges make the physical figure legible against light and dark stone.
      for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) ctx.drawImage(image, dx, dy, 384, 384);
      ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#172528'; ctx.fillRect(0, 0, 384, 384);
      ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(image, 0, 0, 384, 384);
      ctx.globalCompositeOperation = 'source-atop';
      const pigment = ctx.createLinearGradient(0, 0, 200, 384);
      pigment.addColorStop(0, '#f6e5bb'); pigment.addColorStop(0.24, swatch); pigment.addColorStop(1, '#98784d');
      ctx.fillStyle = pigment; ctx.fillRect(0, 0, 384, 384);
      ctx.globalCompositeOperation = 'source-over';
      const alpha = ctx.getImageData(0, 0, 384, 384).data;
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.add(texture);
      if (disposed) texture.dispose();
      return { texture, alpha };
    })().catch(() => { failedArt++; return null; });
    artCache.set(key, result); return result;
  }

  function newActor(id) {
    const group = new THREE.Group(); scene.add(group);
    const base = add(group, cylinder, darkStone, 0, 0.11, 0); base.scale.set(0.61, 0.18, 0.61);
    const lip = add(group, cylinder, brass, 0, 0.22, 0); lip.scale.set(0.56, 0.045, 0.56);
    const shadow = add(group, plane, contactShadow, 0, 0.071, 0); shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1.7, 1.7, 1);
    const selection = add(group, ring, tealGlow, 0, 0.075, 0); selection.rotation.x = -Math.PI / 2;
    const figureMaterial = basic({ transparent: true, alphaTest: 0.15, side: THREE.DoubleSide, color: 0xffffff });
    const figure = add(group, plane, figureMaterial, 0, 1.17, 0);
    figure.scale.set(2.25, 2.25, 1); figure.rotation.x = -0.1;
    figure.visible = false;
    const label = document.createElement('button'); label.type = 'button'; label.className = 'dg-scene-actor'; label.dataset.entityId = id;
    label.innerHTML = '<span class="dg-scene-identity"></span><span class="dg-scene-name"></span><span class="dg-scene-vitals"></span><span class="dg-scene-hp"><i></i></span><span class="dg-scene-intent"></span><span class="dg-scene-cast"><i></i></span>';
    labels.append(label);
    const actor = { id, group, base, lip, selection, figure, figureMaterial, label,
      identity: label.children[0], name: label.children[1], vitals: label.children[2],
      hpBar: label.children[3].firstElementChild, intent: label.children[4], castBar: label.children[5].firstElementChild,
      position: new THREE.Vector3(), anchor: new THREE.Vector3(), key: '', entry: null, art: null,
      phase: actors.size * 1.7, hurtUntil: 0, hp: null, scale: 1, screen: null,
    };
    base.userData.actor = actor; figure.userData.actor = actor;
    label.addEventListener('click', () => select(actor)); actors.set(id, actor); return actor;
  }
  function select(actor) { if (actor.entry) onSelectEntity({ id: actor.entry.entity.id, side: actor.entry.side, lane: actor.entry.lane, entity: actor.entry.entity }); }
  function removeActor(actor) {
    actor.group.removeFromParent(); actor.label.remove();
    actor.figureMaterial.dispose(); materials.delete(actor.figureMaterial); actors.delete(actor.id);
  }
  function update(snapshot = {}) {
    if (disposed) return;
    latest = snapshot || {};
    const state = latest.state;
    if (!state) { renderOnce(); return; }
    const count = clamp(number(state.laneCount, state.lanes?.length || 3), 1, 4);
    if (count !== laneCount) buildLanes(count);
    container.dataset.phase = state.phase || '';
    container.dataset.floor = String(state.floor || 1);
    const active = (state.players || []).find((player) => player.id === latest.activeId);
    const entries = [];
    for (let i = 0; i < laneCount; i++) {
      const lane = state.lanes?.[i] || {};
      (lane.enemies || []).forEach((entity, index) => entries.push({ entity, id: entity.id, side: 'foe', lane: i, index }));
      const friendly = [...(state.players || []).filter((entity) => number(entity.lane) === i).map((entity) => ({ entity, side: 'hero' })),
        ...(lane.allies || []).map((entity) => ({ entity, side: 'ally' }))].sort((a, b) => number(a.entity.depth) - number(b.entity.depth));
      friendly.forEach(({ entity, side }, index) => entries.push({ entity, id: entity.id, side, lane: i, index }));
    }
    // Back-line bosses are public entities outside lanes; show one substantial central body.
    if (state.boss && !entries.some((entry) => String(entry.id) === String(state.boss.id)))
      entries.push({ entity: state.boss, id: state.boss.id, side: 'foe', lane: Math.floor((laneCount - 1) / 2), index: 0, backBoss: true });
    const existing = new Set();
    for (const entry of entries) {
      if (entry.id == null) continue;
      const id = String(entry.id), e = entry.entity; existing.add(id);
      const fresh = !actors.has(id), actor = actors.get(id) || newActor(id);
      const siblings = entries.filter((other) => other.lane === entry.lane && (other.side === 'foe') === (entry.side === 'foe') && !other.backBoss);
      const total = siblings.length, columns = total > 1 ? 2 : 1;
      const row = Math.floor(entry.index / columns), column = entry.index % columns;
      const rowSize = Math.min(columns, total - row * columns);
      actor.scale = total <= 1 ? 1 : total === 2 ? 0.8 : total <= 4 ? 0.67 : 0.52;
      const x = laneX(entry.lane) + (column - (rowSize - 1) / 2) * (2.9 / columns);
      // Index zero is the public front. Stagger subsequent figures away from combat's
      // center line; position badges remain unambiguous when a crowded lane fans out.
      const depthOffset = Math.min(entry.index, 8) * 0.15 + Math.min(row, 3) * 0.7;
      const z = entry.side === 'foe' ? -1.48 - depthOffset : 1.55 + depthOffset;
      actor.position.set(entry.backBoss ? 0 : x * horizontalStretch, 0, entry.backBoss ? -3.4 : z);
      if (entry.backBoss) actor.scale = 1.15;
      actor.group.scale.setScalar(actor.scale);
      if (fresh) actor.group.position.copy(actor.position);
      actor.entry = entry;
      actor.columns = columns;
      const key = artFor(e);
      if (actor.key !== key) {
        actor.key = key; actor.art = null; actor.figure.visible = false;
        loadArt(key).then((art) => {
          if (disposed || !actors.has(id) || actor.key !== key || !art) return;
          actor.art = art; actor.figureMaterial.map = art.texture; actor.figureMaterial.needsUpdate = true;
          actor.figure.visible = true; renderOnce();
        });
      }
      if (actor.hp != null && number(e.hp) < actor.hp) actor.hurtUntil = performance.now() + 280;
      actor.hp = number(e.hp);
      const owned = entry.side === 'hero' && (e.owner === latest.you || e.id === latest.you);
      const isActive = e.id === latest.activeId;
      const selected = e.id === latest.selectedId || (entry.side === 'foe' && e.id === active?.targetId);
      const alive = e.alive !== false && (e.hp == null || number(e.hp) > 0);
      actor.selection.visible = selected || isActive || entry.side === 'hero';
      actor.selection.material = selected ? goldGlow : entry.side === 'hero' ? tealGlow : enemyGlow;
      actor.selection.scale.setScalar(selected ? 1.12 : 1);
      actor.figureMaterial.opacity = alive ? 1 : 0.4;
      actor.label.classList.toggle('dg-scene-selected', !!selected);
      actor.label.classList.toggle('dg-scene-active', !!isActive);
      actor.label.classList.toggle('dg-scene-down', !alive);
      actor.label.classList.toggle('dg-scene-small', total >= 3);
      actor.label.dataset.side = entry.side;
      actor.label.style.setProperty('--dg-scene-seat', /^#[0-9a-f]{3,8}$/i.test(e.color || '') ? e.color : '#71cfc1');
      const bodyName = state.bodies?.[e.bodyKey]?.name || (entry.side === 'hero' ? 'Mimic' : e.name) || 'Creature';
      const creatureName = entry.side === 'hero' ? bodyName : e.name || bodyName;
      const orderLabel = entry.index === 0 ? 'FRONT' : `#${entry.index + 1} IN LINE`;
      actor.identity.textContent = entry.side === 'hero' ? `${owned ? 'YOU' : 'ALLY'}${isActive ? ' · ACTIVE' : ''}${e.name ? ` · ${e.name}` : ''}`
        : entry.side === 'ally' ? `SUMMON${e.ratCount > 1 ? ` ×${e.ratCount}` : ''} · ${orderLabel}`
          : entry.backBoss ? 'BOSS · BACK' : `${e.boss ? 'BOSS · ' : ''}${orderLabel}`;
      actor.name.textContent = creatureName;
      actor.vitals.textContent = `${alive ? '♥' : 'DOWN'} ${number(e.hp)}/${number(e.maxHp, e.hp)}${number(e.shield) > 0 ? `  ◈ ${e.shield}` : ''}${e.warded ? ' · WARD' : ''}`;
      actor.hpBar.style.transform = `scaleX(${clamp(number(e.hp) / Math.max(1, number(e.maxHp)), 0, 1)})`;
      const intent = publicIntent(e);
      actor.intent.textContent = entry.side === 'hero' && !e.intentCard ? '' : intent.text;
      actor.intent.title = intent.full;
      actor.castBar.style.transform = `scaleX(${intent.frac})`;
      actor.label.classList.toggle('dg-scene-harm', intent.harm);
      actor.label.setAttribute('aria-label', `${creatureName}, ${actor.identity.textContent}, ${actor.vitals.textContent}${actor.intent.textContent ? `, next: ${intent.text}` : ''}`);
      actor.label.title = [creatureName, actor.identity.textContent, `${number(e.hp)} of ${number(e.maxHp)} health`, number(e.shield) > 0 ? `${e.shield} shield` : '', intent.full].filter(Boolean).join(' · ');
    }
    for (const actor of actors.values()) if (!existing.has(actor.id)) removeActor(actor);
    laneButtons.forEach((button, i) => {
      button.classList.toggle('dg-scene-current-lane', active?.lane === i);
      button.setAttribute('aria-pressed', String(active?.lane === i));
    });
    renderOnce(); startLoop();
  }

  function projectLabels(now) {
    const lanePixels = Math.min(width / laneCount, 3.35 * horizontalStretch * width / worldWidth);
    for (const actor of actors.values()) {
      const entry = actor.entry; if (!entry) continue;
      actor.group.getWorldPosition(projection);
      projection.y += actor.scale * 1.92;
      projection.project(camera);
      const x = (projection.x * 0.5 + 0.5) * width;
      let y = (-projection.y * 0.5 + 0.5) * height;
      // On short phones, friendly names sit at their feet. Putting both sides' labels
      // above their heads hides the enemy behind its defender's nameplate.
      if (height < 290 && entry.side !== 'foe') y = height - 31;
      const maxWidth = clamp(lanePixels * (actor.columns > 1 ? 0.83 / actor.columns : 0.85), 44, 186);
      // Labels have a stable anchor and a clipped width; the live body remains the hit target.
      actor.label.style.width = `${Math.round(maxWidth)}px`;
      y = clamp(y, actor.label.offsetHeight + 4, height - 34);
      actor.label.style.left = `${Math.round(clamp(x, maxWidth / 2 + 3, width - maxWidth / 2 - 3))}px`;
      actor.label.style.top = `${Math.round(y)}px`;
      actor.label.style.zIndex = String(actor.label.classList.contains('dg-scene-selected') ? 40 : 10 + Math.round(actor.group.position.z));
      actor.screen = { x: clamp(x, maxWidth / 2 + 3, width - maxWidth / 2 - 3), y,
        width: maxWidth, height: actor.label.offsetHeight, lane: entry.lane, side: entry.side };
      actor.figureMaterial.color.set(now < actor.hurtUntil ? 0xffa4a0 : 0xffffff);
    }
    // Crowded lanes keep separate label rows. Only labels whose horizontal intervals
    // intersect are moved; normal one-body lanes retain their precise world anchor.
    const labelGroups = new Map();
    for (const actor of actors.values()) {
      if (!actor.screen) continue;
      const groupKey = `${actor.entry.lane}:${actor.entry.side === 'foe' ? 'foe' : 'friend'}`;
      if (!labelGroups.has(groupKey)) labelGroups.set(groupKey, []);
      labelGroups.get(groupKey).push(actor);
    }
    for (const group of labelGroups.values()) {
      if (group.length < 2) continue;
      // On phones, align the friendly labels in a small grid below the fight.
      // World-projected staggered columns can otherwise form a three-label chain
      // that pushes the last name upward over the enemy's intent.
      if (height < 290 && group[0].entry.side !== 'foe') {
        group.sort((a, b) => a.entry.index - b.entry.index);
        const columns = group.length > 4 ? 3 : 2;
        const rows = Math.ceil(group.length / columns);
        const cellWidth = lanePixels * 0.92 / columns;
        projection.set(laneX(group[0].entry.lane) * horizontalStretch, 0, 2).project(camera);
        const centerX = (projection.x * 0.5 + 0.5) * width;
        group.forEach((actor, index) => {
          const column = index % columns, row = Math.floor(index / columns);
          actor.screen.x = clamp(centerX + (column - (columns - 1) / 2) * cellWidth, cellWidth / 2 + 3, width - cellWidth / 2 - 3);
          actor.screen.y = height - 34 - (rows - 1 - row) * 28;
          actor.screen.width = cellWidth - 3;
          actor.label.style.left = `${Math.round(actor.screen.x)}px`;
          actor.label.style.top = `${Math.round(actor.screen.y)}px`;
          actor.label.style.width = `${Math.round(actor.screen.width)}px`;
        });
        continue;
      }
      group.sort((a, b) => a.screen.y - b.screen.y);
      for (let i = 0; i < group.length; i++) {
        const current = group[i].screen;
        for (let j = 0; j < i; j++) {
          const previous = group[j].screen;
          if (Math.abs(current.x - previous.x) < (current.width + previous.width) / 2 + 2
            && current.y - current.height < previous.y + 2)
            current.y = previous.y + current.height + 2;
        }
      }
      const bottom = group[0].entry.side === 'foe' ? height * 0.53 : height - 34;
      const overflow = Math.max(0, Math.max(...group.map((actor) => actor.screen.y)) - bottom);
      const headroom = Math.max(0, Math.min(...group.map((actor) => actor.screen.y - actor.screen.height)) - 4);
      const shift = Math.min(overflow, headroom);
      for (const actor of group) {
        actor.screen.y -= shift;
        actor.label.style.top = `${Math.round(actor.screen.y)}px`;
      }
    }
    for (let i = 0; i < laneButtons.length; i++) {
      projection.set(laneX(i) * horizontalStretch, 0, 4.25).project(camera);
      const x = clamp((projection.x * 0.5 + 0.5) * width, 24, width - 24);
      laneButtons[i].style.left = `${Math.round(x)}px`;
    }
  }
  function draw(now, animate) {
    if (disposed || width < 2 || height < 2) return;
    for (const actor of actors.values()) {
      if (animate) actor.group.position.lerp(actor.position, 0.17); else actor.group.position.copy(actor.position);
      const alive = actor.entry?.entity.alive !== false && actor.hp > 0;
      actor.figure.rotation.z = alive && !reducedMotion ? Math.sin(now * 0.0016 + actor.phase) * 0.016 : 0;
      actor.figure.position.y = 1.17 + (alive && !reducedMotion ? Math.sin(now * 0.0022 + actor.phase) * 0.018 : 0);
    }
    for (let i = 0; i < animatedFlames.length; i++) animatedFlames[i].scale.y = 1.8 + (!reducedMotion ? Math.sin(now * 0.005 + i) * 0.16 : 0);
    scene.updateMatrixWorld(); camera.updateMatrixWorld(); projectLabels(now);
    renderer.render(scene, camera); frameCount++;
  }
  function renderOnce() { if (visible && !document.hidden) draw(performance.now(), false); }
  function frame(now) {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    // 30 Hz for decorative motion; authoritative updates still draw immediately.
    if (now - lastFrame >= 32) { lastFrame = now; draw(now, true); }
    if (!reducedMotion) raf = requestAnimationFrame(frame);
  }
  function startLoop() { if (!raf && !disposed && visible && !document.hidden && !reducedMotion) raf = requestAnimationFrame(frame); }
  function resize() {
    if (disposed) return;
    const rect = container.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const halfHeight = Math.max(2.85, (Math.max(10.5, laneCount * 3.35 + 1.9) / aspect) / 2);
    worldWidth = halfHeight * aspect * 2;
    horizontalStretch = height < 290 ? Math.max(1, Math.min(2.15, worldWidth / (laneCount * 3.35 + 4))) : 1;
    room.scale.x = horizontalStretch; lanes.scale.x = horizontalStretch;
    camera.left = -worldWidth / 2; camera.right = worldWidth / 2; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.position.set(3.4, 11.2, 20); camera.lookAt(0, 1.0, 0);
    camera.updateProjectionMatrix();
    container.classList.toggle('dg-scene-short', height < 290);
    renderOnce(); startLoop();
  }
  function pointerUp(event) {
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 8) { down = null; return; }
    down = null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(Array.from(actors.values()).flatMap((actor) => [actor.figure, actor.base]), false);
    for (const hit of hits) {
      const actor = hit.object.userData.actor;
      if (hit.object === actor.figure) {
        if (!actor.figure.visible || !actor.art || !hit.uv) continue;
        const x = clamp(Math.floor(hit.uv.x * 384), 0, 383), y = clamp(Math.floor((1 - hit.uv.y) * 384), 0, 383);
        if (actor.art.alpha[(y * 384 + x) * 4 + 3] < 40) continue;
      }
      select(actor); return;
    }
    const hit = raycaster.intersectObjects(laneHits, false)[0];
    if (hit) onSelectLane(hit.object.userData.lane);
  }
  let down = null;
  const pointerDown = (event) => { down = { x: event.clientX, y: event.clientY }; };
  const cancelPointer = () => { down = null; };
  const visibilityChange = () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
    else { renderOnce(); startLoop(); }
  };
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', cancelPointer);
  document.addEventListener('visibilitychange', visibilityChange);
  const observer = new ResizeObserver(resize); observer.observe(container);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { cancelAnimationFrame(raf); raf = 0; } else { resize(); startLoop(); }
  }); intersection.observe(container);
  buildLanes(3); startLoop();
  return {
    update, resize,
    getDiagnostics() {
      return { renderer: 'three', webgl: true, entities: actors.size, entityCount: actors.size,
        labels: actors.size, laneCount, width, height, frameCount, failedArt, visible,
        drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
        entityBounds: Array.from(actors.values()).map((actor) => {
          const rect = actor.label.getBoundingClientRect();
          return { id: actor.id, side: actor.entry?.side, lane: actor.entry?.lane, artReady: !!actor.art,
            x: rect.x, y: rect.y, width: rect.width, height: rect.height, text: actor.label.innerText };
        }),
      };
    },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(raf);
      observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', visibilityChange);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', cancelPointer);
      for (const actor of actors.values()) actor.label.remove(); actors.clear();
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of textures) texture.dispose();
      renderer.dispose(); renderer.domElement.remove(); labels.remove(); laneNav.remove();
      container.classList.remove('dg-scene-root', 'dg-scene-short');
    },
  };
}
