// Test van de updatefunctie met een nagebootste GitHub-release (lokale server), zonder echte installatie.
const { _electron: electron } = require("playwright"), fs = require("fs"), path = require("path"), http = require("http"), crypto = require("crypto"), os = require("os");
if (process.platform === "win32") { console.error("Deze test draait op Linux (of WSL) met xvfb-run."); process.exit(3); }
const ROOT = path.join(__dirname, "..", "..", "windows"), CFG = path.join(__dirname, "cfg-upd");
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? "  ok   " : "  FOUT ") + m); };
const payload = Buffer.from("MZ nep-installer " + "x".repeat(200000)), sha = crypto.createHash("sha256").update(payload).digest("hex");
let release = null;
const srv = http.createServer((q, r) => {
  if (q.url === "/latest") { if (!release) { r.statusCode = 404; return r.end("{}"); } r.setHeader("content-type", "application/json"); return r.end(JSON.stringify(release)); }
  if (q.url === "/asset") { r.setHeader("content-length", payload.length); return r.end(payload); }
  r.statusCode = 404; r.end();
});
const rel = (tag, digest) => ({ tag_name: tag, body: "Nieuw: test", html_url: "https://github.com/bozzel/PortPilot/releases/tag/" + tag,
  assets: [{ name: `PortPilot-Setup-${tag.slice(1)}.exe`, browser_download_url: `http://localhost:${srv.address().port}/asset`, size: payload.length, digest }] });
async function start() {
  const app = await electron.launch({ args: [ROOT, "--no-sandbox"], executablePath: require(path.join(ROOT, "node_modules/electron")),
    env: { ...process.env, XDG_CONFIG_HOME: CFG, HOME: CFG, PORTPILOT_UPDATE_API: `http://localhost:${srv.address().port}/latest`, PORTPILOT_UPDATE_DRYRUN: "1" } });
  const pg = await app.firstWindow(); pg.errs = []; pg.on("pageerror", e => pg.errs.push(e.message));
  await pg.waitForFunction(() => typeof S !== "undefined" && !S.loading, null, { timeout: 20000 }); return { app, pg };
}
(async () => {
  fs.rmSync(CFG, { recursive: true, force: true }); await new Promise(r => srv.listen(0, r));
  const V = require(path.join(ROOT, "package.json")).version;
  console.log("Updates (huidige versie " + V + ")");
  release = null; let { app, pg } = await start(); await pg.waitForTimeout(3000);
  ok(await pg.evaluate(() => document.getElementById("updBar").hidden), "geen release op GitHub: geen melding"); await app.close();
  release = rel("v" + V, "sha256:" + sha); ({ app, pg } = await start()); await pg.waitForTimeout(3000);
  ok(await pg.evaluate(() => document.getElementById("updBar").hidden), "zelfde versie: geen melding"); await app.close();
  release = rel("v9.9.9", "sha256:" + sha); ({ app, pg } = await start());
  await pg.waitForSelector("#updBar:not([hidden])", { timeout: 8000 }).catch(() => null);
  ok(/PortPilot 9\.9\.9 is beschikbaar/.test(await pg.innerText("#updBar")), "nieuwere versie: balk 'PortPilot 9.9.9 is beschikbaar'");
  await pg.click("#updGo"); await pg.waitForFunction(() => /Gedownload|mislukt|onvolledig/.test(document.getElementById("updMsg").textContent), null, { timeout: 15000 });
  const f = path.join(os.tmpdir(), "PortPilot-Setup-9.9.9.exe");
  ok(/Gedownload \(test\)/.test(await pg.innerText("#updMsg")) && fs.existsSync(f) && crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") === sha, "installer gedownload en sha256 gecontroleerd");
  fs.rmSync(f, { force: true }); ok(!pg.errs.length, "geen fouten " + pg.errs.join(" | ")); await app.close();
  release = rel("v9.9.9", "sha256:" + "0".repeat(64)); ({ app, pg } = await start());
  await pg.waitForSelector("#updBar:not([hidden])", { timeout: 8000 }).catch(() => null); await pg.click("#updGo");
  await pg.waitForFunction(() => /Gedownload|mislukt|onvolledig/.test(document.getElementById("updMsg").textContent), null, { timeout: 15000 });
  ok(/sha256 klopt niet/.test(await pg.innerText("#updMsg")) && !fs.existsSync(f), "verkeerde controlecode: niet geïnstalleerd");
  await pg.click("#updLater"); ok(await pg.evaluate(() => document.getElementById("updBar").hidden), "Later verbergt de balk"); await app.close();
  fs.rmSync(CFG, { recursive: true, force: true }); srv.close();
  console.log(fails ? `${fails} FOUT(EN)` : "ALLES OK"); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
