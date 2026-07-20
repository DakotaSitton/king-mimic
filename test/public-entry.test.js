// Stranger-facing entry contract. Static DOM assertions run without a server or browser:
//   bun run test/public-entry.test.js
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const client = readFileSync(new URL("../public/client.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../public/style.css", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(new URL("../public/manifest.json", import.meta.url), "utf8"));
const server = readFileSync(new URL("../server.js", import.meta.url), "utf8");

const PITCH = "Wear the bodies of the foes you defeat. Take the throne.";
let pass = 0, fail = 0;
const ok = (condition, label) => {
  if (condition) pass++;
  else { fail++; console.error("FAIL: " + label); }
};

const attrs = {};
const text = {};
const bodies = [];
const collectText = (key) => ({ text(chunk) { text[key] = (text[key] ?? "") + chunk.text; } });
const collectAttr = (key, attr) => ({ element(element) { attrs[key] = element.getAttribute(attr); } });
const dom = new HTMLRewriter()
  .on('meta[name="description"]', collectAttr("description", "content"))
  .on('meta[property="og:type"]', collectAttr("ogType", "content"))
  .on('meta[property="og:title"]', collectAttr("ogTitle", "content"))
  .on('meta[property="og:description"]', collectAttr("ogDescription", "content"))
  .on('meta[name="twitter:card"]', collectAttr("twitterCard", "content"))
  .on('meta[name="twitter:title"]', collectAttr("twitterTitle", "content"))
  .on('meta[name="twitter:description"]', collectAttr("twitterDescription", "content"))
  .on("#createBtn", collectText("solo"))
  .on("#friendsPanel summary", collectText("friends"))
  .on("#joinBtn", collectText("join"))
  .on("#createFriendsBtn", collectText("createFriends"))
  .on('label[for="name"]', collectText("nameLabel"))
  .on("#name", { element(element) {
    attrs.nameRequired = element.hasAttribute("required");
    attrs.namePlaceholder = element.getAttribute("placeholder");
  } })
  .on("#bodiesPick [data-bodies]", { element(element) { bodies.push(Number(element.getAttribute("data-bodies"))); } })
  .on("#inviteBtn", collectText("invite"))
  .on("#inviteStatus", { element(element) { attrs.inviteLive = element.getAttribute("aria-live"); } })
  .on("#lobbyErr", { element(element) { attrs.errorLive = element.getAttribute("aria-live"); } })
  .on("#rotateNudge", { element(element) { attrs.rotateRole = element.getAttribute("role"); } })
  .on(".entry-footnote", collectText("privacy"))
  .on(".feedback-link", { element(element) {
    attrs.feedbackHref = element.getAttribute("href");
    attrs.feedbackRel = element.getAttribute("rel");
  }, text(chunk) { text.feedback = (text.feedback ?? "") + chunk.text; } });
await dom.transform(new Response(html)).text();

ok(attrs.description === PITCH, "standard description uses the owner-authored pitch");
ok(attrs.ogType === "website" && attrs.ogTitle === "King Mimic" && attrs.ogDescription === PITCH,
  "Open Graph metadata is complete and truthful");
ok(attrs.twitterCard === "summary" && attrs.twitterTitle === "King Mimic" && attrs.twitterDescription === PITCH,
  "Twitter metadata is complete and truthful");
ok(html.includes('property="og:url" content="https://king-mimic-production.up.railway.app/"')
  && html.includes('property="og:image" content="https://king-mimic-production.up.railway.app/icon-512.png"')
  && html.includes('name="twitter:image" content="https://king-mimic-production.up.railway.app/icon-512.png"'),
  "social metadata uses the stable HTTPS URL and existing product icon");
ok(manifest.description === PITCH && !/caravan/i.test(manifest.description),
  "manifest description matches the current product");

ok(text.solo.trim() === "Play Solo", "cold-start primary action is Play Solo");
ok(html.indexOf('id="createBtn"') < html.indexOf('id="friendsPanel"'),
  "Play Solo precedes the secondary friends flow");
ok(/Play With Friends/i.test(text.friends) && /Join Room/i.test(text.join)
  && /Create Friend Room/i.test(text.createFriends), "friends creation and direct room join stay secondary");
ok(/optional/i.test(text.nameLabel) && attrs.nameRequired === false && /blank/i.test(attrs.namePlaceholder),
  "name is visibly optional");
ok(JSON.stringify(bodies) === JSON.stringify([1, 2, 3, 4])
  && /type: "join", code, name:.*bodies: _bodies/.test(client),
  "entry preserves 1–4 commanded bodies for solo, hosts, and joiners");

ok(/new URLSearchParams\(location\.search\)\.get\("room"\)/.test(client) && /\$\("code"\)\.value = ENTRY_ROOM/.test(client)
  && /\$\("friendsPanel"\)\.open = true/.test(client), "room query is sanitized, prefilled, and recognized");
ok(/url\.searchParams\.set\("room", code\)/.test(client), "generated invite URL contains the room query parameter");
ok(/navigator\.share\(payload\)/.test(client) && /navigator\.clipboard\?\.writeText/.test(client)
  && /document\.execCommand\("copy"\)/.test(client) && /Copy this invite:/.test(client),
  "room share uses native share with clipboard and visible-link fallbacks");
ok(/Share Invite/i.test(text.invite) && attrs.inviteLive === "polite",
  "room surface exposes an accessible invite affordance");
ok(/wasn’t found[\s\S]*Play Solo/.test(client) && attrs.errorLive === "polite",
  "missing-room recovery is actionable and announced");

ok(/body\.touch\.room-active #rotateNudge/.test(css)
  && !/@media \(orientation: portrait\)[\s\S]{0,120}body\.touch #rotateNudge/.test(css),
  "portrait rotate gate applies only after a room is active");
ok(attrs.rotateRole === "status", "rotate requirement is exposed to assistive technology");

ok(/display name/.test(text.privacy) && /room code/.test(text.privacy)
  && /storefront source/.test(text.privacy) && /gameplay choices/.test(text.privacy) && /results/.test(text.privacy)
  && /combat logs/.test(text.privacy) && /pointer coordinates/.test(text.privacy)
  && /no chat/.test(text.privacy),
  "privacy disclosure names what is and is not recorded");
ok(attrs.feedbackHref === "https://github.com/DakotaSitton/king-mimic/issues/new"
  && /noopener/.test(attrs.feedbackRel) && /feedback/i.test(text.feedback),
  "feedback points only to the public repository issue form");
ok(server.includes("typed labels, or DOM text") && server.includes("raw pointer")
  && /const UI_INTERACTIONS = new Set/.test(server)
  && /ts: Date\.now\(\), code: room\.code, runId:/.test(server)
  && /source: room\.acquisitionSource \?\? null/.test(server)
  && /room\.combatLog/.test(server),
  "server audit supports the disclosure: room/run data and combat logs persist without raw pointer telemetry");
ok(/ENTRY_SOURCE.*=== "itch" \? "itch" : null/.test(client)
  && /source: ENTRY_SOURCE/.test(client),
  "entry forwards only the itch storefront tag when creating a room");
ok(!/tutorial/i.test(html), "entry adds no tutorial flow");

console.log(`PUBLIC ENTRY: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
