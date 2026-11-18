/* PortPilot desktop: read layout and network XML from the chosen xLights show folder. */
(() => {
  const D = window.ppDesktop; if (!D) return;
  const sub = document.getElementById("subtitle");
  const showInfo = async () => { const i = await D.info(); sub.innerHTML = `${tr("Verdeel de props uit je xLights-layout over je controllers, met pixels en vermogen per poort en per voeding.", "Assign props from your xLights layout to controllers and see pixel counts and power by port and power supply.")}<br><span class="mono">PortPilot ${esc(i.version)} ${i.platform === "darwin" ? tr("voor macOS", "for macOS") : tr("voor Windows", "for Windows")}</span> · ${tr("showmap:", "show folder:")} <span class="mono">${esc(i.showDir || tr("nog niet gekozen", "not selected"))}</span> <button class="link" id="btnShowDir">${tr("wijzigen", "change")}</button>`; };
  showInfo(); D.onShowChanged(() => { showInfo(); toast(tr("Showmap gewijzigd. Kies Layout, Inlezen om opnieuw te lezen.", "Show folder changed. Choose Layout → Import to read it again.")); });
  document.addEventListener("click", async e => { if (e.target && e.target.id === "btnShowDir") { const d = await D.showPick(); if (d) { showInfo(); toast(tr("Showmap gewijzigd. Kies Layout, Inlezen om opnieuw te lezen.", "Show folder changed. Choose Layout → Import to read it again.")); } } });
  const hook = (id, name) => {
    const el = document.getElementById(id);
    el.click = async () => {
      try {
        let result = await D.showRead(name);
        if (result.canceled) return;
        if (result.missing || result.err || !result.text) {
          const folder = result.dir || tr("de showmap", "the show folder");
          toast(result.err || tr(`${name} ontbreekt of is leeg in ${folder}. Kies het bestand handmatig.`,
            `${name} is missing or empty in ${folder}. Select the file manually.`));
          result = await D.showPickFile(name);
          if (result.canceled) return;
        }
        if (result.missing || result.err || !result.text) {
          toast(result.err || tr("Het gekozen XML-bestand ontbreekt of is leeg.", "The selected XML file is missing or empty."));
          return;
        }
        showInfo();
        el.onchange({ target: { files: [new File([result.text], result.name, { type: "text/xml" })], value: "" } });
      } catch (error) {
        toast(tr("XML inlezen mislukt.", "Could not import the XML file."));
      }
    };
  };
  hook("fileLayout", "xlights_rgbeffects.xml"); hook("fileNet", "xlights_networks.xml");
  D.onOpenLimits(() => document.getElementById("btnLimits").click());
  /* update beschikbaar: balk bovenaan */
  const bar = document.createElement("div"); bar.id = "updBar"; bar.hidden = true;
  bar.style.cssText = "position:sticky;top:0;z-index:30;display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:var(--accent);color:var(--accent-ink);padding:8px 12px;border-radius:8px;margin-bottom:10px;font-size:13px";
  document.body.insertBefore(bar, document.body.firstChild);
  let availableUpdate;
  function renderUpdate(u) {
    bar.innerHTML = `<b>PortPilot ${esc(u.version)} ${tr("is beschikbaar", "is available")}</b> <span>(${tr("je hebt", "installed:")} ${esc(u.current)})</span>`
      + (u.portable ? `<button class="small" id="updPage">${tr("Downloadpagina openen", "Open download page")}</button>` : `<button class="small" id="updGo">${tr("Nu bijwerken", "Update now")}</button><button class="small" id="updPage">${tr("Wat is nieuw", "What’s new")}</button>`)
      + `<button class="small" id="updLater">${tr("Later", "Later")}</button><span id="updMsg"></span>`;
  }
  D.onUpdate(u => { availableUpdate = u; bar.hidden = false; renderUpdate(u); });
  window.addEventListener("pp-language-changed", () => {
    showInfo();
    if (availableUpdate && !bar.hidden && !document.getElementById("updGo")?.disabled) renderUpdate(availableUpdate);
  });
  D.onUpdateProgress(p => { const m = document.getElementById("updMsg"); if (m) m.textContent = `${tr("Downloaden…", "Downloading…")} ${p} %`; });
  document.addEventListener("click", async e => {
    const id = e.target && e.target.id;
    if (id === "updLater") bar.hidden = true;
    if (id === "updPage") D.updatePage();
    if (id === "updGo") { e.target.disabled = true; const m = document.getElementById("updMsg"); m.textContent = tr("Downloaden…", "Downloading…");
      const r = await D.updateInstall();
      if (r.err) { m.textContent = r.err; e.target.disabled = false; }
      else if (r.ok) m.textContent = r.dryrun ? tr("Gedownload (test).", "Downloaded (test).") : tr("De installer start; PortPilot sluit nu.", "PortPilot is closing to run the installer."); }
  });
})();
