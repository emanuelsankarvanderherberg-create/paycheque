// Regression and "use it like a person" checks for My Closet (docs/index.html).
// Run from the repo root:  node tests/run.js        (needs Playwright; Chromium is preinstalled in the cloud sessions)
// Options: --quiet (only failures and the total)   --only=<part of a check name> (run just matching checks)
// Exits with code 1 if anything fails. Network is blocked inside the tests, so they never touch real services.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..", "docs");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".css": "text/css" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
const args = process.argv.slice(2), QUIET = args.includes("--quiet"), ONLY = (args.find(a => a.startsWith("--only=")) || "").slice(7).toLowerCase();
const results = []; let browser, base;
async function open(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.w || 412, height: opts.h || 880 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, permissions: ["camera", "clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage(); const errors = []; page.errors = errors; page.ctx = ctx;
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errors.push("console: " + m.text().slice(0, 160)); });
  await page.route("**/*", (r) => r.request().url().startsWith(base) ? r.continue() : r.abort());   // no real network
  await page.addInitScript(() => { if (!localStorage.getItem("__init")) { localStorage.setItem("__init", "1"); localStorage.setItem("closet-onboarded", "true"); localStorage.setItem("closet-tipsOff", "true"); localStorage.setItem("closet-remDismiss", String(Date.now())); localStorage.setItem("closet-smartDismiss", String(Date.now())); localStorage.setItem("closet-noCount", "true"); } });
  await page.goto(base + "index.html"); await page.waitForTimeout(400);
  if (opts.demo) { await page.evaluate(() => loadDemo()); await page.waitForTimeout(1000); await page.reload(); await page.waitForTimeout(1200); }
  return page;
}
async function test(name, fn) {
  if (ONLY && !name.toLowerCase().includes(ONLY)) return;
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); if (!QUIET) console.log("PASS", name); }
  catch (e) { results.push({ name, ok: false, msg: String(e.message).split("\n")[0].slice(0, 300) }); console.log("FAIL", name, "-", String(e.message).split("\n")[0].slice(0, 300)); }
}
const ok = (c, msg) => { if (!c) throw new Error(msg); };

