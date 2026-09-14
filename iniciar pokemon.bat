@echo off
cd /d "%~dp0"
echo Iniciando servidor PHP en http://localhost:8000...
start http://localhost:8000
"C:\Users\ricar\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.4_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe" -S localhost:8000
pause
