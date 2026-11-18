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
!define MUI_LANGDLL_REGISTRY_ROOT HKCU
!define MUI_LANGDLL_REGISTRY_KEY "Software\PortPilot"
!define MUI_LANGDLL_REGISTRY_VALUENAME "Installer Language"
!define MUI_LANGDLL_ALWAYSSHOW
!define MUI_LANGDLL_ALLLANGUAGES
!define MUI_WELCOMEPAGE_TITLE "$(WelcomeTitle)"
!define MUI_WELCOMEPAGE_TEXT "$(WelcomeText)"
!define MUI_FINISHPAGE_RUN "$INSTDIR\PortPilot.exe"
!define MUI_FINISHPAGE_RUN_TEXT "$(LaunchText)"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Dutch"
!insertmacro MUI_LANGUAGE "English"
LangString WelcomeTitle ${LANG_DUTCH} "${APP} ${VERSION} installeren"
LangString WelcomeTitle ${LANG_ENGLISH} "Install PortPilot ${VERSION}"
LangString WelcomeText ${LANG_DUTCH} "PortPilot verdeelt de props uit je xLights-layout over de poorten van je controllers, met pixels en vermogen per poort en per voeding.$\r$\n$\r$\nPortPilot leest alleen uit je xLights-showmap en verandert niets aan je xLights-bestanden. Je gegevens blijven op deze computer.$\r$\n$\r$\nSluit PortPilot als het nog open staat en klik op Volgende."
LangString WelcomeText ${LANG_ENGLISH} "Assign props from your xLights layout to controller and receiver ports and see the pixel count and power load.$\r$\n$\r$\nPortPilot reads from your xLights show folder and stores your projects on this computer.$\r$\n$\r$\nClose PortPilot if it is running, then click Next."
LangString LaunchText ${LANG_DUTCH} "PortPilot starten"
LangString LaunchText ${LANG_ENGLISH} "Launch PortPilot"
LangString UninstallShortcut ${LANG_DUTCH} "PortPilot verwijderen"
LangString UninstallShortcut ${LANG_ENGLISH} "Uninstall PortPilot"


Function .onInit
  SetShellVarContext current
  ClearErrors
  FileOpen $0 "$APPDATA\PortPilot\language.txt" r
  IfErrors choose_language
    FileRead $0 $1
    FileClose $0
    StrCmp $1 "en" 0 +3
      StrCpy $LANGUAGE ${LANG_ENGLISH}
      Goto remember_language
    StrCpy $LANGUAGE ${LANG_DUTCH}
  remember_language:
    WriteRegStr HKCU "Software\PortPilot" "Installer Language" $LANGUAGE
  choose_language:
    IfSilent done_language
    !insertmacro MUI_LANGDLL_DISPLAY
  done_language:
FunctionEnd

Function un.onInit
  !insertmacro MUI_UNGETLANGUAGE
FunctionEnd

Section "PortPilot"
  SetShellVarContext current
  nsExec::Exec 'taskkill /IM PortPilot.exe /F'
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\resources"
  File /r "dist\win-unpacked\*.*"
  CreateDirectory "$APPDATA\PortPilot"
  ClearErrors
  FileOpen $0 "$APPDATA\PortPilot\language.txt" w
  IfErrors language_done
    StrCmp $LANGUAGE ${LANG_ENGLISH} 0 +3
      FileWrite $0 "en"
      Goto close_language
    FileWrite $0 "nl"
  close_language:
    FileClose $0
  language_done:
  WriteUninstaller "$INSTDIR\Verwijderen.exe"
  CreateDirectory "$SMPROGRAMS\${APP}"
  CreateShortcut "$SMPROGRAMS\${APP}\${APP}.lnk" "$INSTDIR\PortPilot.exe"
  Delete "$SMPROGRAMS\${APP}\PortPilot verwijderen.lnk"
  Delete "$SMPROGRAMS\${APP}\Uninstall PortPilot.lnk"
  CreateShortcut "$SMPROGRAMS\${APP}\$(UninstallShortcut).lnk" "$INSTDIR\Verwijderen.exe"
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
