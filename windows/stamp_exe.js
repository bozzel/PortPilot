// Zet het PortPilot-pictogram en de versie-informatie in PortPilot.exe (zonder wine). Gebruik: node stamp_exe.js dist/win-unpacked/PortPilot.exe
const ResEdit = require("resedit"), fs = require("fs"), path = require("path");
const file = process.argv[2], pkg = require("./package.json");
const exe = ResEdit.NtExecutable.from(fs.readFileSync(file), { ignoreCert: true });
const res = ResEdit.NtExecutableResource.from(exe);
const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, "build", "icon.ico")));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const gid = groups.length ? groups[0].id : 1, lang = groups.length ? groups[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, gid, lang, ico.icons.map(i => i.data));
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] || ResEdit.Resource.VersionInfo.createEmpty();
const [a, b, c] = pkg.version.split(".").map(Number);
vi.setFileVersion(a, b, c, 0, 1033); vi.setProductVersion(a, b, c, 0, 1033);
vi.setStringValues({ lang: 1033, codepage: 1200 }, { ProductName: "PortPilot", FileDescription: "PortPilot - controller-poortplanner voor xLights", CompanyName: "Laserworx", LegalCopyright: "Laserworx", OriginalFilename: "PortPilot.exe", InternalName: "PortPilot", FileVersion: pkg.version, ProductVersion: pkg.version });
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
fs.writeFileSync(file, Buffer.from(exe.generate()));
console.log("gestempeld:", file, pkg.version, "icoon-groep", gid);
