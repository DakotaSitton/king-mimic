// Ordered async disk appends for hot-path logging (telemetry, combat logs). The server runs on a
// single event loop shared by every room's simulation and every socket send; a synchronous append
// to the network-attached data volume can therefore freeze the whole game for every connected
// player at once (owner-reported 2026-07-24: multi-second shared freezes in production, solo and
// co-op). This queue keeps append ORDER per process while moving the actual I/O off the loop.
//
// Guarantees:
//   • strict FIFO across all files (one chain), so telemetry.jsonl lines never reorder
//   • bounded depth — under a stalled disk the queue drops NEW lines (loudly, counted) instead of
//     growing without limit; gameplay never blocks either way
//   • errors are warned and swallowed: logging must never take the server down

import { promises as fsp } from "node:fs";

export function createDiskQueue({ appendFile = (file, data) => fsp.appendFile(file, data),
  warn = (message) => console.warn(message), maxDepth = 5_000 } = {}) {
  let chain = Promise.resolve();
  let depth = 0;
  let dropped = 0;
  let lastErrorAt = 0;

  const append = (file, data) => {
    if (depth >= maxDepth) {
      dropped++;
      if (dropped === 1 || dropped % 1_000 === 0)
        warn(`[disk-queue] backlog full (${maxDepth}); dropped ${dropped} line(s) — disk stalled?`);
      return;
    }
    depth++;
    chain = chain
      .then(() => appendFile(file, data))
      .catch((error) => {
        const now = Date.now();
        if (now - lastErrorAt > 5_000) {   // one warning per burst, not one per line
          lastErrorAt = now;
          warn(`[disk-queue] append to ${file} failed: ${error?.message ?? error}`);
        }
      })
      .finally(() => { depth--; });
  };

  // Bounded wait for pending appends (graceful shutdown). Never hangs on a stalled disk.
  const drain = (timeoutMs = 2_000) => Promise.race([
    chain.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs)),
  ]);

  return { append, drain, get depth() { return depth; }, get dropped() { return dropped; } };
}
