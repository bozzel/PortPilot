@echo off
rem PortPilot uitbrengen op GitHub. Dubbelklik, of in een opdrachtprompt in C:\PortPilot: release.cmd   (proef: release.cmd -DryRun)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0release.ps1" %*
pause
