# Frequently asked questions

[Back to PortPilot](../README.md) · [Quick start](quick-start.md)

### Does PortPilot change my xLights files?

PortPilot reads the layout and network XML files and saves its plans separately. Apply the final assignments in xLights yourself.

### Which XML file should I choose?

Use `xlights_networks.xml` for controllers and `xlights_rgbeffects.xml` for the layout and props. Both are normally in your xLights show folder. If PortPilot opens a file picker, select the file named in its title.

### What does a green port mean?

PortPilot checks your personal pixel thresholds, the controller data limit at the selected frame rate, and the port current limit. It also flags wiring or voltage mismatches where it can detect them. Check your hardware ratings, pixel type and power injection before wiring.

### Why does the wattage show an estimate?

PortPilot uses the pixel profile and port brightness to estimate load. Use the datasheet for your exact pixels or device, and review any profile that is marked as unverified.

### Does it check for updates on startup?

Yes. The Windows app checks shortly after opening and shows a banner when a newer stable release is available. You can also choose **Help → Check for updates**. The portable build opens the release page for a manual download.

### Can I use it on a Mac?

The stable downloads are for Windows. A separate macOS beta is in preparation for Apple Silicon and Intel. The Windows download link continues to point to the stable release.

### How do I report a problem?

[Open a bug report](https://github.com/bozzel/PortPilot/issues/new?template=bug.yml) with your version, platform and the steps that reproduce the error. Issues are public, so use a small anonymized example if the report needs a show file.
