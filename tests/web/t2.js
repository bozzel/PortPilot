const H = require("./h.js"), fs = require("fs"), path = require("path");
(async () => {
  const { srv, port } = await H.serve(), br = await H.chromium.launch();

  console.log("T3 nieuwe gebruiker: eigen grens één keer vragen");
  { const c = await H.ctx(br), pg = await H.open(c, port, "uid=u_new", {});
    await pg.evaluate(() => { createSetup("demo", "Test"); S.tab = "plan"; render(); }); await pg.click('[data-act="demo"]');
    H.ok(!!(await pg.$(".limask")), "vraag naar eigen grens zichtbaar");
    H.ok(/Alleen als voorbeeld, de grens van de maker/.test(await pg.innerText("#app")), "350/475/500 alleen als voorbeeld genoemd");
    await pg.fill("#lim_g", "300"); await pg.fill("#lim_o", "400"); await pg.fill("#lim_h", "450"); await pg.click('[data-act="limset"]');
    await H.settle(pg);
    let d = await H.db(pg); const pr = d["data/users/u_new/prefs"];
    H.ok(pr && pr.data.set && pr.data.limits.orangeMax === 400, "prefs opgeslagen: " + JSON.stringify(pr && pr.data.limits));
    H.ok(await pg.evaluate(() => plan().settings.greenMax === 300 && plan().settings.hardMax === 450), "huidige indeling krijgt 300/400/450");
    H.ok(!(await pg.$(".limask")), "vraag verdwijnt");
    await pg.evaluate(() => { const n = newPlan("Nieuw", S.curSetup, false); S.plans[n.id] = n; mark("plan-" + n.id); selectPlan(n.id); render(); });
    H.ok(await pg.evaluate(() => plan().settings.orangeMax === 400), "nieuwe indeling krijgt de eigen grens");
    // wrong input
    await pg.evaluate(() => { S.prefs.set = false; render(); }); await pg.fill("#lim_g", "500"); await pg.fill("#lim_o", "400"); await pg.click('[data-act="limset"]');
    H.ok(await pg.evaluate(() => S.prefs.set === false), "onlogische invoer (groen > oranje) geweigerd");
    // reload: prefs blijft
    await pg.evaluate(() => { S.prefs.set = true; }); const pg2 = await H.open(c, port, "uid=u_new");
    H.ok(!(await pg2.$(".limask")) && await pg2.evaluate(() => S.prefs.limits.greenMax === 300), "na herladen geen vraag meer");
    H.ok(!pg.errs.length && !pg2.errs.length, "geen JS-fouten " + pg.errs.concat(pg2.errs).join(" | "));
    await c.close(); }

  console.log("T4 twee tabbladen wijzigen dezelfde indeling");
  { const c = await H.ctx(br), A = await H.open(c, port, "owner=1", H.chrisDb()); await H.settle(A);
    const B = await H.open(c, port, "owner=1"); await H.settle(B);
    for (const pg of [A, B]) await pg.evaluate(() => { selectPlan("testconfiguratie"); render(); });
    await A.evaluate(() => { plan().portBright["falcon:5"] = 55; touchPlan(); }); await H.settle(A);
    await B.evaluate(() => { plan().notes["Hydra"] = "uit tabblad B"; touchPlan(); }); await H.settle(B);
    const d = await H.db(B), plans = Object.entries(d).filter(([k]) => /plan-/.test(k)).map(([k, v]) => [k, v.data.name, v.data.portBright["falcon:5"], v.data.notes.Hydra, v.data._rev]);
    const orig = plans.find(x => x[0].endsWith("plan-testconfiguratie")), copy = plans.find(x => /jouw versie/.test(x[1]));
    console.log("     ", JSON.stringify(orig), JSON.stringify(copy));
    H.ok(orig && orig[2] === 55 && !orig[3], "versie van tabblad A blijft staan (helderheid 55)");
    H.ok(copy && copy[3] === "uit tabblad B" && copy[2] !== 55, "wijziging van tabblad B als kopie bewaard");
    H.ok(await B.evaluate(() => !!S.report && /beide versies bewaard/.test(S.report.title) && plan().name.includes("jouw versie")), "tabblad B ziet de melding en werkt verder in zijn kopie");
    H.ok(await B.evaluate(() => S.plans.testconfiguratie.portBright["falcon:5"] === 55), "tabblad B heeft de versie van A ook binnen");
    // verder werken in B na conflict: geen nieuw conflict
    await B.evaluate(() => { plan().notes["Hydra"] = "tweede"; touchPlan(); }); await H.settle(B);
    H.ok(Object.values(await H.db(B)).filter(v => /jouw versie/.test(v.data.name || "")).length === 1, "verder werken geeft geen nieuwe kopie");
    // verwijderen terwijl ander tabblad wijzigde
    await A.evaluate(() => { S.rev = {}; }); // A forceert een verouderde basis
    await A.evaluate(() => { delete S.plans["kful9nvk"]; mark("plan-kful9nvk"); }); await H.settle(A);
    H.ok(!!(await H.db(A))["data/users/u_test/plan-kful9nvk"] && await A.evaluate(() => !!S.plans.kful9nvk && /niet verwijderd/.test(S.report.lines.join(" "))), "verwijderen met verouderde basis: niet verwijderd, gemeld");
    H.ok(!A.errs.length && !B.errs.length, "geen JS-fouten " + A.errs.concat(B.errs).join(" | "));
    await c.close(); }

  console.log("T5 twee tabbladen slaan bijna tegelijk op (10x)");
  { let lost = 0, both = 0;
    for (let r = 0; r < 10; r++) {
      const c = await H.ctx(br), A = await H.open(c, port, "owner=1&lat=" + (10 + r * 7), H.chrisDb()); await H.settle(A);
      const B = await H.open(c, port, "owner=1&lat=" + (40 - r * 3)); await H.settle(B);
      await Promise.all([A.evaluate(() => { selectPlan("testconfiguratie"); plan().notes["Hydra"] = "A"; plan().updatedAt = "x"; mark("plan-testconfiguratie"); clearTimeout(saveTimer); return flush(); }),
                         B.evaluate(() => { selectPlan("testconfiguratie"); plan().notes["Hydra"] = "B"; plan().updatedAt = "y"; mark("plan-testconfiguratie"); clearTimeout(saveTimer); return flush(); })]);
      await H.settle(A); await H.settle(B);
      const notes = Object.values(await H.db(A)).filter(v => v.data && v.data.notes).map(v => v.data.notes.Hydra);
      if (!notes.includes("A") || !notes.includes("B")) lost++; else both++;
      if (A.errs.length || B.errs.length) console.log("     fouten", A.errs, B.errs);
      await c.close();
    }
    H.ok(lost === 0, `tegelijk opslaan: ${both}/10 keer beide versies bewaard, ${lost} keer iets kwijt`); }

  console.log("T6 oud bewaard bestand (Poortplanner, met vast vermogen per indeling)");
  { const c = await H.ctx(br), pg = await H.open(c, port, "owner=1", H.chrisDb()); await H.settle(pg);
    const d0 = await H.db(pg), lay = d0["data/users/u_test/layout"].data, su = d0["data/users/u_test/setup-tolberterstraat"].data, pl = d0["data/users/u_test/plan-testconfiguratie"].data;
    delete su._rev; delete su._by; delete pl._rev; delete pl._by; su.propProfile = undefined; pl.fixedW = { "Flood middle": 25 };
    const txt = JSON.stringify({ format: "poortplanner", version: 2, kind: "indeling", savedAt: "2026-11-16", layout: lay, setup: su, plan: pl });
    await pg.evaluate(t => importText(t), txt);
    const r = await pg.evaluate(() => { const p = plan(), s = setupOf(p); return { name: p.name, sname: s.name, prof: s.propProfile["Flood middle"], w: s.propWatt["Flood middle"], fw: Object.keys(p.fixedW).length }; });
    H.ok(/geladen/.test(r.name) && r.prof === "fixed" && r.w === 25 && r.fw === 0, "oud bestand opent, vast vermogen naar opstelling: " + JSON.stringify(r));
    // nieuw bestand bewaren en weer laden
    await pg.click("#btnSaveFile"); await pg.waitForTimeout(500);
    const f = await pg.evaluate(() => window.__dl.at(-1)); const j = JSON.parse(Buffer.from(f.b64, "base64").toString());
    H.ok(f.filename.startsWith("PortPilot - ") && j.format === "portpilot", "bewaren als PortPilot-bestand: " + f.filename);
    await pg.evaluate(t => importText(t), JSON.stringify(j)); H.ok(await pg.evaluate(() => /geladen/.test(plan().name)), "nieuw formaat laadt weer");
    H.ok(!(await pg.innerText('body')).match(/Poortplanner/), "nergens meer 'Poortplanner' in de pagina");
    H.ok(!pg.errs.length, "geen JS-fouten " + pg.errs.join(" | "));
    await c.close(); }

  await br.close(); srv.close(); console.log(H.fails() ? `${H.fails()} FOUT(EN)` : "ALLES OK"); process.exit(H.fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
