# PortPilot – broncode

Versie 1.0.4 (Windows-app) / versie 28 (claude.ai), 18 november 2026.
Met deze map kun je PortPilot altijd zelf aanpassen en opnieuw bouwen, ook zonder Claude.

## Wat zit waar

```
PortPilot-broncode/
├─ web/poortplanner.html    DE BRON: de hele app (HTML, CSS en JavaScript in één bestand).
│                           Dit is ook precies wat op claude.ai draait.
├─ windows/                 Windows-app (Electron) om dezelfde pagina heen
│  ├─ main.js               venster, menu, opslag op schijf, showmap lezen, opslaan-als
│  ├─ preload.js            de brug tussen pagina en Windows (alleen deze functies)
│  ├─ desktop/shim.js       maakt de opslag van claude.ai na met bestanden op de pc
│  ├─ desktop/tail.js       leest networks/rgbeffects uit de gekozen showmap, versie in beeld
│  ├─ build_app.js          maakt app/index.html uit web/poortplanner.html + vendor + desktop
│  ├─ stamp_exe.js          zet pictogram en versie-info in PortPilot.exe
│  ├─ installer.nsi         installer (per gebruiker, geen beheerdersrechten)
│  ├─ build.cmd             alles bouwen op Windows (dubbelklikken)
│  ├─ build.sh              alles bouwen op Linux
│  ├─ package.json          versienummer + vaste versies van Electron en hulpmiddelen
│  ├─ package-lock.json     exacte versies van alle onderdelen
│  ├─ build/                pictogram (ico, png, svg)
│  └─ vendor/               Excel- en PDF-bibliotheken (offline kopie) + licenties
└─ tests/
   ├─ web/                  tests van de pagina (Playwright), met testgegevens in web/data
   └─ windows/              test van de complete Windows-app, met een voorbeeld-showmap
```

Alles wat PortPilot doet (inlezen, rekenen, grenzen, voorstel maken, schema, Excel/PDF) staat in
`web/poortplanner.html`. De Windows-map voegt alleen opslag op de pc en het lezen van de showmap toe.
Pas dus bijna altijd alleen `web/poortplanner.html` aan.

## Pixeltypes (vanaf 1.0.2)

Per opstelling een lijst pixeltypes (naam, spanning, stroom per pixel bij 100 % wit, bron, gecontroleerd); één is de standaard.
Per prop kies je een type, of 'vast vermogen' voor apparaten zoals floods. De standaardwaarden staan in `PIXEL_LIB` bovenin
`web/poortplanner.html`:

| Type | Spanning | Stroom (100 % wit) | Bron |
|---|---|---|---|
| 12V bullet | 12 V | 60 mA (0,72 W) | Wired Watts Smart 12v Bullet Node, sn12v50bkp3 |
| 5V bullet | 5 V | 60 mA (0,3 W) | Wired Watts Smart 5v Bullet Node, sn5v50bkp3 |
| 12V seed | 12 V | 8 mA (0,098 W) | Wired Watts Smart 12v LumaDot (smart dot), sn12v50dkp3 |
| 5V seed | 5 V | 20 mA (0,1 W) | schatting, geen fabrieksopgave gevonden |

De stroom per poort en per voeding rekent PortPilot met de spanning van de pixels; 5V- en 12V-pixels op dezelfde poort of
een voeding met een andere spanning geeft een rode melding.

## Framerate en controllergrens (vanaf 1.0.3)

- Instellingen > Grens & fps: 40 fps (25 ms, standaard), 20 fps (50 ms) of Custom (ms), zoals de sequence in xLights.
- Per controller: `maxPx` = pixels per poort bij 20 fps, `maxPx40` = bij 40 fps; `maxPxRx` / `maxPxRx40` = per smart-receiverketen (poortgroep).
- Ontbreekt de 40 fps-waarde: richtlijn 680 (WS2811 ca. 30 µs per pixel). Ontbreekt de 20 fps-waarde: de 40 fps-waarde. Custom boven 20 fps: 40 fps-waarde, anders 20 fps-waarde.
- Jouw eigen grens geldt per fysieke poort (ook per receiverpoort, 17A en 17B apart); de controllergrens per poort of per receiverketen (17A + 17B + ... samen).
- Stroom en voedingen: per fysieke poort en per voeding van die box.

## Updates via GitHub (vanaf 1.0.4)

De app kijkt bij het starten (en via Help > Controleren op updates) naar de nieuwste release op
https://github.com/bozzel/PortPilot/releases. Is die nieuwer dan de geïnstalleerde versie, dan verschijnt bovenaan
"PortPilot x.y.z is beschikbaar" met de knop Nu bijwerken: de app downloadt `PortPilot-Setup-x.y.z.exe` uit die release,
controleert de sha256 die GitHub opgeeft, start de installer en sluit zichzelf. Projecten blijven staan. De portable versie
opent alleen de downloadpagina. Zonder internet gebeurt er niets.

Een nieuwe versie uitbrengen:

1. Versienummer ophogen in `windows\package.json` (bijv. 1.0.5).
2. `build.cmd` in de map `windows` draaien.
3. Op GitHub: Releases > Draft a new release, tag `v1.0.5`, titel `PortPilot 1.0.5`, korte omschrijving (die zien testers bij 'Wat is nieuw').
4. `PortPilot-Setup-1.0.5.exe` en `PortPilot-1.0.5-portable.exe` uit `windows\dist` uploaden (bestandsnamen niet wijzigen).
5. Publish release, met 'Set as the latest release' aan en 'pre-release' uit.

