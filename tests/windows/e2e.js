// End-to-end test van de Electron-app (Linux-build van dezelfde code), met nagebootste dialogen.
const { _electron: electron } = require("playwright"), fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..", "..", "windows"), SHOW = path.join(__dirname, "show"), CFG = fs.mkdtempSync(path.join(os.tmpdir(), "portpilot-e2e-")), OUT = path.join(CFG, "exports");
const packaged = process.env.PORTPILOT_TEST_EXECUTABLE;
const showFiles = ["xlights_networks.xml", "xlights_rgbeffects.xml"];
const hash = filename => crypto.createHash("sha256").update(fs.readFileSync(path.join(SHOW, filename))).digest("hex");
const originalHashes = showFiles.map(hash);
const incompleteShow = path.join(CFG, "incomplete-show");
const manualLayout = path.join(CFG, "layout backup.xml");
fs.mkdirSync(incompleteShow);
fs.copyFileSync(path.join(SHOW, "xlights_networks.xml"), path.join(incompleteShow, "xlights_networks.xml"));
fs.copyFileSync(path.join(SHOW, "xlights_rgbeffects.xml"), manualLayout);
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? "  ok   " : "  FOUT ") + m); };
fs.mkdirSync(OUT);
async function start() {
  const args = packaged ? [] : [ROOT];
  if (process.platform === "linux") args.push("--no-sandbox");
  const app = await electron.launch({
    args,
    executablePath: packaged || require(path.join(ROOT, "node_modules/electron")),
    env: { ...process.env, PORTPILOT_TEST_PROFILE: path.join(CFG, "profile"),
      PORTPILOT_UPDATE_API: "http://127.0.0.1:1" }
  });
  await app.evaluate(({ dialog }, { SHOW, OUT, manualLayout }) => {
    dialog.showOpenDialog = async (_window, options) => {
      if (options.properties.includes("openDirectory")) return { canceled: false, filePaths: [globalThis.__showFolder || SHOW] };
      globalThis.__xmlFilter = options.filters;
      return { canceled: false, filePaths: [manualLayout] };
    };
    dialog.showSaveDialog = async (w, o) => ({ canceled: false, filePath: OUT + "/" + (globalThis.__saveName || o.defaultPath.split(/[\\/]/).pop()) });
    dialog.showMessageBox = async () => ({ response: 0 });
  }, { SHOW, OUT, manualLayout });
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
  ok((await pg.innerText("#subtitle")).includes(`PortPilot ${V} voor ${process.platform === "darwin" ? "macOS" : "Windows"}`), "versienummer zichtbaar in de app");
  ok(await pg.evaluate(() => Store.mode === "db"), "opslag via lokale bestanden actief");
  ok(!!(await pg.$('[data-act="nsgo"]')), "startscherm: hoe wil je beginnen");
  await pg.fill("#nsName", "Testshow"); await pg.click('[data-act="nsgo"]');           // uit xLights: networks uit de showmap
  await pg.waitForFunction(() => Object.keys(S.setups).length === 1);
  const su = await pg.evaluate(() => { const s = Object.values(S.setups)[0]; return { name: s.name, ctrl: s.boxes.map(b => b.xlName + " " + b.ip + " " + b.protocol) }; });
  ok(su.ctrl[0] === "Falcon_F16V5_TEST 192.168.1.50 DDP", "networks.xml uit de showmap gelezen: " + su.ctrl.join(", "));
  ok(/showmap: .*windows[\\/]show/.test(await pg.innerText("#subtitle")), "showmap getoond");
  await pg.evaluate(() => document.getElementById("btnLayout").click());
  await pg.waitForFunction(() => S.layout && S.layout.props.length === 6, null, { timeout: 10000 });
  const pl = await pg.evaluate(() => ({ name: plan().name, on: plan().segs.filter(s => s.box).map(s => s.prop + "@" + s.port) }));
  ok(pl.name === "Huidig in xLights" && pl.on.includes("Megaboom@10") && pl.on.includes("Dakrand@11"), "layout uit de showmap, indeling Huidig in xLights: " + pl.on.length + " delen op een poort");
  await app.evaluate((_, folder) => { globalThis.__showFolder = folder; }, incompleteShow);
  await pg.click("#btnShowDir");
  await pg.waitForFunction(() => document.querySelector("#subtitle").textContent.includes("incomplete-show"));
  await pg.click("#btnLayout");
  await pg.waitForFunction(() => S.layout.source === "layout backup.xml");
  const filters = await app.evaluate(() => globalThis.__xmlFilter);
  ok(filters?.[0]?.extensions.includes("xml"), "missing show XML falls back to a native XML picker");
  ok(SHOW !== incompleteShow && fs.existsSync(manualLayout), "manual import keeps the source file");
  await app.evaluate(() => { globalThis.__showFolder = null; });
  await pg.click("#btnShowDir");
  await pg.waitForFunction(() => !document.querySelector("#subtitle").textContent.includes("incomplete-show"));
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
  await pg.selectOption("#ppLanguage", "en");
  await pg.waitForFunction(() => document.documentElement.lang === "en");
  await pg.click("#btnLimits");
  ok(await pg.locator("#ppTheme").inputValue() === "system", "theme follows the system by default");
  await pg.selectOption("#ppTheme", "dark");
  ok(await pg.evaluate(() => getComputedStyle(document.documentElement).colorScheme) === "dark", "Dark theme applied");
  await pg.selectOption("#ppTheme", "light");
  ok(await pg.evaluate(() => getComputedStyle(document.documentElement).colorScheme) === "light", "Light theme applied");
  await pg.selectOption("#ppTheme", "system");
  ok(await pg.locator("html").getAttribute("data-theme") === null, "theme override cleared");
  await pg.selectOption("#ppTheme", "dark");
  const nPlans = await pg.evaluate(() => Object.keys(S.plans).length);
  await app.close();

  console.log("Herstart");
  ({ app, pg } = await start());
  ok(await pg.locator("html").getAttribute("lang") === "en", "English restored after restart");
  ok(await pg.locator("html").getAttribute("data-theme") === "dark", "Dark theme restored after restart");
  await pg.selectOption("#ppLanguage", "nl");
  await pg.waitForFunction(() => document.documentElement.lang === "nl");
  const st = await pg.evaluate(() => ({ plans: Object.keys(S.plans).length, setups: Object.keys(S.setups).length, props: S.layout && S.layout.props.length, prefs: S.prefs, cur: plan() && plan().name }));
  ok(st.plans === nPlans && st.setups === 1 && st.props === 6 && st.prefs.set && st.prefs.limits.greenMax === 400, "na herstart alles terug: " + JSON.stringify({ ...st, prefs: st.prefs.limits }));
  ok(!(await pg.$(".limask")), "geen vraag naar grens meer");
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send("open:limits"));
  await pg.waitForSelector("#limEdit", { timeout: 5000 }).catch(() => null);
  ok(await pg.inputValue("#le_g").catch(() => "") === "400", "menu Mijn grens instellen opent het paneel met 400");
  await pg.fill("#le_g", "380"); await pg.selectOption("#le_scope", "all"); await pg.click('[data-act="limeditsave"]'); await settle(pg);
  ok(await pg.evaluate(() => S.prefs.limits.greenMax === 380 && Object.values(S.plans).every(x => x.settings.greenMax === 380)), "grens gewijzigd naar 380 voor alle indelingen");
  ok(/windows[\\/]show/.test(await pg.innerText("#subtitle")), "showmap onthouden");
  const dataDir = path.join(CFG, "profile");
  ok(fs.existsSync(path.join(dataDir, "back-ups")) && fs.readdirSync(path.join(dataDir, "back-ups")).length >= 1, "back-up gemaakt bij start: " + fs.readdirSync(path.join(dataDir, "back-ups")).join(","));
  const files = fs.readdirSync(path.join(dataDir, "data"), { recursive: true }).map(f => f.split(path.sep).join("/"));
  console.log("     gegevens:", files.join(", "));
  ok(files.some(f => /users\/local\/prefs\.json$/.test(f)) && files.some(f => /plan-/.test(f)), "gegevens als losse JSON-bestanden");
  // wijzigen en weer herladen via focus
  await pg.evaluate(() => { plan().notes.Ster = "test notitie"; touchPlan(); }); await settle(pg);
  ok(!pg.errs.length, "geen fouten na herstart " + pg.errs.join(" | "));
  await app.close();
  ok(showFiles.every((file, index) => hash(file) === originalHashes[index]), "xLights-bestanden onveranderd");
  console.log(fails ? `${fails} FOUT(EN)` : "ALLES OK"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
