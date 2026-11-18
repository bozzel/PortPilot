// Brug tussen de pagina en Windows: alleen deze functies, geen vrije toegang tot het bestandssysteem.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("ppDesktop", {
  setLanguage: value => ipcRenderer.invoke("app:language", value),
  info: () => ipcRenderer.invoke("app:info"),
  dbGet: p => ipcRenderer.invoke("db:get", p),
  dbSet: (p, d) => ipcRenderer.invoke("db:set", p, d),
  dbDelete: p => ipcRenderer.invoke("db:delete", p),
  dbList: c => ipcRenderer.invoke("db:list", c),
  showGet: () => ipcRenderer.invoke("show:get"),
  showPick: () => ipcRenderer.invoke("show:pick"),
  showRead: name => ipcRenderer.invoke("show:read", name),
  showPickFile: name => ipcRenderer.invoke("show:pick-file", name),
  saveFile: (name, bytes) => ipcRenderer.invoke("file:save", name, bytes),
  onShowChanged: cb => ipcRenderer.on("show:changed", (e, d) => cb(d)),
  onOpenLimits: cb => ipcRenderer.on("open:limits", () => cb()),
  updateCheck: () => ipcRenderer.invoke("update:check"),
  updateInstall: () => ipcRenderer.invoke("update:install"),
  updatePage: () => ipcRenderer.invoke("update:page"),
  onUpdate: cb => ipcRenderer.on("update:available", (e, u) => cb(u)),
  onUpdateProgress: cb => ipcRenderer.on("update:progress", (e, p) => cb(p))
});
