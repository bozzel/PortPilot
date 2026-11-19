# Quick start

[Back to PortPilot](../README.md) · [Examples](examples.md) · [FAQ](faq.md)

1. Get the Windows installer or portable build from [Releases](https://github.com/bozzel/PortPilot/releases/latest).
2. Open PortPilot and create a hardware setup from your xLights show. Choose the folder that contains `xlights_networks.xml` and `xlights_rgbeffects.xml`. If the expected file is missing from the selected folder, use the file picker to select it.
3. Under **Hardware Setup**, review the controllers and add your receivers and power supplies. Set the power input ranges and voltages to match your wiring. Choose the same frame rate you use in xLights under **Settings**.
4. Use **Layout → Import** to read your props. Review the port assignments imported from xLights. Under **Pixel Types**, assign the right type to each prop or enter a fixed wattage for a device such as a floodlight.
5. Under **Port Assignment**, drag props to their intended ports. You can also use **Generate proposal** to create another assignment for comparison.
6. Review the messages and the loads per port and power supply. Compare any estimates with your pixel and hardware specifications. Export to **Excel**, **PDF**, or **Wiring Diagram → Save as image**.
7. Apply the wiring plan in the xLights Controller Visualizer and check it against the physical show before uploading the controller configuration.

For a first look, choose **Example** when creating a setup. Then open **Port Assignment → Try with sample props** to load the sample layout.
