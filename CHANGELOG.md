# Changelog

Alle wijzigingen in PortPilot per versie. Het release-script (`release.ps1`) zet het stuk van de versie die je uitbrengt
als omschrijving bij de release op GitHub; testers zien dat in de app bij "Wat is nieuw".

Nieuwe versie: zet bovenaan een nieuw kopje `## x.y.z - jjjj-mm-dd` met daaronder de wijzigingen.

## 1.0.4 - 2026-11-18

### Nieuw
- Updates: PortPilot controleert bij het starten (en via Help > Controleren op updates) of er op GitHub een nieuwere versie staat. Met "Nu bijwerken" downloadt de app de installer, controleert die (sha256) en installeert de nieuwe versie. Je projecten blijven staan.
- De portable versie opent bij een update de downloadpagina.

## 1.0.3 - 2026-11-18

### Nieuw
- Tabblad 4 Pixeltypes: per prop met één klik het pixeltype kiezen, "alle" voor de hele lijst, zoeken en filteren. Props waarvoor je al gekozen hebt verdwijnen uit de lijst; met "ook toegewezen props tonen" zie je ze weer.
- Framerate-instelling (Grens & fps): 40 fps (25 ms, standaard), 20 fps (50 ms) of Custom, zoals in xLights. De controllergrens hangt daarvan af.
- Bibliotheek met pixels per poort bij 40 en bij 20 fps, met bron. Falcon F16V4/V5: 1024 bij 20 fps, 680 bij 40 fps (richtlijn).

### Opgelost
- Smart receivers in een keten (17A, 17B, ...): je eigen grens telt nu per fysieke receiverpoort. Alleen de controllergrens geldt voor de hele keten. Stroom en voedingen telden al per receiver.

## 1.0.2 - 2026-11-18

### Nieuw
- Pixeltypes per opstelling: 12V bullet, 5V bullet, 12V seed en 5V seed (stroom per pixel bij 100 % wit, met bron), zelf aan te passen en uit te breiden.
- Per prop een pixeltype kiezen; de stroom per poort en voeding rekent met de spanning van die pixels.
- Rode melding bij 5V- en 12V-pixels op één poort of op een voeding met een andere spanning.

## 1.0.1 - 2026-11-18

### Nieuw
- "Mijn grens" altijd in te stellen, met keuze voor alleen nieuwe, de huidige of alle indelingen.

## 1.0.0 - 2026-11-18

- Eerste Windows-versie: zelfstandig, zonder Claude-account of internet. Leest networks en layout uit de gekozen xLights-showmap, projecten op de eigen pc met back-ups, export naar Excel, PDF en schema.
