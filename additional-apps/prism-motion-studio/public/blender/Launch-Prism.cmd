@echo off
setlocal DisableDelayedExpansion
cd /d "%~dp0"
set "PRISM_BLENDER="
if exist "blender-path.txt" set /p PRISM_BLENDER=<"blender-path.txt"
if defined PRISM_BLENDER if exist "%PRISM_BLENDER%" goto launch
for /f "delims=" %%B in ('where blender.exe 2^>nul') do set "PRISM_BLENDER=%%B"
if defined PRISM_BLENDER if exist "%PRISM_BLENDER%" goto launch
for /d %%D in ("%ProgramFiles%\Blender Foundation\Blender *") do if exist "%%~D\blender.exe" set "PRISM_BLENDER=%%~D\blender.exe"
if defined PRISM_BLENDER if exist "%PRISM_BLENDER%" goto launch
echo Choose blender.exe from your Blender installation.
for /f "delims=" %%B in ('powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.OpenFileDialog; $d.Title='Choose Blender 4.5 or newer'; $d.Filter='Blender executable|blender.exe'; if($d.ShowDialog() -eq 'OK'){[Console]::WriteLine($d.FileName)}"') do set "PRISM_BLENDER=%%B"
if not defined PRISM_BLENDER goto missing
if not exist "%PRISM_BLENDER%" goto missing
:launch
"%PRISM_BLENDER%" --background --factory-startup --python-exit-code 1 --python "%~dp0bootstrap.py" -- "%~dp0."
if errorlevel 1 pause
exit /b
:missing
echo Blender was not selected. Install Blender 4.5 or newer, then run this launcher again.
pause
