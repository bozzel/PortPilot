// Nagebootste window.claude (db, user, downloads) op localStorage, gedeeld tussen tabbladen in dezelfde context.
(() => {
  const q = new URLSearchParams(location.search), UID = q.get("uid") || "u_test", OWNER = q.get("owner") === "1", LAT = +(q.get("lat") || 25);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rd = () => JSON.parse(localStorage.getItem("mockdb") || "{}"), wr = o => localStorage.setItem("mockdb", JSON.stringify(o));
  const leases = () => JSON.parse(localStorage.getItem("mocklease") || "{}");
  window.__writes = [];
  const ref = path => ({ id: path.split("/").pop(), path,
    async get() { await sleep(LAT); const d = rd()[path]; return { id: path.split("/").pop(), exists: !!d, data: () => d ? JSON.parse(JSON.stringify(d.data)) : undefined }; },
    async set(data) { await sleep(LAT); const o = rd(); o[path] = { data: JSON.parse(JSON.stringify(data)), version: ((o[path] || {}).version || 0) + 1 }; wr(o); window.__writes.push(path); },
    async delete() { await sleep(LAT); const o = rd(); delete o[path]; wr(o); window.__writes.push("DEL " + path); },
    async acquire({ holder, ttlMs }) { await sleep(LAT); const L = leases(), now = Date.now(), cur = L[path];
      if (cur && cur.exp > now && cur.holder !== holder) return { acquired: false, expiresAt: new Date(cur.exp).toISOString() };
      L[path] = { holder, exp: now + Math.max(1000, ttlMs || 30000) }; localStorage.setItem("mocklease", JSON.stringify(L));
      const o = rd(); if (!o[path]) { o[path] = { data: {}, version: 1 }; wr(o); }      // zoals de echte: lease maakt het document aan
      return { acquired: true, version: o[path].version, holder }; } });
  const db = {
    collection: p => ({ doc: id => ref(p + "/" + id), async get() { await sleep(LAT); const o = rd(), docs = Object.keys(o).filter(k => k.startsWith(p + "/") && !k.slice(p.length + 1).includes("/")).map(k => ({ id: k.slice(p.length + 1), exists: true, data: () => JSON.parse(JSON.stringify(o[k].data)) })); return { docs, empty: !docs.length, size: docs.length }; } }),
    doc: p => ref(p)
  };
  window.__dl = [];
  window.claude = { use: async cap => {
    if (cap === "db") return db;
    if (cap === "user") return { id: async () => UID, isOwner: async () => OWNER };
    if (cap === "downloads") return { save: async ({ filename, data }) => { const u8 = data instanceof ArrayBuffer ? new Uint8Array(data) : data instanceof Uint8Array ? data : new TextEncoder().encode(String(data)); let b = ""; for (let i = 0; i < u8.length; i += 8192) b += String.fromCharCode(...u8.subarray(i, i + 8192)); window.__dl.push({ filename, b64: btoa(b) }); } };
    throw Object.assign(new Error("no cap"), { code: "unavailable" });
  } };
})();
