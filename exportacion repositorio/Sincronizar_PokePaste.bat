@echo off
title Sincronizador de Equipos PokePaste a AllTeams.txt
color 0A
echo ========================================================
echo   Ejecutando Macro de Sincronizacion de PokePaste...
echo ========================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0export_all_teams.ps1"
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause > nul
