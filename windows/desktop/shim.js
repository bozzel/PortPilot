/* PortPilot voor Windows: window.claude nagebouwd op lokale bestanden (via ppDesktop). De rest van de pagina is gelijk aan claude.ai. */
(() => {
  const D = window.ppDesktop; if (!D) return;
  const cl = o => o == null ? o : JSON.parse(JSON.stringify(o));
  const ref = p => ({ id: p.split("/").pop(), path: p,
    async get() { const d = await D.dbGet(p); return { id: p.split("/").pop(), exists: !!d, data: () => cl(d) || undefined }; },
    async set(data) { await D.dbSet(p, cl(data)); },
    async update(data) { const d = await D.dbGet(p); if (!d) throw Object.assign(new Error("bestaat niet"), { code: "invalid_argument" }); await D.dbSet(p, { ...d, ...cl(data) }); },
    async delete() { await D.dbDelete(p); },
    async acquire() { return { acquired: true }; } });            // één venster tegelijk (afgedwongen door de app)
  const db = { doc: ref, collection: c => ({ doc: id => ref(c + "/" + id),
    async get() { const l = await D.dbList(c), docs = l.map(x => ({ id: x.id, exists: true, data: () => cl(x.data) })); return { docs, empty: !docs.length, size: docs.length }; } }) };
  const bytes = async d => d instanceof Uint8Array ? d : d instanceof ArrayBuffer ? new Uint8Array(d) : d instanceof Blob ? new Uint8Array(await d.arrayBuffer()) : new TextEncoder().encode(String(d));
  const downloads = { async save({ filename, data }) { const r = await D.saveFile(filename, await bytes(data));
    if (r.declined) throw Object.assign(new Error("geannuleerd"), { code: "declined" }); if (r.err) throw Object.assign(new Error(r.err), { code: r.err }); return r; } };
  window.claude = { use: async cap => {
    if (cap === "db") return db;
    if (cap === "user") return { id: async () => "local", isOwner: async () => false };
    if (cap === "downloads") return downloads;
    throw Object.assign(new Error("niet beschikbaar"), { code: "unavailable" }); } };
})();
