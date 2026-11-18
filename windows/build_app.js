// Maakt app/index.html voor de Windows-app uit dezelfde PortPilot-pagina als op claude.ai (../web/poortplanner.html).
// Alleen de omlijsting verandert: volledige HTML, bibliotheken uit vendor/ (werkt offline),
// opslag op de computer via desktop/shim.js en de showmap lezen via desktop/tail.js.
// Gebruik (vanuit de map windows):  node build_app.js            of: node build_app.js pad\naar\poortplanner.html
const fs = require("fs"), path = require("path");
const HERE = __dirname, APP = path.join(HERE, "app");
const SRC = process.argv[2] || path.join(HERE, "..", "web", "poortplanner.html");
let s = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");

function rep(oldS, newS) {                    // vervang precies één keer; anders stoppen met een duidelijke melding
  const n = s.split(oldS).length - 1;
  if (n !== 1) { console.error(`FOUT: verwacht 1 keer, gevonden ${n} keer:\n  ${oldS.slice(0, 120)}\nIs poortplanner.html op deze plek veranderd? Pas build_app.js daarop aan.`); process.exit(1); }
  s = s.replace(oldS, () => newS);
}

fs.rmSync(APP, { recursive: true, force: true });
fs.mkdirSync(path.join(APP, "lib"), { recursive: true });
fs.copyFileSync(path.join(HERE, "build", "icon.png"), path.join(APP, "icon.png"));

// bibliotheken lokaal, geen webfonts
for (const [url, file] of [
  ["https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", "xlsx.full.min.js"],
  ["https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js", "jspdf.umd.min.js"],
  ["https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js", "jspdf.plugin.autotable.min.js"]]) {
  fs.copyFileSync(path.join(HERE, "vendor", file), path.join(APP, "lib", file));
  rep(`<script src="${url}"></script>`, `<script src="lib/${file}"></script>`);
}
rep('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap">\n', "");

// teksten die over claude.ai gaan
rep('"Privé opgeslagen op claude.ai"', '"Opgeslagen op deze computer"');
rep('"Saved privately on claude.ai"', '"Saved on this computer"');
rep('"Exporteren werkt alleen in het artefact op claude.ai, niet in deze voorbeeldweergave."', '"Exporteren lukte niet."');
rep('"Open the artifact on claude.ai to export from it."', '"Could not export."');

// opslag-brug vóór de pagina, showmap-koppeling erna
const shim = fs.readFileSync(path.join(HERE, "desktop", "shim.js"), "utf8"), tail = fs.readFileSync(path.join(HERE, "desktop", "tail.js"), "utf8");
rep("<title>PortPilot</title>", `<title>PortPilot</title>\n<script>\n${shim}</script>\n`);
if (!s.trimEnd().endsWith("</script>")) { console.error("FOUT: poortplanner.html eindigt niet op </script>."); process.exit(1); }
s = s.trimEnd() + `\n<script>\n${tail}</script>\n`;

// volledige HTML: alles t/m </style> in head, de rest in body
const head = `<!doctype html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' data: blob:">\n`;
const i = s.indexOf("</style>") + "</style>".length;
s = head + s.slice(0, i) + "\n</head>\n<body>\n" + s.slice(i) + "\n</body>\n</html>\n";
fs.writeFileSync(path.join(APP, "index.html"), s);
console.log("app/index.html gemaakt uit", SRC, `(${s.length} tekens)`);
