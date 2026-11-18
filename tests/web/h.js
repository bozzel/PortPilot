// Gedeelde testhulp: server, bibliotheken lokaal, nep-db met Chris' gegevens.
const { chromium } = require("playwright"), fs = require("fs"), path = require("path"), http = require("http");
// De pagina: ../../web/poortplanner.html. Bibliotheken uit ../../windows/vendor (geen internet nodig).
// Testgegevens: map met JSON-documenten (plan-*.json, setup-*.json, layout.json), standaard tests/web/data, of PP_DATA=...
const DIR = __dirname, WEB = path.join(DIR, "..", "..", "web", "poortplanner.html"), VEN = path.join(DIR, "..", "..", "windows", "vendor"), DATA = process.env.PP_DATA || path.join(DIR, "data"), LIB = {
  "xlsx@0.18.5/dist/xlsx.full.min.js": path.join(VEN, "xlsx.full.min.js"),
  "jspdf@2.5.1/dist/jspdf.umd.min.js": path.join(VEN, "jspdf.umd.min.js"),
  "jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js": path.join(VEN, "jspdf.plugin.autotable.min.js") };
function serve() {
  const html = fs.readFileSync(WEB, "utf8").replace("<title>", "<script src=\"/mock.js\"></script><title>");
  const srv = http.createServer((q, r) => { const u = q.url.split("?")[0];
    if (u === "/mock.js") { r.setHeader("content-type", "text/javascript"); return r.end(fs.readFileSync(path.join(DIR, "mock.js"))); }
    if (u === "/blank.html") { r.setHeader("content-type", "text/html"); return r.end("<!doctype html><title>x</title>"); }
    r.setHeader("content-type", "text/html; charset=utf-8"); r.end(html); });
  return new Promise(res => srv.listen(0, () => res({ srv, port: srv.address().port })));
}
function chrisDb(uid = "u_test") {
  const d = DATA, o = {};
  if (!fs.existsSync(d)) { console.error(`Geen testgegevens in ${d}. Zie LEESMIJ.md, onderdeel Testen.`); process.exit(3); }
  for (const f of fs.readdirSync(d).filter(f => f.endsWith(".json"))) o[`data/users/${uid}/${f.slice(0, -5)}`] = { data: JSON.parse(fs.readFileSync(path.join(d, f))), version: 1 };
  return o;
}
async function ctx(browser, opts = {}) {
  const c = await browser.newContext({ viewport: opts.viewport || { width: 1400, height: 1000 }, acceptDownloads: true });
  await c.route(/cdn\.jsdelivr\.net\/npm\/(.*)/, (route, req) => { const k = req.url().split("/npm/")[1]; return LIB[k] ? route.fulfill({ path: LIB[k], contentType: "text/javascript" }) : route.abort(); });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  return c;
}
async function open(c, port, q = "", seed) {
  const pg = await c.newPage(); pg.errs = [];
  pg.on("pageerror", e => pg.errs.push(e.message)); pg.on("console", m => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) pg.errs.push(m.text()); });
  if (seed !== undefined) { await pg.goto(`http://localhost:${port}/blank.html`); await pg.evaluate(s => { localStorage.clear(); localStorage.setItem("mockdb", JSON.stringify(s)); }, seed); }
  await pg.goto(`http://localhost:${port}/?${q}`); await pg.waitForFunction(() => typeof S !== "undefined" && !S.loading, null, { timeout: 15000 });
  return pg;
}
const db = pg => pg.evaluate(() => JSON.parse(localStorage.getItem("mockdb") || "{}"));
const settle = pg => pg.waitForFunction(() => !flush.busy && dirty.size === 0, null, { timeout: 15000 }).then(() => pg.waitForTimeout(150));
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? "  ok   " : "  FOUT ") + m); };
module.exports = { chromium, serve, chrisDb, ctx, open, db, settle, ok, fails: () => fails, DIR };
