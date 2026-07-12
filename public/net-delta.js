// King Mimic — snapshot DELTA codec (perf/net, 2026-07-11). One file, BOTH sides:
//   • server.js imports it (Bun/CJS) and DIFFS consecutive snapshots into a flat op list;
//   • the browser loads it as a classic <script> (window.KMDelta) and APPLIES ops in place.
// Keeping diff+apply in one shared file means the two can never drift apart in a deploy.
//
// WIRE SHAPE (deliberately plain JSON for debuggability — never binary):
//   full  : { ...snapshot, type:"state", seq }                  (keyframe / join / recovery)
//   delta : { type:"delta", seq, base, ops:[ {p,v} | {p,d:1} ] } (base = the seq it patches)
// An op's `p` is a "/"-joined key path from the snapshot root ("" root → paths start "/").
//   {p,v}   set the value at the path (arrays grow by index-set; "/length" truncates them)
//   {p,d:1} delete the key at the path
// Snapshot keys are engine field names / card & node ids — none contain "/", so no escaping.
// Ops are emitted parent-first and never overlap: a replaced subtree is ONE op, never both a
// parent set and a child set.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;   // Bun / node (CJS interop)
  else root.KMDelta = api;                                                     // browser classic script
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const isObj = (v) => v !== null && typeof v === "object";

  // diffSnap(prev, next) → flat op list transforming prev INTO next. Reference-equal subtrees
  // short-circuit (snapshot() reuses e.g. the cached publicBodies object, so the static bulk
  // costs nothing). `undefined` values are treated as ABSENT keys — JSON.stringify drops them
  // from the full keyframe, so the diff must see them the same way the client does.
  function diffSnap(prev, next) {
    const ops = [];
    walk(prev, next, "", ops);
    return ops;
  }

  function walk(a, b, path, ops) {
    if (a === b) return;
    const aArr = Array.isArray(a), bArr = Array.isArray(b);
    if (aArr && bArr) {
      const n = Math.min(a.length, b.length);
      for (let i = 0; i < n; i++) walk(a[i], b[i], path + "/" + i, ops);
      for (let i = a.length; i < b.length; i++) ops.push({ p: path + "/" + i, v: b[i] });
      if (b.length < a.length) ops.push({ p: path + "/length", v: b.length });
      return;
    }
    if (isObj(a) && isObj(b) && !aArr && !bArr) {
      for (const k in b) {
        const bv = b[k];
        if (bv === undefined) { if (a[k] !== undefined) ops.push({ p: path + "/" + k, d: 1 }); continue; }
        if (a[k] === undefined) ops.push({ p: path + "/" + k, v: bv });
        else walk(a[k], bv, path + "/" + k, ops);
      }
      for (const k in a) if (!(k in b) && a[k] !== undefined) ops.push({ p: path + "/" + k, d: 1 });
      return;
    }
    ops.push({ p: path, v: b });   // primitive change or kind mismatch → replace the subtree whole
  }

  // applyOps(target, ops) — mutate `target` in place. Throws on a broken path (a seq gap or a
  // bug), which the client catches and answers with a keyframe request — never a corrupt board.
  function applyOps(target, ops) {
    for (const op of ops) {
      const segs = op.p.split("/");                 // segs[0] === "" (paths start at the root "/")
      let o = target;
      for (let i = 1; i < segs.length - 1; i++) {
        o = o[segs[i]];
        if (o === null || typeof o !== "object") throw new Error("delta path broken at " + op.p);
      }
      const last = segs[segs.length - 1];
      if (op.d) delete o[last];
      else o[last] = op.v;                          // array "length" assignment truncates — intended
    }
    return target;
  }

  return { diffSnap, applyOps };
});
