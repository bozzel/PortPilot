# Changelog

Changes to PortPilot by version. The local release script uses the matching entry as the release notes on GitHub. PortPilot users can open those notes from the update notification.

For each release, add a heading in the format `## x.y.z - YYYY-MM-DD`, followed by the changes.

## 1.0.6 - 2026-11-19

### Fixed

- If the expected xLights XML file is missing from the selected show folder or cannot be read, PortPilot opens a file picker so you can select the XML manually.

### Added

- Choose English or Dutch during Windows setup and change the language later in PortPilot.
- Choose Light, Dark, or Use system setting under Settings → Theme. PortPilot remembers your selection.

## 1.0.4 - 2026-11-18

### Added
- PortPilot checks GitHub for a new release at startup and from the Help menu. The update button downloads the installer, verifies its SHA-256 checksum and installs the new version while keeping your projects.
- The portable edition opens the download page when an update is available.

## 1.0.3 - 2026-11-18

### Added
- The Pixel Types tab lets you assign a type to one prop or all visible props, with search and filters. A checkbox shows props that already have a type.
- Frame rate settings support 40 fps (25 ms, the default), 20 fps (50 ms) and a custom frame interval. The controller pixel limit depends on the selected frame rate.
- The hardware library includes sourced per-port pixel limits at 40 and 20 fps. For the Falcon F16V4/V5, it lists 1,024 at 20 fps and 680 at 40 fps as a guideline.

### Fixed
- Daisy-chained smart receivers such as 17A and 17B now apply your personal limit per physical receiver port. The controller limit applies to the whole chain. Current and power supply calculations are per receiver.

## 1.0.2 - 2026-11-18

### Added
- Editable pixel profiles per setup for 12 V and 5 V bullet and seed pixels, with sourced current ratings at full white.
- Pixel profiles per prop. Port and power supply calculations use the voltage of the assigned pixels.
- A red warning for mixing 5 V and 12 V pixels on one port, or connecting pixels to a supply of a different voltage.

## 1.0.1 - 2026-11-18

### Added
- Change your personal limit at any time and apply it to new assignments, the current assignment or all assignments.

## 1.0.0 - 2026-11-18

- First standalone Windows release. It works offline and requires no Claude account. Import controller and layout files from your xLights show folder, store projects and backups locally, and export to Excel, PDF or a wiring diagram image.
