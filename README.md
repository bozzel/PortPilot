# PortPilot

PortPilot helps you assign props from your xLights layout to controller and receiver ports. See pixel counts, power and current for each port, plus the load on each power supply.

## Download

Get the latest version from [GitHub Releases](https://github.com/bozzel/PortPilot/releases/latest).

- `PortPilot-Setup-x.y.z.exe` installs PortPilot for your Windows user account without requiring administrator rights.
- `PortPilot-x.y.z-portable.exe` runs without installation.

### macOS test builds

Run **Build and test macOS** in GitHub Actions to build and test separate disk images for Apple Silicon (`arm64`) and Intel (`x64`). Successful jobs attach the matching DMG as a workflow artifact. These test builds are not notarized. On macOS, the update notification opens the GitHub release page for a manual update.

To build locally on a Mac, run `npm ci` and `npm run build:mac` from the `windows` directory. The DMG is written to `windows/dist-mac`.

The Windows executables are currently unsigned. PortPilot 1.0.4 and later notify you when a new release is available.

## Features

- Import controllers from `xlights_networks.xml` and props from `xlights_rgbeffects.xml`. PortPilot reads these files without modifying your show.
- Map receivers, including daisy-chained smart receivers, and power supplies in a wiring diagram.
- Drag props onto ports or generate a balanced assignment.
- See pixel count, watts and amps per port. PortPilot checks your personal data-string limit, the controller limit at your frame rate, and the current limit per port.
- Set the pixel type for each prop, including 5 V and 12 V bullet and seed pixels. Specify a fixed power draw for floodlights and similar devices.
- Export to Excel or PDF, or save the wiring diagram as an image.

See the [changelog](CHANGELOG.md) for release notes and the [build guide in Dutch](LEESMIJ.md) for build instructions.

## License

PortPilot is licensed under GPL-3.0. See [LICENSE](LICENSE).
