@echo off
rem PortPilot voor Windows bouwen. Dubbelklik dit bestand, of draai het vanuit de map windows.
rem Nodig: Node.js LTS (nodejs.org). Voor de installer ook NSIS (nsis.sourceforge.io); zonder NSIS krijg je alleen de portable versie.
setlocal
cd /d "%~dp0"
if not exist node_modules (
  echo Onderdelen installeren ^(eenmalig, een paar minuten^)...
  call npm ci || goto fout
)
node build_app.js || goto fout
if exist dist rmdir /s /q dist
call npx electron-builder --win dir --x64 || goto fout
node stamp_exe.js dist\win-unpacked\PortPilot.exe || goto fout
call npx electron-builder --win portable --x64 --prepackaged dist\win-unpacked || goto fout
for /f %%v in ('node -p "require('./package.json').version"') do set VER=%%v
set MAKENSIS=
where makensis >nul 2>nul && set MAKENSIS=makensis
if not defined MAKENSIS if exist "%ProgramFiles(x86)%\NSIS\makensis.exe" set MAKENSIS="%ProgramFiles(x86)%\NSIS\makensis.exe"
if not defined MAKENSIS if exist "%ProgramFiles%\NSIS\makensis.exe" set MAKENSIS="%ProgramFiles%\NSIS\makensis.exe"
if defined MAKENSIS (
  %MAKENSIS% -V2 -DVERSION=%VER% installer.nsi || goto fout
) else (
  echo NSIS niet gevonden: alleen de portable versie is gemaakt. Installeer NSIS voor de installer.
)
echo.
echo Klaar. Bestanden in de map dist:
dir /b dist\*.exe
pause
exit /b 0
:fout
echo.
echo Er ging iets mis; zie de melding hierboven.
pause
exit /b 1