async function main() {
  await new Promise((r) => server.listen(0, "127.0.0.1", r)); base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });

  await test("boots, every tab opens, no errors", async () => {
    const p = await open({ demo: true });
    for (const t of ["week", "capture", "laundry", "more", "today"]) { await p.click(`.nav [data-tab=${t}]`); await p.waitForTimeout(250); }
    await p.evaluate(() => showTab("stats")); await p.waitForTimeout(200); await p.evaluate(() => showTab("pack")); await p.waitForTimeout(200);
    ok(!p.errors.length, p.errors.join(" | ")); await p.ctx.close();
  });

  await test("outfits are complete and fit the weather", async () => {
    const p = await open({ demo: true });
    const r = await p.evaluate(() => {
      mood.weather = true; const out = {};
      for (const [label, w] of [["cold", { tmin: -4, tmax: 3 }], ["hot", { tmin: 20, tmax: 30 }]]) {
        wx = { key: "k", at: Date.now(), ...w, rain: 0, days: [] }; let complete = 0, coat = 0, layer = 0;
        for (let k = 0; k < 40; k++) { outfit.forEach(s => s.locked = false); generate(); const cats = outfit.map(s => s.cat); if ((cats.includes("bottoms") || cats.includes("onepiece")) && cats.includes("shoes")) complete++; if (cats.includes("outerwear")) coat++; if (cats.includes("layers")) layer++; }
        out[label] = { complete, coat, layer };
      } return out;
    });
    ok(r.cold.complete >= 38, "cold outfits incomplete: " + JSON.stringify(r.cold)); ok(r.cold.coat >= 32, "cold: coat in too few outfits: " + r.cold.coat + "/40");
    ok(r.hot.complete >= 38, "hot outfits incomplete"); ok(r.hot.coat <= 8 && r.hot.layer <= 8, "hot: too many coats or sweaters: " + JSON.stringify(r.hot));
    ok(!p.errors.length, p.errors.join(" | ")); await p.ctx.close();
  });

  await test("today's outfit stays put; shuffle, back, keep and logging behave", async () => {
    const p = await open({ demo: true });
    const ids = () => p.evaluate(() => outfit.map(s => s.id).sort().join());
    const a = await ids(); await p.reload(); await p.waitForTimeout(1200); ok(a === await ids(), "outfit changed after reload");
    await p.click("#reroll"); await p.waitForTimeout(500); const b = await ids(); ok(a !== b, "shuffle did not change the outfit");
    await p.click("#undoOutfit"); await p.waitForTimeout(300); ok(a === await ids(), "Back did not restore the previous outfit");
    const keep = await p.evaluate(() => { outfit[0].locked = true; return outfit[0].id; }); let held = 0;
    for (let k = 0; k < 15; k++) { await p.evaluate(() => generate()); if (await p.evaluate((id) => outfit.some(s => s.id === id), keep)) held++; } ok(held === 15, "kept piece moved: " + held + "/15");
    await p.evaluate(() => { outfit.forEach(s => s.locked = false); });
    await p.click("#wear"); await p.waitForTimeout(500); ok(/Logged/.test(await p.textContent("#wear")), "wear button did not show Logged");
    await p.click("#reroll"); await p.waitForTimeout(500); ok(/Update/.test(await p.textContent("#wear")), "wear button did not offer Update after a change");
    ok(!p.errors.length, p.errors.join(" | ")); await p.ctx.close();
  });

  await test("rotation: 28 days, no same bottoms or tops two days running", async () => {
    const p = await open({ demo: true });
    const days = [];
    for (let d = 0; d < 28; d++) {
      const dt = new Date("2026-12-01T08:00:00"); dt.setDate(dt.getDate() + d); await p.clock.setFixedTime(dt);
      days.push(await p.evaluate((d) => {
        mood.weather = true; const t = 7 + 7 * Math.sin(d / 3); wx = { key: "x", at: Date.now(), tmin: t - 4, tmax: t + 4, rain: 10, days: [] };
        const ds = todayStr(); refreshCnt(); outfit = []; stageSig = ""; generate();
        worn.push({ id: ds, date: ds, season: "fall-winter", itemIds: outfit.map(s => s.id), createdAt: new Date().toISOString() });
        if (d % 7 === 6) { const wd = new Date(Date.now() + 12 * 3600e3).toISOString(); items.forEach(i => { i.washedAt = wd; }); }
        return outfit.map(s => ({ id: s.id, cat: byId(s.id).category }));
      }, d));
    }
    let sameBottom = 0, sameTop = 0, incomplete = 0;
    for (let i = 0; i < days.length; i++) {
      const cat = (d, c) => d.filter(x => x.cat === c).map(x => x.id);
      if (!cat(days[i], "bottoms").length && !cat(days[i], "onepiece").length) incomplete++;
      if (i) { if (cat(days[i], "bottoms").some(x => cat(days[i - 1], "bottoms").includes(x))) sameBottom++; const tp = (d) => [...cat(d, "tops"), ...cat(d, "layers")]; if (tp(days[i]).some(x => tp(days[i - 1]).includes(x))) sameTop++; }
    }
    ok(sameBottom <= 1, "same bottoms as yesterday " + sameBottom + " times"); ok(sameTop <= 2, "same top or sweater as yesterday " + sameTop + " times"); ok(incomplete === 0, incomplete + " incomplete days");
    ok(!p.errors.length, p.errors.join(" | ")); await p.ctx.close();
  });

  await test("layout: board is not covered and every button is reachable on common phones", async () => {
    for (const [w, h] of [[412, 880], [412, 780], [390, 740], [360, 700]]) {
      const p = await open({ w, h, demo: true });
      const r = await p.evaluate(() => { const q = (s) => document.querySelector(s).getBoundingClientRect(); return { vh: innerHeight, stage: q("#stage"), btns: ["#reroll", "#wear", "#loveBtn", "#skipBtn", "#rulesBtn", "#shareLook"].map(s => { const b = q(s); return [b.top, b.bottom, b.width]; }), barTop: Math.min(q("#reroll").top, q("#loveBtn").top) }; });
      ok(r.btns.every(b => b[0] >= 0 && b[1] <= r.vh && b[2] > 40), `${w}x${h}: a button is off screen or too narrow`);
      ok(r.barTop >= r.stage.bottom - 2, `${w}x${h}: the button bar covers the outfit board`);
      await p.evaluate(() => window.scrollTo(0, 400)); await p.waitForTimeout(150);
      ok(await p.evaluate(() => ["#reroll", "#wear", "#loveBtn"].every(s => { const b = document.querySelector(s).getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; })), `${w}x${h}: buttons not pinned after scrolling`);
      ok(!p.errors.length, p.errors.join(" | ")); await p.ctx.close();
    }
  });

  await test("swap sheet, pair rules, try before you buy", async () => {
    const p = await open({ demo: true });
    await p.click("#stage .pc >> nth=0"); await p.waitForTimeout(300); ok(await p.isVisible("#swapPanel"), "swap sheet did not open"); await p.click("#swapClose");
    const [a, b] = await p.evaluate(() => { outfit.forEach(s => s.locked = false); generate(); return outfit.slice(0, 2).map(s => s.id); });
    await p.evaluate(([a, b]) => { setRule("never", a, b); $("rulesSheet").hidden = true; }, [a, b]);
    const bad = await p.evaluate(([a, b]) => { let n = 0; for (let k = 0; k < 40; k++) { generate(); const ids = outfit.map(s => s.id); if (ids.includes(a) && ids.includes(b)) n++; } return n; }, [a, b]);
    ok(bad === 0, "a never-together pair still appeared " + bad + " times");
    const v = await p.evaluate(() => { const n0 = items.length; tryState.type = "sweater"; tryState.color = "Navy"; tryState.pattern = "solid"; tryState.lum = null; tryState.url = ""; const r = tryAnalyze(); return { verdict: r && r.verdict, leak: items.length - n0 }; });
    ok(v.verdict && v.leak === 0, "try-before-you-buy failed or left a temporary piece behind");
    ok(!p.errors.length, p.errors.join(" | ")); await p.ctx.close();
  });

  await test("guided photo session advances with a fake camera", async () => {
    const p = await open({ demo: true });
    await p.click(".nav [data-tab=capture]"); await p.click("#guideStart"); await p.waitForTimeout(1500);
    ok(/Step 1 of/.test(await p.textContent("#guideBar")), "guide bar missing");
    for (let k = 0; k < 5; k++) { await p.click("#snap"); await p.waitForTimeout(600); }
    await p.waitForTimeout(1200); ok(/Step 2 of/.test(await p.textContent("#guideBar")), "did not move to step 2 after 5 photos");
    await p.click("#guideFinish"); await p.waitForTimeout(500); ok(await p.evaluate(() => $("camLive").hidden), "camera did not close at Finish");
    await p.ctx.close();
  });

  await test("closet tools: select and move, delete and undo, year-round, edit", async () => {
    const p = await open({ demo: true });
    await p.click(".nav [data-tab=capture]"); await p.click("#selMode"); await p.click(".tile >> nth=0"); await p.selectOption("#selSeason", "all"); await p.waitForTimeout(400);
    ok(await p.evaluate(() => items.some(i => i.allYear)), "year-round did not apply");
    await p.click("#selMode"); await p.waitForTimeout(200);   // leave select mode
    const n = await p.evaluate(async () => { const n0 = items.length; await deleteWithUndo([items[0].id]); return n0; }); await p.waitForTimeout(300);
    ok(await p.evaluate(() => items.length) === n - 1, "delete did not remove"); await p.click("#undoBtn"); await p.waitForTimeout(500); ok(await p.evaluate(() => items.length) === n, "undo did not restore");
    await p.evaluate(() => openEditor(items[1].id)); ok(await p.isVisible("#edName"), "editor did not open"); await p.evaluate(() => closeEditor());
    ok(!p.errors.length, p.errors.join(" | ")); await p.ctx.close();
  });

  await test("week plan is full; tomorrow can be locked and appears next morning", async () => {
    const p = await open({ demo: true });
    await p.click(".nav [data-tab=week]"); await p.waitForTimeout(600);
    const lens = await p.evaluate(() => plan.days.map(d => d.ids.length)); ok(lens.length === 7 && lens.every(n => n >= 3), "week plan has empty days: " + lens);
    await p.clock.setFixedTime(new Date("2026-11-19T19:30:00")); await p.reload(); await p.waitForTimeout(1500);
    ok(/Tomorrow/.test(await p.textContent("#tomorrow")), "tomorrow card missing in the evening");
    await p.click("[data-tmrlock]"); await p.waitForTimeout(300);
    const locked = await p.evaluate(() => plan.days.find(d => d.date === dateOffset(1)).ids.slice().sort().join());
    await p.clock.setFixedTime(new Date("2026-11-20T07:45:00")); await p.reload(); await p.waitForTimeout(1500);
    ok(locked === await p.evaluate(() => outfit.map(s => s.id).sort().join()), "locked tomorrow outfit was not used the next morning");
    ok(!p.errors.length, p.errors.join(" | ")); await p.ctx.close();
  });

  await test("privacy: report has no piece names, counting stays off on this test host", async () => {
    const p = await open({ demo: true });
    await p.click(".nav [data-tab=more]"); await p.evaluate(() => document.querySelectorAll("#viewMore details").forEach(d => d.open = true));
    const rep = await p.inputValue("#reportText"); const names = await p.evaluate(() => items.slice(0, 8).map(i => i.name));
    ok(!names.some(n => rep.includes(n)), "problem report leaks a piece name"); ok(await p.evaluate(() => !document.getElementById("gcScript")), "analytics script loaded during tests");
    await p.ctx.close();
  });

  await test("bottom tab buttons are at least 44px tall on small phones", async () => {
    for (const [w, h] of [[360, 700], [390, 740]]) {
      const p = await open({ demo: true, w, h });
      const hs = await p.evaluate(() => [...document.querySelectorAll(".nav button")].map(b => b.getBoundingClientRect().height));
      ok(hs.length === 5 && hs.every(x => x >= 43.5), `tab heights at ${w}px: ${hs.join(",")}`); await p.ctx.close();
    }
  });

  await test("small buttons (Share app, Shuffle, Lock, tips) are at least 44px tall", async () => {
    const p = await open({ demo: true, w: 360, h: 700 });
    for (const t of ["today", "week"]) {
      await p.evaluate((t) => showTab(t), t); await p.waitForTimeout(300);
      const bad = await p.evaluate(() => [...document.querySelectorAll(".chip.sm, #topShare")].filter(e => e.offsetParent && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 43.5).map(e => e.textContent.trim()));
      ok(!bad.length, `${t}: small buttons under 44px: ${bad.join(", ")}`);
    }
    await p.ctx.close();
  });

  await browser.close(); server.close();
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) { console.log("Failed:\n" + failed.map(f => " - " + f.name + ": " + f.msg).join("\n")); process.exit(1); }
}
main().catch((e) => { console.error("Test runner crashed:", e); process.exit(2); });
