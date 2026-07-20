# King Mimic public-alpha and first-payment protocol

## Goal

Reach one honest commercial fact: a stranger who was not personally coached chooses to give
Dakota money because of King Mimic.

This protocol separates four questions that require different evidence:

1. **Does the build function?** Automated suites and restart/reconnect probes answer this.
2. **Does the run shape resemble Dakota's intended game?** Simulation plus a small owner run set
   answers this well enough to tune.
3. **Can a stranger understand and enjoy it unaided?** Fresh-player sessions answer this.
4. **Will a stranger pay?** Only a real checkout answers this. Survey answers do not count.

Freeze gameplay content while running a cohort. Code may change between cohorts, never halfway
through one. Record the deployed commit with every result.

## Gate 0 — automated balance baseline

Before Dakota grinds human runs, run the live-lifecycle simulator on the candidate build:

- 1,000 solo runs.
- 1,000 two-player runs.
- Separate results by floor, ordinary/elite/boss, boss identity, starter body, run depth, fight
  duration, and stall.
- Keep automated results tagged as automated. They reveal structural walls and regressions; they
  do not predict whether humans understand or enjoy the game.

Do not tune against the July 18 audit or a mixed-build telemetry file.

Completed for the current candidate in [BALANCE_BASELINE_2026-07-20.md](BALANCE_BASELINE_2026-07-20.md):
1,000 seeded solo runs plus 1,000 seeded two-player runs. Regenerate it after any gameplay-content
change before comparing human results.

The first owner play on July 20 is retained as [pre-freeze shakedown evidence](OWNER_RUN_LOG_2026-07-20.md),
not counted inside Gate 1. It exposed a legal Basilisk one-moxie poison loop plus battlefield and
victory-screen defects that required gameplay/client changes. Gate 1 therefore restarts at run 1 on
the repaired, deployed, frozen candidate; do not mix the pre-fix victory into that cohort.

## Gate 1 — Dakota's owner set: exactly 8 honest runs

Run all eight on one frozen deployed commit, without cheats, rerolls, or mid-run balance edits.
Finish each at death or throne unless the game is mechanically stalled.

| Runs | Configuration | What it tests |
|---:|---|---|
| 1–2 | Solo, phone landscape, manual play | Primary touch loop and ordinary owner strategy |
| 3 | Solo, phone landscape, AUTO/plan-heavy | Automation legibility and viability |
| 4 | Solo, desktop, manual | Non-touch entry, targeting, and layout |
| 5–6 | Two humans, phone host + desktop guest | Join/invite flow, co-op coordination, mixed devices |
| 7 | Two humans with host/device roles swapped | Host assumptions and reconnect identity |
| 8 | Two humans; reconnect one seat mid-combat and restart/deploy between rooms | Real recovery contract |

Across runs 1–7, deliberately take different offered lines rather than forcing eight versions of the
best-known damage build. Cover at least one damage-forward, one sustain/control, one summon, and one
high-cost/resource line **when the draft offers them**. Never reroll to manufacture coverage.

For each run record only:

- deployed commit, device(s), party size, run id;
- deepest floor and result;
- chosen starting body and the run's main line;
- the first moment the game behaved differently from the printed rules;
- the first moment the next useful action was unclear;
- whether Dakota voluntarily wanted another run immediately.

Eight owner runs are a design diagnostic, not a win-rate sample. Stop at eight and use the simulator
and stranger cohorts for breadth.

## Gate 2 — fresh-stranger comprehension: 5 solo sessions

Recruit five people who play deckbuilders or roguelikes and have never watched Dakota play. Give each
only the public link and this sentence:

> Please play until the run ends or you choose to stop. I will not explain the controls, but I want
> you to say what you think is happening.

Do not rescue them during the first 15 minutes. Observe separately; never put all five into one group
session. Afterward ask, without correcting them first:

1. What is the game's central rule or hook?
2. What were you trying to do during combat?
3. Why did your run end, or why did you stop?
4. What would you do differently in another run?
5. Do you want another run now? (Offer it; behavior counts more than the answer.)