De repository staat in `REPO` bovenin het updatedeel van `windows/main.js`. Test: `tests/windows/update.js` (nagebootste release).

## Eenmalig installeren (Windows)

1. **Node.js LTS** van https://nodejs.org (de standaardinstallatie is goed).
2. **NSIS** van https://nsis.sourceforge.io (alleen nodig voor de installer; zonder NSIS krijg je alleen de portable versie).
3. Een teksteditor, bijvoorbeeld Visual Studio Code (https://code.visualstudio.com).

De eerste keer bouwen haalt Electron en de bouwhulpmiddelen op (ongeveer 400 MB in `windows\node_modules`);
daarvoor is internet nodig. Daarna kan het ook offline.

## Iets aanpassen en uitproberen

1. Open `web\poortplanner.html` in je editor en pas aan.
2. Snel proberen als Windows-app, zonder te bouwen. Open een opdrachtprompt in de map `windows` en typ:
   ```
   npm ci        (alleen de eerste keer)
   npm start
   ```
   PortPilot start dan met jouw wijziging. Let op: dit gebruikt je echte PortPilot-gegevens in `%APPDATA%\PortPilot`
   (er wordt bij elke start een back-up gemaakt).
3. Of in de browser: dubbelklik `web\poortplanner.html`. Gegevens blijven dan in die browser; internet is nodig voor de Excel/PDF-bibliotheken.

## Bouwen: installer en portable versie

1. Verhoog het versienummer in `windows\package.json` (`"version": "1.0.2"`). Dit nummer staat in de app, in de bestandsnamen en in de installer.
2. Dubbelklik `windows\build.cmd` (of in een opdrachtprompt in de map `windows`: `build.cmd`).
3. Klaar: in `windows\dist` staan
   - `PortPilot-Setup-<versie>.exe` (installer)
   - `PortPilot-<versie>-portable.exe` (zonder installatie)

Op Linux: `sh build.sh` in de map `windows` (nodig: Node.js 20+ en `makensis`, via `apt install nsis`; wine is niet nodig).

Stopt `build_app.js` met "verwacht 1 keer, gevonden 0 keer", dan is in `poortplanner.html` een regel veranderd die
de Windows-build vervangt (bibliotheken, lettertypen of een tekst over claude.ai). Pas die regel in `build_app.js` aan.

## De versie op claude.ai bijwerken

Upload `web/poortplanner.html` opnieuw naar dezelfde artifact (vraag Claude: "publiceer deze poortplanner.html op mijn
PortPilot-artifact"). De opslag op claude.ai gebruikt de mogelijkheden `db` (per gebruiker onder `data/users/<id>`),
`user` en `downloads`.

## Gegevens en back-ups (Windows-app)

- Projecten: `%APPDATA%\PortPilot\data\data\users\local\` – één JSON-bestand per document (`layout`, `setup-…`, `plan-…`, `prefs`, `types`).
  Elk document heeft een revisienummer `_rev`.
- Back-ups: `%APPDATA%\PortPilot\back-ups\` – bij elke start, de laatste 10.
- Instellingen (gekozen showmap): `%APPDATA%\PortPilot\instellingen.json`.
- Terugzetten: PortPilot sluiten, de map `data` vervangen door een back-up, PortPilot starten.
- Verwijderen van de app laat deze gegevens staan.

## Testen (optioneel)

De tests draaien met Playwright. In de map `tests`:
```
npm install
npx playwright install chromium
npm run web        tests van de pagina (gebruiken de gegevens in tests/web/data)
npm run windows    test van de hele Windows-app (alleen Linux/WSL, met xvfb-run)
```
De webtests zijn geschreven op de testgegevens in `tests/web/data` (de Tolberterstraat-opstelling van 18-11-2026).
Met andere gegevens: `set PP_DATA=pad\naar\map` (de map met de JSON-documenten); dan kunnen sommige controles anders uitvallen.
`npm run windows` gebruikt een tijdelijke map en de voorbeeld-showmap in `tests/windows/show`, en controleert dat die niet verandert.

## Afspraken in de code

- PortPilot leest alleen uit de xLights-showmap en schrijft daar nooit.
- Exporteren gaat altijd via "Opslaan als"; bestanden met de naam `xlights_*.xml` worden geweigerd.
- Eén venster tegelijk (de Windows-app dwingt dat af), zodat er niet twee keer naar dezelfde bestanden geschreven wordt.
- Geen codesigning: Windows SmartScreen waarschuwt bij de eerste start ("Meer informatie" > "Toch uitvoeren").
  Met een codesigning-certificaat kun je `PortPilot.exe` en de installer later ondertekenen (signtool).

## Licenties van gebruikte onderdelen

- SheetJS xlsx 0.18.5 – Apache-2.0 (`windows/vendor/LICENSE-xlsx.txt`)
- jsPDF 2.5.1 – MIT (`windows/vendor/LICENSE-jspdf.txt`)
- jsPDF-AutoTable 3.8.2 – MIT (`windows/vendor/LICENSE-jspdf-autotable.txt`)
- Electron 33.4.11 – MIT (wordt bij het bouwen opgehaald)
