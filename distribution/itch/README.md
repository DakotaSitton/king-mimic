# King Mimic itch.io HTML package

This package is a full-viewport launcher for the live King Mimic game. It does not copy the
server-backed game into itch.io; it embeds the HTTPS production build and carries
`source=itch` on both the embedded and direct-launch URLs.

## Build and verify

From the repository root:

```sh
bun run tools/build-itch.mjs
bun run test/itch-package.test.js
```

The upload artifact is `artifacts/itch/king-mimic-itch.zip`. The output directory is ignored by
Git. The ZIP contains exactly one root entry, `index.html`, and the builder fixes archive metadata
so identical source produces byte-identical output.

## itch.io upload settings

1. Create or edit the King Mimic project and set **Kind of Game** to **HTML Game**.
2. Upload `artifacts/itch/king-mimic-itch.zip`. If itch.io shows a file-role checkbox, select
   **This file will be played in the browser**.
3. Under **Embed options**, select **Click to launch in fullscreen**.
4. Enable **Mobile friendly**. Leave scrollbars off; the launcher fills the available viewport.
5. Set pricing to **$0 or Donate** and choose the suggested donation amount yourself.
6. Keep the project restricted while validating the uploaded build. Choose the public release
   status, page copy, images, suggested donation, payment provider, and revenue-share percentage
   before publishing.

After upload, preview the project on desktop and a phone. Confirm that the game reaches its lobby,
that **Open directly** opens the same `source=itch` URL, and that a fresh room can reach live combat.

To inspect the game-side funnel for this storefront cohort, pipe production `telemetry.jsonl` into
`bun tools/telemetry-report.js --stdin --source itch`. It reports unique starts, first combats, run
ends, and explicit replays. Page views and completed payments remain in the itch.io dashboard.

## Payment constraint

itch.io's current HTML5 rules say browser-playable HTML projects can accept payments only as
donations. They cannot require payment for access. Fixed paid access would require changing the
project to **Downloadable** and providing a downloadable package; this launcher is not that
package. See itch.io's official [HTML5 upload guide](https://itch.io/docs/creators/html5) and
[pricing guide](https://itch.io/docs/creators/pricing).

No itch.io account, project, price, payment provider, or publication state is changed by this
repository build.
