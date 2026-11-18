// PortPilot voor Windows: dezelfde pagina als op claude.ai, met opslag op deze computer.
// Gegevens: %APPDATA%\PortPilot\data (één JSON-bestand per document), bij elke start een back-up (laatste 10).
// PortPilot leest alleen uit de xLights-showmap; exporteren gaat altijd naar een bestand dat de gebruiker zelf kiest.
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, net } = require("electron");
const crypto = require("crypto"), os = require("os"), { spawn } = require("child_process");
const fs = require("fs"), path = require("path");

const VERSION = app.getVersion();
const isMac = process.platform === "darwin";
const testProfile = process.env.PORTPILOT_TEST_PROFILE;
if (testProfile && path.isAbsolute(testProfile)) {
  fs.mkdirSync(testProfile, { recursive: true });
  app.setPath("userData", testProfile);
}
let win = null;
const languageFile = () => path.join(userDir(), "language.txt");
function appLanguage() {
  try { return fs.readFileSync(languageFile(), "utf8").trim() === "en" ? "en" : "nl"; }
  catch (e) { return "nl"; }
}
const nativeText = (nl, en) => appLanguage() === "en" ? en : nl;
const userDir = () => app.getPath("userData");
const dataDir = () => path.join(userDir(), "data");
const cfgFile = () => path.join(userDir(), "instellingen.json");

if (!app.requestSingleInstanceLock()) { app.quit(); }          // één venster tegelijk: geen twee schrijvers op dezelfde bestanden
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

/* ---------- instellingen (showmap) */
function readCfg() { try { return JSON.parse(fs.readFileSync(cfgFile(), "utf8")); } catch (e) { return {}; } }
function writeCfg(c) { fs.mkdirSync(userDir(), { recursive: true }); atomicWrite(cfgFile(), JSON.stringify(c, null, 1)); }

/* ---------- opslag: pad "data/users/local/plan-x" -> data/data/users/local/plan-x.json */
const SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
function docFile(p) {
  const segs = String(p).split("/");
  if (!segs.length || segs.some(s => !SEG.test(s) || s === "." || s === "..")) throw new Error("ongeldig pad: " + p);
  return path.join(dataDir(), ...segs.map(s => s.replace(/:/g, "%3A"))) + ".json";
}
function atomicWrite(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, text, "utf8");
  for (let i = 0; ; i++) {                                      // Windows: virusscanner kan het bestand kort vasthouden
    try { fs.renameSync(tmp, file); return; }
    catch (e) { if (i >= 5) { fs.writeFileSync(file, text, "utf8"); try { fs.unlinkSync(tmp); } catch (e2) { } return; } Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60); }
  }
}
function readDoc(p) { try { return JSON.parse(fs.readFileSync(docFile(p), "utf8")); } catch (e) { return null; } }
ipcMain.handle("db:get", (e, p) => readDoc(p));
ipcMain.handle("db:set", (e, p, data) => { atomicWrite(docFile(p), JSON.stringify(data)); return true; });
ipcMain.handle("db:delete", (e, p) => { try { fs.unlinkSync(docFile(p)); } catch (err) { } return true; });
ipcMain.handle("db:list", (e, col) => {
  const dir = docFile(col).slice(0, -5), out = [];
  let names = []; try { names = fs.readdirSync(dir); } catch (err) { return out; }
  for (const n of names) if (n.endsWith(".json")) { const id = n.slice(0, -5).replace(/%3A/g, ":"), d = readDoc(col + "/" + id); if (d) out.push({ id, data: d }); }
  return out;
});

/* ---------- back-up bij elke start, laatste 10 bewaren */
function backup() {
  try {
    if (!fs.existsSync(dataDir())) return;
    const root = path.join(userDir(), "back-ups"), stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    fs.cpSync(dataDir(), path.join(root, stamp), { recursive: true });
    const all = fs.readdirSync(root).sort(); while (all.length > 10) fs.rmSync(path.join(root, all.shift()), { recursive: true, force: true });
  } catch (e) { }
}

