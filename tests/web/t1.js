const H = require("./h.js"), fs = require("fs"), path = require("path");
(async () => {
  const { srv, port } = await H.serve("work.html"), br = await H.chromium.launch(), c = await H.ctx(br);
  console.log("T1 Chris (eigenaar) opent zijn gegevens");
  const pg = await H.open(c, port, "owner=1", H.chrisDb());
  await H.settle(pg);
  let d = await H.db(pg);
  const prefs = d["data/users/u_test/prefs"];
  H.ok(prefs && prefs.data.set === true && prefs.data.limits.greenMax === 350 && prefs.data.limits.hardMax === 500, "eigen grens van de eigenaar overgenomen: " + JSON.stringify(prefs && prefs.data.limits));
  H.ok(!(await pg.$(".limask")), "geen vraag naar de eigen grens voor de eigenaar");
  // testconfiguratie kiezen
  await pg.evaluate(() => { selectPlan("testconfiguratie"); render(); });
  const A = await pg.evaluate(() => { const A = analyse(plan()); return { issues: A.issues.map(i => i.k + " | " + i.t), ports: A.ports.filter(P => P.n).map(P => [P.box, P.port, P.n, P.lvl, P.why.map(w => w.t).join("; "), +P.w.toFixed(1), P.est, P.inc]) }; });
  A.issues.forEach(i => console.log("     " + i));
  H.ok(A.issues.some(i => /Vermogen onvolledig: Flood left/.test(i)), "flood onbevestigd gemeld");
  H.ok(A.issues.some(i => /Propixeler Quantum Starburst \(4 -> 2: 2 strings vanaf Falcon F16V5 poort 12, startnodes 1, 501\)/.test(i)), "Quantum: export 2 strings vanaf poort 12, startnodes 1 en 501");
  H.ok(A.issues.some(i => /schatting/.test(i)), "melding vermogen is schatting");
  H.ok(!A.issues.some(i => /verdeeld over|niet direct achter|opeenvolgende poorten in node/.test(i)), "geen splitswaarschuwing in testconfiguratie");
  const p3 = A.ports.find(x => x[0] === "falcon" && x[1] === 3); console.log("     poort 3:", JSON.stringify(p3));
  H.ok(p3 && p3[3] === "warn" && /Eigen grens: boven 350/.test(p3[4]), "poort 3 (381 px) oranje met reden eigen grens");
  const html = await pg.content();
  H.ok(/flood\?/.test(html), "label flood? in propslijst");
  H.ok(/≈ /.test(html), "≈ bij geschat vermogen");
  // prop details openen: Quantum
  await pg.evaluate(() => { S.open = "Propixeler Quantum Starburst"; render(); });
  H.ok(/Export naar xLights:<\/b> 2 strings vanaf Falcon F16V5 poort 12, startnodes 1, 501 \(nu 4 strings in xLights\)/.test(await pg.content()), "propdetail toont export Quantum");
  // flood bevestigen
  await pg.evaluate(() => { S.open = "Flood left"; render(); });
  await pg.click('button[data-act="floodok"]');
  let pw = await pg.evaluate(() => propPower(setupOf(plan()), propOf("Flood left")));
  H.ok(pw.prof === "fixed" && pw.fixed === 30 && !pw.inc, "flood bevestigd: vast 30 W " + JSON.stringify(pw));
  await pg.fill("#fw_" + await pg.evaluate(() => S.layout.props.findIndex(x => x.name === "Flood left")), "45");
  await pg.waitForTimeout(400);
  pw = await pg.evaluate(() => propPower(setupOf(plan()), propOf("Flood left")));
  H.ok(pw.fixed === 45, "vast vermogen aangepast naar 45 W");
  // profiel 0,6 W kiezen voor Hydra
  const hi = await pg.evaluate(() => { S.open = "Hydra"; render(); return S.layout.props.findIndex(x => x.name === "Hydra"); });
  const w0 = await pg.evaluate(() => segWatt(plan(), plan().segs.find(s => s.prop === "Hydra")));
  await pg.selectOption("#pf_" + hi, "seed12");
  const w1 = await pg.evaluate(() => segWatt(plan(), plan().segs.find(s => s.prop === "Hydra")));
  H.ok(Math.abs(w1 - 450 * 0.096 * 0.3) < 0.01 && Math.abs(w0 - 450 * 0.396 * 0.3) < 0.01, `Hydra 12V seed: ${w0.toFixed(1)} -> ${w1.toFixed(1)} W`);
  await pg.selectOption("#pf_" + hi, "default");
  // pixels gecontroleerd
  await pg.evaluate(() => gotoTab("setup")); await pg.check('input[data-act="pxok"][data-id="eigen"]');
  await pg.evaluate(() => gotoTab("plan"));
  const iss2 = await pg.evaluate(() => analyse(plan()).issues.map(i => i.t));
  H.ok(!iss2.some(t => /schatting/.test(t)), "na aanvinken geen schatting meer");
  await H.settle(pg);
  d = await H.db(pg);
  const su = d["data/users/u_test/setup-tolberterstraat"].data;
  H.ok(su.propProfile["Flood left"] === "fixed" && su.propWatt["Flood left"] === 45 && su.pxTypes.find(t => t.id === "eigen").confirmed === true && su._rev >= 1, "opgeslagen in opstelling met _rev " + su._rev);
  // exports
  for (const b of ["btnXlsx", "btnPdf"]) { await pg.click("#" + b); await pg.waitForTimeout(b === "btnPdf" ? 4000 : 800); }
  const dl = await pg.evaluate(() => window.__dl.map(x => ({ f: x.filename, b: x.b64 })));
  for (const x of dl) fs.writeFileSync(path.join(H.DIR, "out_" + x.f.replace(/ /g, "_")), Buffer.from(x.b, "base64"));
  H.ok(dl.some(x => x.f === "PortPilot - testconfiguratie.xlsx") && dl.some(x => x.f === "PortPilot - testconfiguratie.pdf"), "exports: " + dl.map(x => x.f).join(", "));
  H.ok(!pg.errs.length, "geen JS-fouten " + pg.errs.join(" | "));
  await br.close(); srv.close(); console.log(H.fails() ? `${H.fails()} FOUT(EN)` : "ALLES OK"); process.exit(H.fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
