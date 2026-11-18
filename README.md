# PortPilot

Verdeel de props uit je xLights-layout over de poorten van je controllers en receivers, met per poort de pixels, het vermogen en de stroom, en per voeding de belasting.

## Downloaden

Nieuwste versie: [Releases](https://github.com/bozzel/PortPilot/releases/latest)

- `PortPilot-Setup-x.y.z.exe` installeert PortPilot voor jouw gebruiker (geen beheerdersrechten nodig).
- `PortPilot-x.y.z-portable.exe` start zonder installatie.

De app is (nog) niet digitaal ondertekend. Windows toont bij de eerste start "Windows heeft uw pc beschermd": klik op **Meer informatie** en daarna op **Toch uitvoeren**.

Vanaf versie 1.0.4 meldt PortPilot zelf wanneer er een nieuwe versie is.

## Wat kan het

- Controllers uit `xlights_networks.xml` en props uit `xlights_rgbeffects.xml` inlezen (alleen lezen, er verandert niets aan je show).
- Receivers (ook smart receivers in een keten) en voedingen vastleggen, met een schema.
- Props naar poorten slepen of een gebalanceerd voorstel laten maken.
- Per poort: pixels, watt en ampère, met drie grenzen: je eigen grens per datastring, de grens van de controller (bij 40 of 20 fps) en de stroom per poort.
- Pixeltypes (bullet/seed, 5V/12V) per prop, floods met een vast vermogen.
- Export naar Excel, PDF en een afbeelding van het schema.

Wijzigingen per versie: [CHANGELOG.md](CHANGELOG.md). Bouwen en aanpassen: [LEESMIJ.md](LEESMIJ.md).

## Licentie

GPL-3.0, zie [LICENSE](LICENSE).