Pass this qualitative gate when at least four of five can start combat unaided, correctly explain the
mimic/body rule and moxie/card loop, and identify why they won or lost. Any deploy loss, unrecoverable
join failure, silent no-op, or rule-text betrayal is a cohort-stopping defect.

Fix the repeated blockers before recruiting the next cohort. Do not add a modal tutorial by default;
repair the affordance, card text, opening structure, or feedback that failed to teach.

## Gate 3 — fresh-stranger co-op: 5 sessions / 10 people

Use five new pairs. Give each pair only the public link; one person must invite the other without
Dakota reading the code aloud or telling them where to tap.

Required coverage across the five sessions:

- at least two phone + phone pairs;
- at least two phone + desktop pairs;
- one deliberate disconnect/reconnect;
- one session that pauses and resumes after a server restart between rooms;
- host roles distributed across devices.

Pass when all five pairs enter the same run without operator intervention, no run is lost to
infrastructure, and at least four pairs can explain what their partner contributed. Record whether
either player initiates another run or shares the link onward.

## Gate 4 — fresh validation after fixes: 5 unobserved sessions

After repairing Gates 2–3, send the final candidate to five new sessions without live observation:
three solo and two co-op. Ask for the run id and the five post-session answers afterward. This catches
fixes that worked only while Dakota was watching.

The build may proceed to the money experiment when:

- no session was destroyed by deploy/reconnect/join failure;
- no repeated printed-rule betrayal remains;
- at least four of five sessions reach combat unaided;
- at least three of five sessions produce a voluntary replay or forward share;
- telemetry and the participants' explanations agree about where the run ended.

These are release gates, not claims of statistical market demand.

## Gate 5 — first real money experiment

Use a storefront checkout rather than asking "would you pay?" The lowest-friction first experiment is
an itch.io HTML5 page marked **In development**, playable for free, with pay-what-you-want donations.
The page should use the same build, hook, screenshots, and short clip as the shared link.

Dakota owns the final price/copy decision. A reasonable experiment to rule on is a $0 minimum with a
visible suggested contribution; do not silently choose the suggested amount in code.

Send 50 **qualified strangers** to the page: people reached through game/deckbuilder/roguelike
contexts, not friends doing Dakota a favor. Track page views, game starts, first combats, run ends,
replays, and completed payments as separate events.

The itch wrapper stamps game-created rooms with the closed `source=itch` tag. Pull production
telemetry and run `bun tools/telemetry-report.js --stdin --source itch` for starts, first combats,
run ends, and replays; use the itch dashboard for page views and completed payments.

- One completed stranger payment achieves the stated first goal.
- Zero payments from 50 qualified visitors is a useful weak negative, not a kill by itself.
- Do not count promises, compliments, friends/family payments, or Dakota's own checkout.
- Do not change the price or pitch midway through the 50-visitor cohort.

After the first 50, the next experiment is chosen from observed behavior: improve the page if people
do not start, improve activation if they do not reach combat, improve the game if they do not replay,
or test a fixed minimum/paid early-access offer only if free players demonstrate repeat pull.

## Total human evidence before interpreting the first payment attempt

- Dakota: **8 runs**.
- Fresh strangers: **15 sessions before the payment cohort** — 5 solo, 5 co-op, 5 final validation.
- People represented: **22 strangers** before the payment cohort (5 solo + 10 in co-op + 3 solo and
  4 in co-op during final validation).
- First checkout cohort: **50 qualified storefront visitors**.

The sequence is intentionally iterative. Fifteen sessions against one unchanged build are less useful
than three five-session cohorts with fixes between them.

## External references

- Nielsen Norman Group recommends repeated small qualitative studies of about five comparable users,
  with fixes between rounds: <https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/>
- itch.io HTML5 projects currently accept payments as donations; fixed-price browser access requires
  a different packaging model: <https://itch.io/docs/creators/html5>
- itch.io pay-what-you-want and early-access behavior: <https://itch.io/docs/creators/pricing>
- Steam Playtest is useful later for gated free testing, but Steam explicitly prohibits charging for
  Playtest access; paid work-in-progress belongs in Early Access:
  <https://partner.steamgames.com/doc/features/playtest>
