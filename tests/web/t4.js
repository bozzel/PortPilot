const H = require("./h.js");
(async () => {
  const { srv, port } = await H.serve(), br = await H.chromium.launch();
  console.log("T11 Mijn grens altijd instelbaar");
  { const c = await H.ctx(br), pg = await H.open(c, port, "owner=1", H.chrisDb()); await H.settle(pg);
    await pg.evaluate(() => { selectPlan("testconfiguratie"); render(); });
    await pg.click("#btnLimits");
    H.ok(!!(await pg.$("#limEdit")), "paneel Mijn grens opent");
    H.ok(await pg.inputValue("#le_g") === "350" && await pg.inputValue("#le_h") === "500", "ingevuld met de huidige standaard");
    // alleen nieuwe indelingen
    await pg.fill("#le_g", "320"); await pg.fill("#le_o", "450"); await pg.fill("#le_h", "480"); await pg.selectOption("#le_scope", "new"); await pg.click('[data-act="limeditsave"]'); await H.settle(pg);
    let r = await pg.evaluate(() => ({ prefs: S.prefs.limits, cur: plan().settings.greenMax, open: !!document.getElementById("limEdit") }));
    H.ok(r.prefs.greenMax === 320 && r.cur === 350 && !r.open, "alleen nieuwe: standaard 320, huidige indeling blijft 350");
    await pg.evaluate(() => { const n = newPlan("N", S.curSetup, false); S.plans[n.id] = n; selectPlan(n.id); render(); });
    H.ok(await pg.evaluate(() => plan().settings.orangeMax === 450), "nieuwe indeling krijgt 320/450/480");
    // huidige
    await pg.evaluate(() => { selectPlan("testconfiguratie"); render(); }); await pg.click("#btnLimits");
    await pg.fill("#le_g", "300"); await pg.selectOption("#le_scope", "cur"); await pg.click('[data-act="limeditsave"]'); await H.settle(pg);
    r = await pg.evaluate(() => ({ cur: plan().settings, other: S.plans["8y2d1p1x"].settings.greenMax }));
    H.ok(r.cur.greenMax === 300 && r.cur.orangeMax === 450 && r.other === 350, "huidige: testconfiguratie 300/450/480, andere blijft 350");
    // alle
    await pg.click("#btnLimits"); await pg.selectOption("#le_scope", "all"); await pg.click('[data-act="limeditsave"]'); await H.settle(pg);
    H.ok(await pg.evaluate(() => Object.values(S.plans).every(x => x.settings.greenMax === 300 && x.settings.hardMax === 480)), "alle indelingen 300/450/480");
    const d = await H.db(pg);
    H.ok(d["data/users/u_test/prefs"].data.limits.greenMax === 300 && d["data/users/u_test/plan-8y2d1p1x"].data.settings.greenMax === 300, "opgeslagen");
    // fout invoer
    await pg.click("#btnLimits"); await pg.fill("#le_g", "600"); await pg.click('[data-act="limeditsave"]');
    H.ok(await pg.evaluate(() => S.prefs.limits.greenMax === 300 && !!document.getElementById("limEdit")), "onlogische invoer geweigerd, paneel blijft open");
    await pg.click('[data-act="limcancel"]'); H.ok(!(await pg.$("#limEdit")), "annuleren sluit");
    // op ander tabblad en op telefoonbreedte
    await pg.evaluate(() => gotoTab("setup")); await pg.click("#btnLimits"); H.ok(!!(await pg.$("#limEdit")), "werkt ook op tabblad Opstelling");
    await pg.setViewportSize({ width: 400, height: 900 }); await pg.waitForTimeout(200);
    H.ok(await pg.evaluate(() => document.documentElement.scrollWidth <= 402), "telefoonbreedte zonder horizontaal scrollen");
    await pg.screenshot({ path: "lim.png" });
    H.ok(!pg.errs.length, "geen JS-fouten " + pg.errs.join(" | "));
    await c.close(); }
  { const c = await H.ctx(br), pg = await H.open(c, port, "uid=u_new", {});
    await pg.click("#btnLimits"); H.ok(!!(await pg.$("#limEdit")), "nieuwe gebruiker op startscherm: paneel opent");
    await pg.click('[data-act="limeditsave"]'); await H.settle(pg);
    H.ok(await pg.evaluate(() => S.prefs.set && S.prefs.limits.greenMax === 350), "zonder indeling bewaren kan (standaard)");
    await pg.evaluate(() => { createSetup("demo", "T"); S.tab = "plan"; render(); }); await pg.click('[data-act="demo"]');
    H.ok(!(await pg.$(".limask")) && await pg.evaluate(() => plan().settings.greenMax === 350), "daarna geen vraag meer");
    H.ok(!pg.errs.length, "geen JS-fouten " + pg.errs.join(" | ")); await c.close(); }
  await br.close(); srv.close(); console.log(H.fails() ? `${H.fails()} FOUT(EN)` : "ALLES OK"); process.exit(H.fails() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
