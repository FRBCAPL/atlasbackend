@echo off
echo Updating standings for all divisions...
cd /d "%~dp0"
python scrape_all_standings.py
pause 