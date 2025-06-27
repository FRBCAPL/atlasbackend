# Standings Scraper Documentation

## Overview
This directory contains scripts to automatically scrape standings for all divisions in your pool league app.

## Files

### `scrape_all_standings.py`
**Main scraper script** that scrapes standings for all divisions defined in the app.

**Features:**
- Scrapes all divisions in one run
- Uses the same URLs defined in `Dashboard.jsx`
- Saves files to `backend/public/` with correct naming
- Provides detailed progress and error reporting
- Handles safe filename conversion

### `scrape_standings.py`
**Original single-division scraper** (legacy, kept for reference).

### `update_standings.bat`
**Windows batch file** for easy one-click execution.

## Usage

### Option 1: Run the Python script directly
```bash
cd backend/scripts
python scrape_all_standings.py
```

### Option 2: Use the batch file (Windows)
```bash
# Double-click update_standings.bat
# OR run from command line:
backend/scripts/update_standings.bat
```

## Output
The script will create/update these files in `backend/public/`:
- `standings_FRBCAPL_TEST.json`
- `standings_Singles_Test.json`

## Adding New Divisions

To add a new division:

1. **Add the division URL** to `DIVISION_URLS` in `scrape_all_standings.py`:
   ```python
   DIVISION_URLS = {
       "FRBCAPL TEST": "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=...&divisionId=...",
       "Singles Test": "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=...&divisionId=...",
       "NEW DIVISION": "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=...&divisionId=..."
   }
   ```

2. **Add the division to your database** using the admin dashboard or running:
   ```bash
   node createInitialDivisions.js
   ```

3. **Run the scraper** to create the standings file:
   ```bash
   python scrape_all_standings.py
   ```

## Requirements
- Python 3.6+
- Chrome browser installed
- ChromeDriver in PATH
- Required Python packages:
  ```bash
  pip install selenium beautifulsoup4
  ```

## Troubleshooting

### "ChromeDriver not found"
- Download ChromeDriver from: https://chromedriver.chromium.org/
- Add it to your system PATH

### "No standings table found"
- The website structure may have changed
- Check if the URL is still valid
- Verify the table class name is still "tablesaw"

### "Permission denied"
- Make sure you have write permissions to `backend/public/`
- Run as administrator if needed

## Automation
You can set up a cron job or Windows Task Scheduler to run this automatically:

**Windows Task Scheduler:**
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (e.g., daily at 2 AM)
4. Action: Start a program
5. Program: `python`
6. Arguments: `C:\path\to\your\app\backend\scripts\scrape_all_standings.py`

**Linux/Mac Cron:**
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/your/app/backend/scripts && python scrape_all_standings.py
``` 