/* ---------- xLights-showmap: alleen lezen */
async function pickShow() {
  const cur = readCfg().showDir;
  const r = await dialog.showOpenDialog(win, { title: nativeText("Kies je xLights-showmap (de map met xlights_rgbeffects.xml en xlights_networks.xml)", "Choose the xLights show folder containing xlights_rgbeffects.xml and xlights_networks.xml"), defaultPath: cur || app.getPath("documents"), properties: ["openDirectory"] });
  if (r.canceled || !r.filePaths[0]) return null;
  const dir = r.filePaths[0], has = n => fs.existsSync(path.join(dir, n));
  if (!has("xlights_rgbeffects.xml") && !has("xlights_networks.xml")) {
    const a = await dialog.showMessageBox(win, { type: "warning", buttons: [nativeText("Toch gebruiken", "Use this folder"), nativeText("Andere map kiezen", "Choose another folder")], defaultId: 1, message: nativeText("In deze map staan geen xlights_rgbeffects.xml en xlights_networks.xml.", "This folder contains neither xlights_rgbeffects.xml nor xlights_networks.xml."), detail: dir });
    if (a.response === 1) return pickShow();
  }
  writeCfg({ ...readCfg(), showDir: dir }); return dir;
}
ipcMain.handle("show:get", () => readCfg().showDir || null);
ipcMain.handle("show:pick", () => pickShow());
async function readShowXml(file) {
  try { return { name: path.basename(file), dir: path.dirname(file), text: await fs.promises.readFile(file, "utf8") }; }
  catch (error) {
    const dir = path.dirname(file);
    if (error.code === "ENOENT") return { missing: true, dir };
    return { err: nativeText("XML-bestand kan niet worden gelezen.", "Could not read the XML file."), dir };
  }
}
const showXmlNames = ["xlights_rgbeffects.xml", "xlights_networks.xml"];
ipcMain.handle("show:read", async (e, name) => {
  if (!showXmlNames.includes(name)) return { err: nativeText("onbekend bestand", "Unknown file") };
  let dir = readCfg().showDir; if (!dir || !fs.existsSync(dir)) dir = await pickShow();
  if (!dir) return { canceled: true };
  return readShowXml(path.join(dir, name));
});
ipcMain.handle("show:pick-file", async (e, name) => {
  if (!showXmlNames.includes(name)) return { err: nativeText("onbekend bestand", "Unknown file") };
  const folder = readCfg().showDir || app.getPath("documents");
  const result = await dialog.showOpenDialog(win, {
    title: nativeText("Kies " + name, "Choose " + name),
    defaultPath: folder,
    properties: ["openFile"],
    filters: [{ name: "XML", extensions: ["xml"] }]
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  return readShowXml(result.filePaths[0]);
});

/* ---------- exporteren: altijd naar een bestand dat de gebruiker kiest, nooit over xLights-bestanden heen */
ipcMain.handle("file:save", async (e, filename, bytes) => {
  const exp = path.join(app.getPath("documents"), "PortPilot");
  fs.mkdirSync(exp, { recursive: true });
  const ext = path.extname(filename).slice(1).toLowerCase();
  const r = await dialog.showSaveDialog(win, { title: nativeText("Opslaan als", "Save As"), defaultPath: path.join(exp, filename), filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : [] });
  if (r.canceled || !r.filePath) return { declined: true };
  if (/^xlights_.*\.xml$/i.test(path.basename(r.filePath))) return { err: nativeText("PortPilot overschrijft geen xLights-bestanden. Kies een andere naam.", "PortPilot does not overwrite xLights files. Choose a different file name.") };
  fs.writeFileSync(r.filePath, Buffer.from(bytes)); return { path: r.filePath };
});

/* ---------- updates via GitHub Releases (github.com/bozzel/PortPilot)
   Bij het starten (en via Help) vraagt de app de nieuwste release op. Is die nieuwer, dan biedt de app aan de installer
   (PortPilot-Setup-<versie>.exe uit die release) te downloaden en te starten. Je projecten in %APPDATA%\PortPilot blijven staan.
   De portable versie kan zichzelf niet vervangen; die opent de downloadpagina. Zonder internet gebeurt er niets. */
const REPO = "bozzel/PortPilot";
const RELEASES = "https://github.com/" + REPO + "/releases";
const UPDATE_API = process.env.PORTPILOT_UPDATE_API || "https://api.github.com/repos/" + REPO + "/releases/latest";   // testadres via omgevingsvariabele
const isPortable = () => !!process.env.PORTABLE_EXECUTABLE_FILE;
const newer = (a, b) => { const x = String(a).replace(/^v/i, "").split(/[.-]/).map(n => parseInt(n, 10) || 0), y = String(b).split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
let lastUpdate = null;
async function checkUpdate() {
  const r = await net.fetch(UPDATE_API, { headers: { "Accept": "application/vnd.github+json", "User-Agent": "PortPilot/" + VERSION } });
  if (r.status === 404) return { available: false, none: true };
  if (!r.ok) throw new Error("GitHub antwoordde met " + r.status);
  const j = await r.json(), tag = String(j.tag_name || "");
  const version = tag.replace(/^v/i, "");
  const asset = (j.assets || []).find(a => isMac
    ? a.name === `PortPilot-${version}-mac-${process.arch}.dmg`
    : /^PortPilot-Setup-.*\.exe$/i.test(a.name));
  const info = { available: newer(tag, VERSION) && !!asset, version: tag.replace(/^v/i, ""), current: VERSION, notes: String(j.body || "").slice(0, 2000),
    page: /^https:\/\/github\.com\//.test(j.html_url || "") ? j.html_url : RELEASES, portable: isPortable() || isMac,
    asset: asset ? { name: asset.name, url: asset.browser_download_url, size: asset.size, digest: asset.digest || "" } : null };
  lastUpdate = info; return info;
}
ipcMain.handle("update:check", async () => { try { return await checkUpdate(); } catch (e) { return { error: String(e.message || e) }; } });
ipcMain.handle("update:page", () => { shell.openExternal(lastUpdate && lastUpdate.page || RELEASES); return true; });
ipcMain.handle("update:install", async () => {
  const u = lastUpdate; if (!u || !u.available || !u.asset) return { err: nativeText("Geen update gevonden.", "No update found.") };
  if (isMac || u.portable) { shell.openExternal(u.page); return { page: true }; }
  if (!/^https:\/\/(github\.com|objects\.githubusercontent\.com|release-assets\.githubusercontent\.com)\//.test(u.asset.url) && !process.env.PORTPILOT_UPDATE_API) return { err: nativeText("Onverwacht downloadadres.", "Unexpected download address.") };
  const r = await net.fetch(u.asset.url, { headers: { "User-Agent": "PortPilot/" + VERSION } });
  if (!r.ok || !r.body) return { err: nativeText(`Downloaden mislukt (${r.status}).`, `Download failed (${r.status}).`) };
  const total = u.asset.size || +r.headers.get("content-length") || 0, chunks = [], reader = r.body.getReader(); let got = 0, lastPct = -1;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(Buffer.from(value)); got += value.length;
    const pct = total ? Math.floor(got / total * 100) : 0; if (pct !== lastPct && win) { lastPct = pct; win.webContents.send("update:progress", pct); } }
  const buf = Buffer.concat(chunks);
  if (total && buf.length !== total) return { err: nativeText("Download onvolledig; probeer het opnieuw.", "Download incomplete. Try again.") };
  if (/^sha256:/.test(u.asset.digest) && crypto.createHash("sha256").update(buf).digest("hex") !== u.asset.digest.slice(7)) return { err: nativeText("Controle van de download mislukt (sha256 klopt niet); niet geïnstalleerd.", "The download failed SHA-256 verification. The update was not installed.") };
  const file = path.join(os.tmpdir(), u.asset.name.replace(/[^A-Za-z0-9._-]/g, "_"));
  fs.writeFileSync(file, buf);
  if (process.env.PORTPILOT_UPDATE_DRYRUN) return { ok: true, file, dryrun: true };   // alleen voor de test
  spawn(file, [], { detached: true, stdio: "ignore" }).unref();                     // de installer sluit PortPilot en installeert de nieuwe versie
  setTimeout(() => app.quit(), 500);
  return { ok: true, file };
});
async function manualUpdateCheck() {
  let u;
  try { u = await checkUpdate(); }
  catch (e) {
    return dialog.showMessageBox(win, {
      type: "warning",
      message: nativeText("Controleren op updates lukte niet.", "Could not check for updates."),
      detail: nativeText("Is er internet?", "Check your internet connection.") + " (" + (e.message || e) + ")"
    });
  }
  if (u.available) { if (win) win.webContents.send("update:available", u); return; }
  dialog.showMessageBox(win, {
    type: "info",
    message: nativeText(`Je hebt de nieuwste versie (${VERSION}).`, `You have the latest version (${VERSION}).`),
    detail: u.none ? nativeText("Er staat nog geen release op GitHub.", "No release has been published on GitHub yet.")
      : nativeText("Nieuwste release:", "Latest release:") + " " + (u.version || "?")
  });
}

/* ---------- venster en menu */
function createWindow() {
  win = new BrowserWindow({ width: 1400, height: 950, minWidth: 420, title: `PortPilot ${VERSION}`, icon: path.join(__dirname, "app", "icon.png"), backgroundColor: "#eef0ee",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false } });
  win.on("page-title-updated", e => e.preventDefault());
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("file://")) e.preventDefault(); });
  win.loadFile(path.join(__dirname, "app", "index.html"), { query: { lang: appLanguage() } });
}
function about() {
  const showDir = readCfg().showDir || nativeText("nog niet gekozen", "not selected");
  dialog.showMessageBox(win, {
    type: "info",
    title: nativeText("Over PortPilot", "About PortPilot"),
    message: `PortPilot ${VERSION}`,
    detail: [
      nativeText("Controller-poortplanner voor xLights.", "Controller port planner for xLights."),
      nativeText("Gegevens:", "Data:") + " " + dataDir(),
      nativeText("Back-ups:", "Backups:") + " " + path.join(userDir(), "back-ups"),
      nativeText("Showmap:", "Show folder:") + " " + showDir,
      "",
      nativeText("PortPilot leest alleen uit je showmap en verandert niets aan je xLights-bestanden.",
        "PortPilot reads your show folder without changing your xLights files.")
    ].join("\n")
  });
}
function menu() {
  const t = [
    ...(isMac ? [{ label: "PortPilot", submenu: [
      { label: nativeText("Over PortPilot", "About PortPilot"), click: about },
      { type: "separator" }, { role: "quit" }
    ] }] : []),
    { label: nativeText("Bestand", "File"), submenu: [
      { label: nativeText("xLights-showmap kiezen…", "Choose xLights show folder…"), click: async () => { const d = await pickShow(); if (d && win) win.webContents.send("show:changed", d); } },
      { label: nativeText("Instellingen…", "Settings…"), click: () => { if (win) win.webContents.send("open:limits"); } },
      { label: nativeText("Map met PortPilot-gegevens openen", "Open PortPilot data folder"), click: () => { fs.mkdirSync(dataDir(), { recursive: true }); shell.openPath(userDir()); } },
      { type: "separator" }, { role: "quit", label: nativeText("Afsluiten", "Quit") }] },
    ...(isMac ? [{ label: nativeText("Bewerken", "Edit"), submenu: [
      { role: "undo" }, { role: "redo" }, { type: "separator" },
      { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }
    ] }] : []),
    { label: nativeText("Beeld", "View"), submenu: [{ role: "reload", label: nativeText("Opnieuw laden", "Reload") }, { role: "zoomIn", label: nativeText("Groter", "Zoom in") }, { role: "zoomOut", label: nativeText("Kleiner", "Zoom out") }, { role: "resetZoom", label: nativeText("Normale grootte", "Actual size") }, { type: "separator" }, { role: "togglefullscreen", label: nativeText("Volledig scherm", "Full screen") }, { role: "toggleDevTools", label: nativeText("Ontwikkelaarshulpmiddelen", "Developer tools") }] },
    { label: "Help", submenu: [
      { label: nativeText("Controleren op updates…", "Check for updates…"), click: manualUpdateCheck },
      { label: nativeText("Downloadpagina (GitHub)", "Downloads (GitHub)"), click: () => shell.openExternal(RELEASES) },
      { type: "separator" },
      { label: `${nativeText("Over PortPilot", "About PortPilot")} ${VERSION}`, click: about }
    ] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}
ipcMain.handle("app:language", (event, value) => {
  if (event.sender !== win?.webContents || !["nl", "en"].includes(value)) return false;
  atomicWrite(languageFile(), value);
  menu();
  return true;
});
ipcMain.handle("app:info", () => ({ version: VERSION, platform: process.platform, dataDir: dataDir(), showDir: readCfg().showDir || null }));

app.whenReady().then(() => { backup(); menu(); createWindow();
  win.webContents.once("did-finish-load", () => setTimeout(() => checkUpdate().then(u => { if (u.available && win) win.webContents.send("update:available", u); }).catch(() => { }), 1500)); });
app.on("window-all-closed", () => app.quit());
