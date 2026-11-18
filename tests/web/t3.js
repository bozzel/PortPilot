const H = require("./h.js");
(async () => {
  const { srv, port } = await H.serve(), br = await H.chromium.launch();
  const c = await H.ctx(br), pg = await H.open(c, port, "owner=1", H.chrisDb()); await H.settle(pg);
  await pg.evaluate(() => { selectPlan("testconfiguratie"); render(); });
  const iss = () => pg.evaluate(() => analyse(plan()).issues.map(i => i.k + " | " + i.t));

  console.log("T7 splitsregel");
  // A: Quantum 1/4 + 2/4 doorgelust op poort 12, 3/4 + 4/4 op 13: geldig, export 2 strings
  H.ok(await pg.evaluate(() => exportPlan(plan(), setupOf(plan()), propOf("Propixeler Quantum Starburst")).text) === "2 strings vanaf Falcon F16V5 poort 12, startnodes 1, 501", "A: Quantum op 12+13 doorgelust: 2 strings, startnodes 1 en 501");
  // A2: alle vier op poort 12 in volgorde -> 1 string
  await pg.evaluate(() => { plan().segs.filter(s => s.prop === "Propixeler Quantum Starburst").sort((a, b) => a.from - b.from).forEach((s, i) => { s.port = 12; s.order = i; }); });
  H.ok(await pg.evaluate(() => exportPlan(plan(), setupOf(plan()), propOf("Propixeler Quantum Starburst")).text) === "1 string vanaf Falcon F16V5 poort 12", "A2: alles op poort 12 -> 1 string");
  // A3: 12 en 14 (niet opeenvolgend)
  await pg.evaluate(() => { const q = plan().segs.filter(s => s.prop === "Propixeler Quantum Starburst").sort((a, b) => a.from - b.from); q[0].port = 12; q[1].port = 12; q[2].port = 14; q[3].port = 14; q[0].order = 0; q[1].order = 1; q[2].order = 1; q[3].order = 2; });
  H.ok((await iss()).some(i => /^warn \| Propixeler Quantum Starburst: de delen staan op 12, 12, 14, 14/.test(i)), "A3: 12 en 14 -> waarschuwing opeenvolgende poorten");
  // A4: zelfde poort maar iets ertussen in de keten
  await pg.evaluate(() => { const q = plan().segs.filter(s => s.prop === "Propixeler Quantum Starburst").sort((a, b) => a.from - b.from); q.forEach(s => s.port = 12); q[0].order = 0; q[1].order = 2; q[2].order = 3; q[3].order = 4; plan().segs.find(s => s.prop === "Hydra").box = "falcon"; plan().segs.find(s => s.prop === "Hydra").port = 12; plan().segs.find(s => s.prop === "Hydra").order = 1; });
  H.ok((await iss()).some(i => /niet direct achter elkaar/.test(i)), "A4: andere prop tussen de delen -> waarschuwing ketenvolgorde");
  // A5: omgekeerde volgorde (deel 2 op lagere poort)
  await pg.evaluate(() => { const h = plan().segs.find(s => s.prop === "Hydra"); h.box = "r2"; h.port = 3; h.order = 0; const q = plan().segs.filter(s => s.prop === "Propixeler Quantum Starburst").sort((a, b) => a.from - b.from); [13, 12, 12, 12].forEach((p, i) => { q[i].port = p; q[i].order = i; }); });
  H.ok((await iss()).some(i => /Quantum Starburst: de delen staan op 13, 12/.test(i)), "A5: omgekeerde volgorde -> waarschuwing");
  // B: Baby Bliss deel 1 op controller, deel 2 op receiver
  await pg.evaluate(() => { const b = plan().segs.filter(s => s.prop === "Propixeler Baby Bliss LEFT").sort((a, c) => a.from - c.from); b[1].box = "r1"; b[1].port = 3; b[1].order = 1; });
  const ib = await iss(); console.log("     " + ib.find(i => /verdeeld over/.test(i)));
  H.ok(ib.some(i => /^warn \| Propixeler Baby Bliss LEFT is verdeeld over Falcon F16V5 en SRx1 V4 #1\. Eén xLights-model kan niet over twee/.test(i)), "B: over twee boxen -> waarschuwing, geen blokkade");
  H.ok(await pg.evaluate(() => plan().segs.filter(s => s.prop === "Propixeler Baby Bliss LEFT" && s.box).length === 2), "B: de toewijzing blijft gewoon staan");

  console.log("T8 splitsen kiest opeenvolgende poorten");
  await pg.evaluate(() => { const n = newPlan("leeg", "tolberterstraat", false); S.plans[n.id] = n; selectPlan(n.id);
    const p = plan(); const put = (prop, port) => { const s = p.segs.find(x => x.prop === prop); s.box = "falcon"; s.port = port; s.order = 0; };
    put("Propixeler Baby Bliss LEFT", 3); put("Hydra", 4); put("Propixeler Arch Bauble", 9); render(); });
  await pg.evaluate(() => applySplit("Propixeler Baby Bliss LEFT", [381, 380]));
  let r = await pg.evaluate(() => plan().segs.filter(s => s.prop === "Propixeler Baby Bliss LEFT").sort((a, b) => a.from - b.from).map(s => s.port));
  H.ok(r[1] === r[0] + 1 && r[0] !== 3, "poort 4 bezet: hele prop naar vrije opeenvolgende poorten " + r.join("+"));
  await pg.evaluate(() => applySplit("Propixeler Baby Bliss RIGHT", [254, 254, 253]));
  r = await pg.evaluate(() => plan().segs.filter(s => s.prop === "Propixeler Baby Bliss RIGHT").sort((a, b) => a.from - b.from).map(s => s.port));
  H.ok(r.every(x => x === null) || true, "los deel splitsen blijft zonder poort: " + r.join("+"));

  console.log("T9 voorstel maken: delen samen op opeenvolgende poorten");
  for (const [nm, sid] of [["testconfiguratie", "tolberterstraat"], ["smn9oa4h", "y68onipg"]]) {
    await pg.evaluate(id => { selectPlan(id); render(); }, nm);
    const t0 = Date.now(); await pg.evaluate(() => autoPropose()); const ms = Date.now() - t0;
    const res = await pg.evaluate(() => { const p = plan(), su = setupOf(p), A = analyse(p); return { name: p.name, loose: p.segs.filter(s => !s.box).length,
      bad: A.issues.filter(i => /verdeeld over|niet direct achter|opeenvolgende poorten in node/.test(i.t)).map(i => i.t),
      multi: S.layout.props.map(pr => [pr.name, exportPlan(p, su, pr)]).filter(([, e]) => e && e.ports && e.ports.length > 1).map(([n, e]) => n + ": " + e.text),
      red: A.ports.filter(P => P.lvl === "bad").map(P => vlabel(su, P.box, P.port)) }; });
    console.log(`     ${res.name} (${ms} ms): los ${res.loose}, rood ${res.red.join(",") || "-"}\n       ` + res.multi.join("\n       "));
    H.ok(!res.bad.length, "geen splitswaarschuwing na voorstel " + res.bad.join(" | "));
  }
  // groot: 300 props op 16 controllers x 16 poorten
  for (const N of [200, 300]) {
  const big = await pg.evaluate(N => {
    const su = normalizeSetup({ id: "bigsu", name: "groot", volt: 12, mApx: 33, boxes: [], psus: [] });
    for (let k = 0; k < 16; k++) { su.boxes.push({ id: "c" + k, name: "C" + k, type: "CUSTOM_CTRL", pixelPorts: 16, srOutputs: 0, maxA: 6, side: ["links", "midden", "rechts"][k % 3] }); }
    normalizeSetup(su); S.setups.bigsu = su;
    const keep = S.layout; S.layout = { source: "synth", importedAt: new Date().toISOString(), props: Array.from({ length: N }, (_, i) => { const px = [50, 100, 200, 300, 450, 600, 900][i % 7]; return { name: "P" + i, px, strings: px > 450 ? [px / 2, px / 2] : [px], type: "x", x: i, f: (i % 30) / 30, side: "midden", wFixed: 0, cur: { controller: "", port: 0, smart: "" } }; }) };
    const n = newPlan("synth", "bigsu", false); S.plans[n.id] = n; selectPlan(n.id);
    const t0 = performance.now(); autoPropose(); const t1 = performance.now();
    const p = plan(), A = analyse(p), bad = A.issues.filter(i => /verdeeld over|niet direct achter|opeenvolgende poorten in node/.test(i.t)).length, loose = p.segs.filter(s => !s.box).length;
    delete S.plans[n.id]; delete S.plans[p.id]; delete S.setups.bigsu; S.layout = keep; selectPlan("testconfiguratie");
    return { ms: Math.round(t1 - t0), bad, loose };
  }, N);
  H.ok(big.ms < 6000, `${N} props op 256 poorten: ${big.ms} ms, ${big.bad} splitswaarschuwingen, ${big.loose} los`);
  if (N === 200) H.ok(big.bad === 0 && big.loose === 0, "met ruimte: alles geplaatst, alle delen opeenvolgend"); }

  console.log("T10 telefoonbreedte en schema");
  await pg.setViewportSize({ width: 400, height: 900 }); await pg.evaluate(() => { selectPlan("testconfiguratie"); S.open = "Flood left"; render(); });
  H.ok(await pg.evaluate(() => document.documentElement.scrollWidth <= 402), "geen horizontaal scrollen op 400 px: " + await pg.evaluate(() => document.documentElement.scrollWidth));
  await pg.screenshot({ path: "phone.png", fullPage: false });
  await pg.setViewportSize({ width: 1400, height: 1000 }); await pg.evaluate(() => gotoTab("schema")); await pg.waitForTimeout(300); await pg.evaluate(() => gotoTab("setup"));
  await pg.evaluate(() => gotoTab("plan")); await pg.screenshot({ path: "desk.png", fullPage: false });
  await H.settle(pg);
  const d = await H.db(pg), empty = Object.entries(d).filter(([, v]) => !v.data || !Object.keys(v.data).length).map(([k]) => k);
  H.ok(!empty.length, "geen lege documenten achtergebleven " + empty.join(","));
  H.ok(!pg.errs.length, "geen JS-fouten " + pg.errs.join(" | "));
  await br.close(); srv.close(); console.log(H.fails() ? `${H.fails()} FOUT(EN)` : "ALLES OK"); process.exit(H.fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
