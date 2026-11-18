const H = require("./h.js");
(async () => {
  const { srv, port } = await H.serve(), br = await H.chromium.launch();
  const c = await H.ctx(br), pg = await H.open(c, port, "owner=1", H.chrisDb()); await H.settle(pg);
  console.log("T14 receiverketen: eigen grens per poort, controllergrens per keten, framerate");
  const setup = () => pg.evaluate(() => {
    const n = newPlan("keten", "tolberterstraat", false); S.plans[n.id] = n; selectPlan(n.id); const su = setupOf(plan());
    if (!boxById(su, "r3")) { su.boxes.push({ id: "r3", type: "SRX1V4", name: "SRx1 V4 #3", pixelPorts: 4, rx: true, smart: true, up: { after: "r1" }, side: "midden", maxA: 5 });
      su.psus.push({ id: "p5", name: "Meanwell RSP-320-12 #5", type: "RSP-320-12", watt: 320, volt: 12, box: "r3", from: 1, to: 4 }); normalizeSetup(su); }
    const put = (prop, box, port, order) => { const s = plan().segs.find(x => x.prop === prop); s.box = box; s.port = port; s.order = order; };
    put("Propixeler Tree MEDIUM LEFT star", "r1", 1, 0); put("Propixeler Tree MEDIUM LEFT", "r1", 1, 1); put("ProPixeler_Twinkle", "r3", 1, 0); put("ProPixeler_Twinkle-3", "r3", 1, 1); render(); });
  await setup();
  const get = () => pg.evaluate(() => { const A = analyse(plan()), su = setupOf(plan()), f = (b, i) => A.ports.find(x => x.box === b && x.port === i);
    return { a: f("r1", 1), b: f("r3", 1), iss: A.issues.map(i => i.t), lim: poolLimit(su, "r3"), meta: boxMeta(su, boxById(su, "falcon")) }; });
  let r = await get();
  console.log("      17A", r.a.n, r.a.poolN, r.a.lvl, JSON.stringify(r.a.why.map(w => w.t)), "| 17B", r.b.n, r.b.lvl, JSON.stringify(r.b.why.map(w => w.t)));
  H.ok(r.a.lvl === "ok" && r.b.lvl === "ok" && !r.a.why.length && !r.b.why.length, "17A (300) en 17B (100): groen, geen eigen-grensmelding meer op de som 400");
  H.ok(!r.iss.some(t => /gedeelde pool|Poort 17 \(17A \+ 17B/.test(t)), "geen meldingen meer over 400 in de keten");
  H.ok(Math.abs(r.a.w - 35.6) < .1 && Math.abs(r.b.w - 11.9) < .1 && Math.abs(r.a.a - 2.97) < .01, "stroom en vermogen per receiver ongewijzigd");
  H.ok(r.lim === 680 && /max 680 px per poort bij 40 fps \(richtlijn\)/.test(r.meta), "Falcon bij 40 fps: 680 (richtlijn): " + r.meta.slice(0, 60));
  // eigen grens per fysieke poort: 17A naar 450 -> oranje alleen 17A
  await pg.evaluate(() => { const h = plan().segs.find(s => s.prop === "Hydra"); h.box = "r1"; h.port = 1; h.order = 2; });
  r = await get(); H.ok(r.a.n === 750 && r.a.lvl === "bad" && r.b.lvl === "bad" && r.a.why.some(w => /Eigen grens: boven jouw maximum 500/.test(w.t)) && !r.b.why.some(w => /Eigen grens/.test(w.t)) && r.b.why.some(w => /Controllergrens bij 40 fps: 850 px, max 680 per receiverketen/.test(w.t)), "17A 750 px: eigen grens op 17A; ketensom 850 > 680: controllergrens op beide");
  H.ok(r.iss.some(t => /^Controllergrens bij 40 fps \(25 ms\): Poort 17 \(17A \+ 17B, gedeelde pool\) heeft 850 pixels, meer dan de controller per receiverketen \(poortgroep\) aankan \(680, richtlijn\)/.test(t)), "melding controllergrens per keten");
  // 20 fps: 1024
  await pg.evaluate(() => { S.prefs = { ...S.prefs, fps: 20, frameMs: null }; render(); });
  r = await get(); H.ok(r.lim === 1024 && !r.b.why.some(w => /Controllergrens/.test(w.t)), "20 fps: grens 1024, 850 past");
  // custom 30 ms -> 40 fps-waarde
  await pg.evaluate(() => { S.prefs = { ...S.prefs, fps: 40, frameMs: 30 }; render(); });
  r = await get(); H.ok(r.lim === 680 && r.b.why.some(w => /afgeleid van 40 fps/.test(w.t)), "custom 30 ms: 40 fps-waarde, 'afgeleid van 40 fps'");
  await pg.evaluate(() => { S.prefs = { ...S.prefs, frameMs: 60 }; render(); }); r = await get(); H.ok(r.lim === 1024, "custom 60 ms: 20 fps-waarde");
  // instellingen-paneel
  await pg.evaluate(() => { S.prefs = { ...S.prefs, fps: 40, frameMs: null }; render(); });
  await pg.click("#btnLimits"); await pg.check('input[name="le_fps"][value="20"]'); await pg.selectOption("#le_scope", "new"); await pg.click('[data-act="limeditsave"]'); await H.settle(pg);
  let d = await H.db(pg); H.ok(d["data/users/u_test/prefs"].data.fps === 20 && d["data/users/u_test/prefs"].data.limits.greenMax === 350, "framerate 20 fps bewaard, grens ongewijzigd");
  await pg.click("#btnLimits"); await pg.check('input[name="le_fps"][value="custom"]'); await pg.fill("#le_ms", "5"); await pg.click('[data-act="limeditsave"]');
  H.ok(await pg.evaluate(() => S.prefs.fps === 20 && !S.prefs.frameMs && !!document.getElementById("limEdit")), "custom 5 ms geweigerd");
  await pg.fill("#le_ms", "33"); await pg.click('[data-act="limeditsave"]'); await H.settle(pg);
  H.ok(await pg.evaluate(() => S.prefs.frameMs === 33 && fpsLabel() === "33 ms (30,3 fps)"), "custom 33 ms bewaard");
  await pg.click("#btnLimits"); await pg.check('input[name="le_fps"][value="40"]'); await pg.click('[data-act="limeditsave"]'); await H.settle(pg);
  // voorstel maken: 17B wordt niet meer als vol gezien door 17A
  const vp = await pg.evaluate(() => { const su = setupOf(plan()); const L = poolLimit(su, "r3"); autoPropose(); const A = analyse(plan()); return { bad: A.ports.filter(P => P.why.some(w => /Controllergrens|Eigen grens: boven jouw/.test(w.t))).length, loose: plan().segs.filter(s => !s.box).length, ketens: A.ports.filter(P => P.poolSize > 1).map(P => P.poolN), L }; });
  H.ok(vp.bad === 0 && vp.loose === 0 && vp.ketens.every(n => n <= vp.L), "voorstel: niets boven eigen of controllergrens, alles geplaatst " + JSON.stringify(vp));
  // migratie bibliotheekwaarden
  const mig = await pg.evaluate(() => { const su = S.setups.tolberterstraat, f = boxById(su, "falcon"); return [f.maxPx, f.maxPx40, f.maxPxRx, f.maxPxRx40]; });
  H.ok(JSON.stringify(mig) === "[1024,680,1024,680]", "Falcon gemigreerd naar 1024 / 680 " + JSON.stringify(mig));
  await pg.evaluate(() => gotoTab("setup")); H.ok(!!(await pg.$('[data-path$=".maxPx40"]')) && !!(await pg.$('[data-path$=".maxPxRx40"]')) && /Max px 40 \/ 20 fps/.test(await pg.content()), "opstelling: velden 40 / 20 fps");
  console.log("T15 tabblad Pixeltypes");
  await pg.evaluate(() => { S.setups.tolberterstraat.propProfile = {}; selectPlan("testconfiguratie"); gotoTab("px"); });
  let rows = await pg.$$eval(".pxt tbody tr", x => x.length); H.ok(rows === 27, "27 props, niets toegewezen: alle zichtbaar");
  await pg.click('input[data-act="ptype"][data-prop="Hydra"][data-v="seed12"]'); await H.settle(pg);
  rows = await pg.$$eval(".pxt tbody tr", x => x.length);
  H.ok(rows === 26 && await pg.evaluate(() => S.setups.tolberterstraat.propProfile.Hydra === "seed12"), "Hydra met één klik naar 12V seed en uit de lijst");
  await pg.click('input[data-act="ptype"][data-prop="Propixeler Saturn LEFT"][data-v="default"]');
  rows = await pg.$$eval(".pxt tbody tr", x => x.length); H.ok(rows === 25, "standaardtype kiezen telt ook als toegewezen");
  await pg.fill("#px_q", "twinkle"); await pg.waitForTimeout(300); await pg.click('[data-act="pxall"][data-v="seed12"]');
  H.ok(await pg.evaluate(() => S.layout.props.filter(x => /twinkle/i.test(x.name)).every(x => S.setups.tolberterstraat.propProfile[x.name] === "seed12")), "alle 5 twinkles via 'alle'");
  H.ok(/Alle 5 props in deze lijst hebben een pixeltype/.test(await pg.innerText("#app")), "lege lijst met uitleg");
  await pg.check('[data-act="pxshowall"]'); rows = await pg.$$eval(".pxt tbody tr", x => x.length); H.ok(rows === 5, "toggle: toegewezen weer zichtbaar");
  await pg.fill("#px_q", "flood left"); await pg.waitForTimeout(300); await pg.click('input[data-act="ptype"][data-prop="Flood left"][data-v="fixed"]');
  await pg.fill("#pxw_0", "25"); await pg.waitForTimeout(400);
  H.ok(await pg.evaluate(() => S.setups.tolberterstraat.propWatt["Flood left"] === 25 && S.setups.tolberterstraat.propProfile["Flood left"] === "fixed"), "flood: vast vermogen 25 W in het tabblad");
  await pg.fill("#px_q", ""); await pg.waitForTimeout(300); await pg.uncheck('[data-act="pxshowall"]');
  await pg.setViewportSize({ width: 400, height: 900 }); await pg.waitForTimeout(200);
  H.ok(await pg.evaluate(() => document.documentElement.scrollWidth <= 402), "telefoon: tabel scrolt binnen het kader, pagina niet");
  await pg.setViewportSize({ width: 1400, height: 900 }); await pg.screenshot({ path: require("path").join(__dirname, "pxtab.png") });
  await pg.evaluate(() => gotoTab("plan")); await pg.click("#btnXlsx"); await pg.waitForTimeout(800); await pg.click("#btnPdf"); await pg.waitForTimeout(4000);
  H.ok((await pg.evaluate(() => window.__dl.length)) === 2, "Excel en PDF");
  H.ok(!pg.errs.length, "geen JS-fouten " + pg.errs.join(" | "));
  await br.close(); srv.close(); console.log(H.fails() ? `${H.fails()} FOUT(EN)` : "ALLES OK"); process.exit(H.fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
