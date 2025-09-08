@echo off
echo Starting Daily Fargo Rating Update...
echo.

cd /d "%~dp0.."
node scripts/daily-fargo-update.js

echo.
echo Press any key to exit...
pause >nul


