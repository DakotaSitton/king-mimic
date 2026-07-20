# Public-alpha release review — 2026-07-20

## Verdict

**NO-SHIP for the first compensation campaign yet.** The integrated candidate is materially closer,
and I found no Critical defect, but one High symmetry failure remains in live gameplay and one High
persistence defect required the fix in `a1b1cec`. A limited playtest build is reasonable only after
that fix is integrated and the final commit passes the normal local and deployed lifecycle gates.

Reviewed base: `661b19a9ce1ce28c7ed117dfdd6658aad2609288` (`8c4013a..661b19a`, actual
diffs/history, not agent summaries).

Later integration seams inspected from Git objects but not used as the review base:

- `e419ba7` ignores local `active-runs.v8` and temp snapshots.
- `4a6e0ed` adds the tested `--source itch` telemetry funnel.
- `d3fb939` grants the itch iframe `clipboard-write` and `web-share`; root reports its focused gate
  at 11/11.

Those three commits close useful seams but do not change the unresolved live foe-target behavior.

## Findings

### Critical

None found.

### High

#### H1 — valid long-lived saves were rejected above entity ID 50,000 — fixed

`server.js` rejected the entire restored set if any scanned card, foe, node, offer, bundle, or player
ID exceeded `50_000`. These counters grow through ordinary production play and are intentionally
carried forward across deploys; the serializers and counter-floor APIs already accept safe integers.
After enough sessions, an active room would therefore be saved successfully and then discarded at
the next restart solely because the service had been alive long enough.

Fix: `a1b1cec Remove arbitrary persistence ID ceiling`. It rejects only values that cannot be
advanced exactly as JavaScript safe integers. A new real server restart/reconnect regression restores
a room containing card `c50001` and preserves the exact ID. Persistence gate after the fix: **43/0**.

#### H2 — the live foe AI still makes Haste a different card in enemy hands — unresolved

The resolver now honors `allyTargetId` symmetrically, but `foeCast` never chooses or assigns an ally
target. The symmetry test explicitly injects that ID and now acknowledges that it does not test live
foe selection. A live probe with two foes and `oHaste` produced:

```text
cast=true, caster haste=1, ally haste=0, caster.allyTargetId=undefined
```

Thus the authored card text “You (or your ally-target) gain double moxie” still has player-selectable
ally behavior and foe self-only behavior. The resolver refactor fixed the capability seam, not the
observable gameplay violation that motivated the release gate. I did not invent a foe support-target
policy: choosing self, lowest HP, highest threat, random, or another rule is design authority. Until
Dakota supplies that policy or narrows the symmetry promise, this conflicts directly with the game's
stated mimicry premise.

### Medium

#### M1 — “foe shield telemetry parity” is not an outcome the system currently provides

Combat metrics are intentionally player-ledger-only. Real foe shielding still emits no foe metric
row. `test/symmetry.test.js` now checks source text to prove that four shared handlers call
`recordShieldGrantMetric`; it does not prove foe shield data reaches telemetry. That is honest as a
resolver-hook contract, but release notes and balance audits must not claim foe shielding is now
observable unless the telemetry schema is deliberately expanded and behavior-tested.

#### M2 — incompatible snapshots are not quarantined before being overwritten

Decode failure warns and boots empty, as specified. However, the rejected file remains at the live
path, and the next scheduled or graceful forced flush atomically replaces it with an empty/current
snapshot. A valid older-version file is therefore unavailable for rollback or migration after that
point. This does not block schema v1 today, but any future version bump needs migration or rejected-file
quarantine before deploy.

#### M3 — production volume continuity is configured, not yet proven for this feature

Repository history documents Railway's mounted `/var/data` volume and `KM_DATA_DIR=/var/data`, and
the local restart test faithfully reuses one data directory across two real Bun servers. The actual
new build has not yet been demonstrated by creating a normal production run, redeploying/restarting
Railway, reclaiming the same token/seat, and advancing the restored run. That is the acceptance test
for the deploy-survival claim; `/health` and the local binary round-trip cannot substitute for it.

#### M4 — two documented release gates are still absent from CI

The workflow now enforces the new persistence, symmetry, public-entry, itch, and most existing engine
suites. It still omits `test/admission.test.js` and `test/name-safety.test.js`, even though `CLAUDE.md`
calls both part of the fuller release battery. Name safety needs a browser provisioned in CI, so the
current manual release run can cover it, but these remain permanent-regression gaps. Real mobile and
multiplayer lifecycle runs remain correctly documented as manual rather than headless CI gates.

### Low / operational observations

- The persistence writer serializes every active room synchronously on the game process. This is
  acceptable evidence for the initial 50-visitor cohort, but no 256-room load test bounds tick pause
  or snapshot size yet.
- The current production response returned HTTP 200 without `X-Frame-Options` or a framing CSP, so
  the external itch iframe is not presently blocked by the game host. The package is deterministic
  and has an explicit direct-open fallback. An actual restricted itch upload still needs desktop and
  phone preview; a local ZIP test cannot prove itch's surrounding frame behavior.
- Entry-room values and invite codes flow through closed sanitizers and are rendered with
  `textContent`; the acquisition source is a closed `itch` vocabulary. I found no new XSS or
  arbitrary-telemetry-data sink in these paths.

## Commands and evidence

```text
git log --oneline --decorate --graph -12
git diff --stat 8c4013a..661b19a
git diff --name-status 8c4013a..661b19a
git show / git diff for every changed persistence, entry, distribution, symmetry, and CI file

bun run test/run-persistence.test.js
  reviewed base: RUN PERSISTENCE 40 passed, 0 failed
  after a1b1cec: RUN PERSISTENCE 43 passed, 0 failed

bun run test/public-entry.test.js
  PUBLIC ENTRY 22 passed, 0 failed
bun run test/symmetry.test.js
  ALL PASS 28 passed, 0 failed
bun run test/itch-package.test.js
  ITCH PACKAGE 10 passed, 0 failed (review base before d3fb939's added permission assertion)

live foeCast probe with oHaste
  cast=true; caster haste=1; allied foe haste=0; allyTargetId=undefined

curl -D - https://king-mimic-production.up.railway.app/?source=itch
  HTTP 200; no X-Frame-Options; no Content-Security-Policy response header

git diff --check
  clean
```

I deliberately did not duplicate the full deterministic/browser suite; the primary integrator owns
the final-head full battery and production lifecycle after all review fixes are merged.

## Remaining owner decisions

1. Specify the live foe support-target policy for Haste and future ally-target cards, or explicitly
   rule that different decision machinery is compatible with the symmetry promise.
2. Make the pending balance calls only after the frozen-build owner and stranger run protocol; the
   simulator is bot-policy evidence, not human difficulty evidence.
3. Choose itch page copy/images, donation amount, payment provider, revenue share, and publication
   state. Fixed paid access still requires a downloadable product rather than this HTML donation
   launcher.
4. Decide a public data-retention/contact policy for stored names, room codes, gameplay events,
   combat logs, and active reconnect tokens before a broad compensation campaign.

## Ship condition

Move from **NO-SHIP** to **ship the limited public alpha** when all of the following are true:

1. `a1b1cec` is integrated.
2. H2 receives an owner ruling and a live foe-cast regression (or the product symmetry claim is
   deliberately narrowed).
3. The final integrated commit passes the repository's complete local release battery, real mobile
   lifecycle, and multiplayer harness.
4. The deployed commit passes the production mobile lifecycle and one real deploy/restart/reconnect/
   forward-progress run on the mounted Railway volume.
5. The restricted itch upload is previewed successfully on desktop and phone before publication.
