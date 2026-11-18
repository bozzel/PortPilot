const H = require("./h.js");
(async () => {
  const { srv, port } = await H.serve(), br = await H.chromium.launch();
  console.log("T12 pixeltypes");
  { const c = await H.ctx(br), pg = await H.open(c, port, "owner=1", H.chrisDb()); await H.settle(pg);
    await pg.evaluate(() => { selectPlan("testconfiguratie"); render(); });
    const su0 = await pg.evaluate(() => { const su = setupOf(plan()); return { def: su.pxDefault, types: su.pxTypes.map(t => `${t.id}:${t.volt}V:${t.mA}mA`), volt: su.volt, mApx: su.mApx }; });
    console.log("     ", JSON.stringify(su0));
    H.ok(su0.def === "eigen" && su0.types[0] === "eigen:12V:33mA", "migratie: jouw 33 mA x 12 V wordt pixeltype 'Mijn pixels (12V)' en standaard");
    H.ok(["bullet12:12V:60mA", "bullet5:5V:60mA", "seed12:12V:8mA", "seed5:5V:20mA"].every(x => su0.types.includes(x)), "standaardtypes 12V/5V bullet en seed aanwezig");
    // berekening ongewijzigd voor bestaande props
    const w = await pg.evaluate(() => { const A = analyse(plan()); const P = A.ports.find(x => x.box === "falcon" && x.port === 1); return [P.w, P.a]; });
    H.ok(Math.abs(w[0] - 441 * 0.396 * 0.3) < 0.01 && Math.abs(w[1] - w[0] / 12) < 0.001, `poort 1 ongewijzigd: ${w[0].toFixed(1)} W, ${w[1].toFixed(2)} A`);
    // opstelling: tabel pixeltypes
    await pg.evaluate(() => gotoTab("setup"));
    H.ok((await pg.$$('[data-act="pxt"][data-f="mA"]')).length === 5, "Opstelling toont 5 pixeltypes");
    H.ok(/Wired Watts Smart 12v Bullet Node/.test(await pg.innerText("#app")) && /schatting: geen fabrieksopgave/.test(await pg.innerText("#app")), "bron en schatting zichtbaar");
    // 5V seed aanpassen
    await pg.fill('[data-act="pxt"][data-id="seed5"][data-f="mA"]', "15"); await pg.dispatchEvent('[data-act="pxt"][data-id="seed5"][data-f="mA"]', "change");
    let t5 = await pg.evaluate(() => setupOf(plan()).pxTypes.find(t => t.id === "seed5"));
    H.ok(t5.mA === 15 && /door jou aangepast/.test(t5.src) && !t5.lib, "5V seed aangepast naar 15 mA, bron 'door jou aangepast'");
    // nieuw type
    await pg.click('[data-act="pxadd"]'); const nid = await pg.evaluate(() => setupOf(plan()).pxTypes.at(-1).id);
    await pg.fill(`[data-act="pxt"][data-id="${nid}"][data-f="name"]`, "Ray Wu 12V seed"); await pg.dispatchEvent(`[data-act="pxt"][data-id="${nid}"][data-f="name"]`, "change");
    await pg.selectOption(`[data-act="pxt"][data-id="${nid}"][data-f="volt"]`, "12");
    await pg.fill(`[data-act="pxt"][data-id="${nid}"][data-f="mA"]`, "12,5"); await pg.dispatchEvent(`[data-act="pxt"][data-id="${nid}"][data-f="mA"]`, "change");
    const nt = await pg.evaluate(id => setupOf(plan()).pxTypes.find(t => t.id === id), nid);
    H.ok(nt.name === "Ray Wu 12V seed" && nt.mA === 12.5 && nt.volt === 12, "eigen pixeltype toegevoegd: " + JSON.stringify({ n: nt.name, mA: nt.mA, v: nt.volt }));
    // ongeldige invoer
    await pg.fill(`[data-act="pxt"][data-id="${nid}"][data-f="mA"]`, "0"); await pg.dispatchEvent(`[data-act="pxt"][data-id="${nid}"][data-f="mA"]`, "change");
    H.ok(await pg.evaluate(id => setupOf(plan()).pxTypes.find(t => t.id === id).mA === 12.5, nid), "0 mA geweigerd");
    // per prop: Hydra naar 5V seed
    await pg.evaluate(() => gotoTab("plan"));
    const hi = await pg.evaluate(() => { S.open = "Hydra"; render(); return S.layout.props.findIndex(x => x.name === "Hydra"); });
    await pg.selectOption("#pf_" + hi, "seed5");
    let r = await pg.evaluate(() => { const A = analyse(plan()), P = A.ports.find(x => x.box === "r2" && x.port === 3), ps = A.psus.find(x => x.box === "r2"); return { w: P.w, a: P.a, volts: P.volts, iss: A.issues.filter(i => /Spanning/.test(i.t)).map(i => i.t) }; });
    console.log("     ", JSON.stringify(r));
    H.ok(Math.abs(r.w - 450 * 0.075 * 0.3) < 0.01 && Math.abs(r.a - r.w / 5) < 0.001, `Hydra 5V seed: ${r.w.toFixed(2)} W, ${r.a.toFixed(2)} A (gerekend met 5 V)`);
    H.ok(r.iss.some(t => /Spanning: Meanwell RSP-200-12 \(SRx1 #2\) is een 12 V-voeding, maar voedt Hydra \(5 V\)/.test(t)), "melding: 5V-prop op 12V-voeding");
    // zelfde poort mengen
    await pg.evaluate(() => { const h = plan().segs.find(s => s.prop === "Hydra"), c = plan().segs.find(s => s.prop === "ProPixeler Candycane BACK"); h.box = c.box; h.port = c.port; h.order = 5; });
    r = await pg.evaluate(() => { const A = analyse(plan()), P = A.ports.find(x => x.box === "r2" && x.port === 4); return { lvl: P.lvl, why: P.why.map(w => w.t), iss: A.issues.filter(i => /zitten 5 V- en 12 V-pixels samen/.test(i.t)).length }; });
    H.ok(r.lvl === "bad" && r.why.some(t => /Spanning: 5 V en 12 V/.test(t)) && r.iss === 1, "5V en 12V op één poort: rood met reden");
    // voeding op 5 V zetten: melding weg voor Hydra, maar Candycane (12V) gemeld
    await pg.evaluate(() => { const su = setupOf(plan()); su.psus.find(x => x.box === "r2").volt = 5; });
    r = await pg.evaluate(() => analyse(plan()).issues.filter(i => /Spanning: Meanwell RSP-200-12 \(SRx1 #2\)/.test(i.t)).map(i => i.t));
    H.ok(r.length === 1 && /Candycane/.test(r[0]) && !/Hydra/.test(r[0]), "voedingsspanning telt mee");
    await pg.evaluate(() => { const su = setupOf(plan()); su.psus.find(x => x.box === "r2").volt = 12; const h = plan().segs.find(s => s.prop === "Hydra"); h.port = 3; h.order = 0; touchSetup(su); });
    // meerdere props tegelijk
    await pg.evaluate(() => gotoTab("px")); await pg.fill("#px_q", "twinkle"); await pg.waitForTimeout(300); await pg.click('[data-act="pxall"][data-v="seed12"]'); await pg.evaluate(() => { S.pxQ = ""; gotoTab("plan"); });
    r = await pg.evaluate(() => { const su = setupOf(plan()); return S.layout.props.filter(x => /twinkle/i.test(x.name)).map(x => su.propProfile[x.name]); });
    H.ok(r.length === 5 && r.every(x => x === "seed12"), "5 twinkles in één keer naar 12V seed");
    H.ok((await pg.innerText(".props")).includes("12V seed"), "label 12V seed in de propslijst");
    // standaard wisselen en verwijderen
    await pg.evaluate(() => gotoTab("setup"));
    await pg.check('[data-act="pxdef"][data-id="bullet12"]');
    r = await pg.evaluate(() => { const su = setupOf(plan()); return { def: su.pxDefault, volt: su.volt, mApx: su.mApx, w: segWatt(plan(), plan().segs.find(s => s.prop === "Propixeler Saturn LEFT")) }; });
    H.ok(r.def === "bullet12" && r.mApx === 60 && Math.abs(r.w - 441 * 0.72 * 0.3) < 0.01, "standaard naar 12V bullet: Saturn rekent met 0,72 W");
    await pg.check('[data-act="pxdef"][data-id="eigen"]');
    H.ok(!(await pg.$('[data-act="pxdel"][data-id="seed12"]')) && !!(await pg.$(`[data-act="pxdel"][data-id="${nid}"]`)), "gebruikt type niet te verwijderen, ongebruikt wel");
    await pg.click(`[data-act="pxdel"][data-id="${nid}"]`); await pg.click(`[data-act="pxdelok"][data-id="${nid}"]`);
    H.ok(await pg.evaluate(id => !setupOf(plan()).pxTypes.some(t => t.id === id), nid), "ongebruikt type verwijderd");
    await H.settle(pg);
    const d = await H.db(pg), sd = d["data/users/u_test/setup-tolberterstraat"].data;
    H.ok(sd.pxTypes.length === 5 && sd.propProfile.Hydra === "seed5" && sd.pxDefault === "eigen", "opgeslagen in de opstelling");
    // exports
    await pg.evaluate(() => gotoTab("plan")); await pg.click("#btnXlsx"); await pg.waitForTimeout(800); await pg.click("#btnPdf"); await pg.waitForTimeout(4000);
    const dl = await pg.evaluate(() => window.__dl.map(x => ({ f: x.filename, b: x.b64 })));
    for (const x of dl) require("fs").writeFileSync(require("path").join(H.DIR, "uitvoer_px_" + x.f.replace(/ /g, "_")), Buffer.from(x.b, "base64"));
    H.ok(dl.length === 2, "Excel en PDF gemaakt");
    // telefoon
    await pg.evaluate(() => gotoTab("setup")); await pg.setViewportSize({ width: 400, height: 900 }); await pg.waitForTimeout(200);
    H.ok(await pg.evaluate(() => document.documentElement.scrollWidth <= 402), "Opstelling op telefoonbreedte zonder horizontaal scrollen");
    await pg.setViewportSize({ width: 1300, height: 900 }); const sec = await pg.$("section.panel"); await sec.screenshot({ path: "pxtypes.png" });
    H.ok(!pg.errs.length, "geen JS-fouten " + pg.errs.join(" | ")); await c.close(); }
  console.log("T13 nieuwe gebruiker");
  { const c = await H.ctx(br), pg = await H.open(c, port, "uid=u_new", {});
    await pg.evaluate(() => { createSetup("empty", "Leeg"); });
    const r = await pg.evaluate(() => { const su = Object.values(S.setups)[0]; return { def: su.pxDefault, n: su.pxTypes.length, v: su.volt, m: su.mApx }; });
    H.ok(r.def === "bullet12" && r.n === 4 && r.m === 60, "nieuwe opstelling: 4 standaardtypes, standaard 12V bullet");
    await pg.evaluate(() => { createSetup("demo", "Demo"); S.tab = "plan"; render(); }); await pg.click('[data-act="demo"]');
    H.ok(await pg.evaluate(() => setupOf(plan()).pxDefault === "bullet12" && !!analyse(plan())), "voorbeeld werkt met 12V bullet");
    H.ok(!pg.errs.length, "geen JS-fouten " + pg.errs.join(" | ")); await c.close(); }
  await br.close(); srv.close(); console.log(H.fails() ? `${H.fails()} FOUT(EN)` : "ALLES OK"); process.exit(H.fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
