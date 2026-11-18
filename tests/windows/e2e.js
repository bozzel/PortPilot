// End-to-end test van de Electron-app (Linux-build van dezelfde code), met nagebootste dialogen.
const { _electron: electron } = require("playwright"), fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = path.join(__dirname, "..", "..", "windows"), SHOW = path.join(__dirname, "show"), CFG = path.join(__dirname, "cfg"), OUT = path.join(__dirname, "out");
if (process.platform === "win32") { console.error("Deze test draait op Linux (of WSL) met xvfb-run; op Windows zou hij je echte PortPilot-gegevens gebruiken."); process.exit(3); }
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? "  ok   " : "  FOUT ") + m); };
fs.rmSync(CFG, { recursive: true, force: true }); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
async function start() {
  const app = await electron.launch({ args: [ROOT, "--no-sandbox"], executablePath: require(path.join(ROOT, "node_modules/electron")), env: { ...process.env, XDG_CONFIG_HOME: CFG, HOME: CFG } });
  await app.evaluate(({ dialog }, { SHOW, OUT }) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [SHOW] });
    dialog.showSaveDialog = async (w, o) => ({ canceled: false, filePath: OUT + "/" + (globalThis.__saveName || o.defaultPath.split(/[\\/]/).pop()) });
    dialog.showMessageBox = async () => ({ response: 0 });
  }, { SHOW, OUT });
  const pg = await app.firstWindow(); pg.errs = [];
  pg.on("pageerror", e => pg.errs.push(e.message)); pg.on("console", m => { if (m.type() === "error") pg.errs.push(m.text()); });
  await pg.waitForFunction(() => typeof S !== "undefined" && !S.loading, null, { timeout: 20000 });
  return { app, pg };
}
const settle = pg => pg.waitForFunction(() => !flush.busy && dirty.size === 0, null, { timeout: 15000 }).then(() => pg.waitForTimeout(200));
(async () => {
  console.log("Eerste start");
  let { app, pg } = await start();
  const V = require(path.join(ROOT, "package.json")).version;
  ok(await app.evaluate(({ app }) => app.getVersion()) === V, "versie " + V);
  ok((await pg.innerText("#subtitle")).includes(`PortPilot ${V} voor Windows`), "versienummer zichtbaar in de app");
  ok(await pg.evaluate(() => Store.mode === "db"), "opslag via lokale bestanden actief");
  ok(!!(await pg.$('[data-act="nsgo"]')), "startscherm: hoe wil je beginnen");
  await pg.fill("#nsName", "Testshow"); await pg.click('[data-act="nsgo"]');           // uit xLights: networks uit de showmap
  await pg.waitForFunction(() => Object.keys(S.setups).length === 1);
  const su = await pg.evaluate(() => { const s = Object.values(S.setups)[0]; return { name: s.name, ctrl: s.boxes.map(b => b.xlName + " " + b.ip + " " + b.protocol) }; });
  ok(su.ctrl[0] === "Falcon_F16V5_TEST 192.168.1.50 DDP", "networks.xml uit de showmap gelezen: " + su.ctrl.join(", "));
  ok(/showmap: .*windows\/show/.test(await pg.innerText("#subtitle")), "showmap getoond");
  await pg.evaluate(() => document.getElementById("btnLayout").click());
  await pg.waitForFunction(() => S.layout && S.layout.props.length === 6, null, { timeout: 10000 });
  const pl = await pg.evaluate(() => ({ name: plan().name, on: plan().segs.filter(s => s.box).map(s => s.prop + "@" + s.port) }));
  ok(pl.name === "Huidig in xLights" && pl.on.includes("Megaboom@10") && pl.on.includes("Dakrand@11"), "layout uit de showmap, indeling Huidig in xLights: " + pl.on.length + " delen op een poort");
  ok(!!(await pg.$(".limask")), "vraag naar eigen grens");
  await pg.fill("#lim_g", "400"); await pg.fill("#lim_o", "500"); await pg.fill("#lim_h", "550"); await pg.click('[data-act="limset"]');
  await pg.evaluate(() => autoPropose()); await settle(pg);
  const vp = await pg.evaluate(() => ({ name: plan().name, loose: plan().segs.filter(s => !s.box).length, st: plan().settings.orangeMax }));
  ok(/^Voorstel/.test(vp.name) && vp.loose === 0 && vp.st === 500, "voorstel gemaakt met eigen grens: " + JSON.stringify(vp));
  // exporteren
  await pg.click("#btnXlsx"); await pg.waitForTimeout(1500); await pg.click("#btnPdf"); await pg.waitForTimeout(5000);
  const outs = fs.readdirSync(OUT); console.log("     uitvoer:", outs.join(", "));
  ok(outs.some(f => /^PortPilot - Voorstel.*\.xlsx$/.test(f) && fs.statSync(path.join(OUT, f)).size > 5000), "Excel naar gekozen map");
  ok(outs.some(f => /^PortPilot - Voorstel.*\.pdf$/.test(f) && fs.statSync(path.join(OUT, f)).size > 50000), "PDF naar gekozen map");
  await app.evaluate(() => { globalThis.__saveName = "xlights_rgbeffects.xml"; }); await pg.click("#btnSaveFile"); await pg.waitForTimeout(800);
  ok(!fs.existsSync(path.join(OUT, "xlights_rgbeffects.xml")), "weigert op te slaan als xlights_*.xml");
  await app.evaluate(() => { globalThis.__saveName = null; });
  await pg.evaluate(() => gotoTab("schema")); await pg.waitForTimeout(400); await pg.click('[data-act="sexport"]'); await pg.waitForTimeout(2500);
  ok(fs.readdirSync(OUT).some(f => /\.png$/.test(f)), "schema als PNG");
  ok(!pg.errs.length, "geen fouten in de app " + pg.errs.join(" | "));
  const nPlans = await pg.evaluate(() => Object.keys(S.plans).length);
  await app.close();

  console.log("Herstart");
  ({ app, pg } = await start());
  const st = await pg.evaluate(() => ({ plans: Object.keys(S.plans).length, setups: Object.keys(S.setups).length, props: S.layout && S.layout.props.length, prefs: S.prefs, cur: plan() && plan().name }));
  ok(st.plans === nPlans && st.setups === 1 && st.props === 6 && st.prefs.set && st.prefs.limits.greenMax === 400, "na herstart alles terug: " + JSON.stringify({ ...st, prefs: st.prefs.limits }));
  ok(!(await pg.$(".limask")), "geen vraag naar grens meer");
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send("open:limits"));
  await pg.waitForSelector("#limEdit", { timeout: 5000 }).catch(() => null);
  ok(await pg.inputValue("#le_g").catch(() => "") === "400", "menu Mijn grens instellen opent het paneel met 400");
  await pg.fill("#le_g", "380"); await pg.selectOption("#le_scope", "all"); await pg.click('[data-act="limeditsave"]'); await settle(pg);
  ok(await pg.evaluate(() => S.prefs.limits.greenMax === 380 && Object.values(S.plans).every(x => x.settings.greenMax === 380)), "grens gewijzigd naar 380 voor alle indelingen");
  ok(/windows\/show/.test(await pg.innerText("#subtitle")), "showmap onthouden");
  const dataDir = path.join(CFG, "PortPilot");
  ok(fs.existsSync(path.join(dataDir, "back-ups")) && fs.readdirSync(path.join(dataDir, "back-ups")).length >= 1, "back-up gemaakt bij start: " + fs.readdirSync(path.join(dataDir, "back-ups")).join(","));
  const files = cp.execSync(`find "${path.join(dataDir, "data")}" -name '*.json' | sed 's|.*/data/||'`).toString().trim().split("\n");
  console.log("     gegevens:", files.join(", "));
  ok(files.some(f => /users\/local\/prefs\.json$/.test(f)) && files.some(f => /plan-/.test(f)), "gegevens als losse JSON-bestanden");
  // wijzigen en weer herladen via focus
  await pg.evaluate(() => { plan().notes.Ster = "test notitie"; touchPlan(); }); await settle(pg);
  ok(!pg.errs.length, "geen fouten na herstart " + pg.errs.join(" | "));
  await app.close();
  ok(cp.execSync(`cd "${SHOW}" && sha256sum -c ../show.sha`).toString().split("\n").filter(l => /OK$/.test(l)).length === 2, "xLights-bestanden in de showmap onveranderd");
  console.log(fails ? `${fails} FOUT(EN)` : "ALLES OK"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
