; PortPilot installer: per gebruiker, geen beheerdersrechten nodig.
; Bouwen (vanuit de map ppwin): makensis -DVERSION=1.0.0 installer.nsi
Unicode true
!include "MUI2.nsh"
!ifndef VERSION
  !define VERSION "1.0.0"
!endif
!define APP "PortPilot"
!define UNINST "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP}"

Name "${APP} ${VERSION}"
OutFile "dist\PortPilot-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\${APP}"
InstallDirRegKey HKCU "Software\${APP}" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} installer"
VIAddVersionKey "CompanyName" "Laserworx"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "Laserworx"

!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "${APP} ${VERSION} installeren"
!define MUI_WELCOMEPAGE_TEXT "PortPilot verdeelt de props uit je xLights-layout over de poorten van je controllers, met pixels en vermogen per poort en per voeding.$\r$\n$\r$\nPortPilot leest alleen uit je xLights-showmap en verandert niets aan je xLights-bestanden. Je gegevens blijven op deze computer.$\r$\n$\r$\nSluit PortPilot als het nog open staat en klik op Volgende."
!define MUI_FINISHPAGE_RUN "$INSTDIR\PortPilot.exe"
!define MUI_FINISHPAGE_RUN_TEXT "PortPilot starten"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Dutch"

Section "PortPilot"
  SetShellVarContext current
  nsExec::Exec 'taskkill /IM PortPilot.exe /F'
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\resources"
  File /r "dist\win-unpacked\*.*"
  WriteUninstaller "$INSTDIR\Verwijderen.exe"
  CreateDirectory "$SMPROGRAMS\${APP}"
  CreateShortcut "$SMPROGRAMS\${APP}\${APP}.lnk" "$INSTDIR\PortPilot.exe"
  CreateShortcut "$SMPROGRAMS\${APP}\${APP} verwijderen.lnk" "$INSTDIR\Verwijderen.exe"
  CreateShortcut "$DESKTOP\${APP}.lnk" "$INSTDIR\PortPilot.exe"
  WriteRegStr HKCU "Software\${APP}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINST}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${UNINST}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST}" "Publisher" "Laserworx"
  WriteRegStr HKCU "${UNINST}" "DisplayIcon" "$INSTDIR\PortPilot.exe"
  WriteRegStr HKCU "${UNINST}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST}" "UninstallString" '"$INSTDIR\Verwijderen.exe"'
  WriteRegDWORD HKCU "${UNINST}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST}" "NoRepair" 1
SectionEnd

; Verwijderen haalt alleen het programma weg. Je projecten en back-ups in %APPDATA%\PortPilot blijven staan.
Section "Uninstall"
  SetShellVarContext current
  nsExec::Exec 'taskkill /IM PortPilot.exe /F'
  Delete "$DESKTOP\${APP}.lnk"
  RMDir /r "$SMPROGRAMS\${APP}"
  ; alleen de PortPilot-map weghalen, en alleen als daar echt PortPilot in staat
  IfFileExists "$INSTDIR\PortPilot.exe" 0 +3
    RMDir /r "$INSTDIR"
    Goto +2
    Delete "$INSTDIR\Verwijderen.exe"
  DeleteRegKey HKCU "${UNINST}"
  DeleteRegKey HKCU "Software\${APP}"
SectionEnd
