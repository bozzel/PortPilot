/* PortPilot voor Windows: layout en networks direct uit de gekozen xLights-showmap lezen (alleen lezen). */
(() => {
  const D = window.ppDesktop; if (!D) return;
  const sub = document.getElementById("subtitle");
  const showInfo = async () => { const i = await D.info(); sub.innerHTML = `Verdeel de props uit je xLights-layout over je controllers, met pixels en vermogen per poort en per voeding.<br><span class="mono">PortPilot ${esc(i.version)} voor Windows</span> · showmap: <span class="mono">${esc(i.showDir || "nog niet gekozen")}</span> <button class="link" id="btnShowDir">wijzigen</button>`; };
  showInfo(); D.onShowChanged(() => { showInfo(); toast("Showmap gewijzigd. Kies Layout, Inlezen om opnieuw te lezen."); });
  document.addEventListener("click", async e => { if (e.target && e.target.id === "btnShowDir") { const d = await D.showPick(); if (d) { showInfo(); toast("Showmap gewijzigd. Kies Layout, Inlezen om opnieuw te lezen."); } } });
  const hook = (id, name) => { const el = document.getElementById(id), orig = HTMLInputElement.prototype.click.bind(el);
    el.click = async () => { const r = await D.showRead(name);
      if (r.canceled) return;
      if (r.missing || r.err || !r.text) { toast(`${name} staat niet in ${r.dir || "de showmap"}; kies het bestand zelf.`); return orig(); }
      showInfo(); el.onchange({ target: { files: [new File([r.text], name, { type: "text/xml" })], value: "" } }); }; };
  hook("fileLayout", "xlights_rgbeffects.xml"); hook("fileNet", "xlights_networks.xml");
  D.onOpenLimits(() => document.getElementById("btnLimits").click());
  /* update beschikbaar: balk bovenaan */
  const bar = document.createElement("div"); bar.id = "updBar"; bar.hidden = true;
  bar.style.cssText = "position:sticky;top:0;z-index:30;display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--accent);color:var(--accent-ink);padding:8px 12px;border-radius:8px;margin-bottom:10px;font-size:13px";
  document.body.insertBefore(bar, document.body.firstChild);
  D.onUpdate(u => {
    bar.hidden = false;
    bar.innerHTML = `<b>PortPilot ${esc(u.version)} is beschikbaar</b> <span>(je hebt ${esc(u.current)})</span>`
      + (u.portable ? `<button class="small" id="updPage">Downloadpagina openen</button>` : `<button class="small" id="updGo">Nu bijwerken</button><button class="small" id="updPage">Wat is nieuw</button>`)
      + `<button class="small" id="updLater">Later</button><span id="updMsg"></span>`;
  });
  D.onUpdateProgress(p => { const m = document.getElementById("updMsg"); if (m) m.textContent = `Downloaden… ${p} %`; });
  document.addEventListener("click", async e => {
    const id = e.target && e.target.id;
    if (id === "updLater") bar.hidden = true;
    if (id === "updPage") D.updatePage();
    if (id === "updGo") { e.target.disabled = true; const m = document.getElementById("updMsg"); m.textContent = "Downloaden…";
      const r = await D.updateInstall();
      if (r.err) { m.textContent = r.err; e.target.disabled = false; }
      else if (r.ok) m.textContent = r.dryrun ? "Gedownload (test)." : "De installer start; PortPilot sluit nu."; }
  });
})();
