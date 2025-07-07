#!/usr/bin/env python3
"""
Multi-Division Standings Scraper
Scrapes standings for all divisions defined in the app and saves them to the backend/public directory.
"""

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import json
import time
import tempfile
import sys
import re
import os
from pathlib import Path
import requests

# Division URLs from Dashboard.jsx
# DIVISION_URLS = {
#     "FRBCAPL TEST": "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=e05896bb-b0f4-4a80-bf99-b2ca012ceaaa&divisionId=b345a437-3415-4765-b19a-b2f7014f2cfa",
#     "Singles Test": "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=e05896bb-b0f4-4a80-bf99-b2ca012ceaaa&divisionId=9058a0cc-3231-4118-bd91-b305006fe578"
# }

BACKEND_API = "http://localhost:8080/api/seasons"

def safe_filename(division_name):
    """Convert division name to safe filename"""
    return re.sub(r'[^A-Za-z0-9]', '_', division_name)

def fetch_divisions():
    resp = requests.get(BACKEND_API)
    resp.raise_for_status()
    data = resp.json()
    if not data.get('success'):
        raise Exception('Failed to fetch divisions from backend')
    # Return list of (division_name, standings_url)
    return [
        (s['division'], s['standingsUrl'])
        for s in data['seasons']
        if s.get('standingsUrl')
    ]

def scrape_standings_for_division(division_name, url, output_dir):
    """Scrape standings for a specific division"""
    print(f"🔄 Scraping standings for: {division_name}")
    print(f"   URL: {url}")
    
    # Create a unique temp directory for Chrome's user data
    user_data_dir = tempfile.mkdtemp()

    options = Options()
    options.add_argument('--headless')  # Run in headless mode (no window)
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument(f'--user-data-dir={user_data_dir}')

    driver = None
    try:
        driver = webdriver.Chrome(options=options)
        driver.get(url)

        # Wait for the table to load (increase if your internet is slow)
        print("   ⏳ Waiting for page to load...")
        time.sleep(5)

        soup = BeautifulSoup(driver.page_source, "html.parser")

        # Find the first standings table (team standings)
        table = soup.find("table", class_="tablesaw")
        standings = []

        if table:
            tbody = table.find("tbody")
            if tbody:
                for row in tbody.find_all("tr"):
                    cells = row.find_all("td")
                    if len(cells) >= 2:
                        rank = cells[0].get_text(strip=True)
                        name_tag = cells[1].find("a")
                        name = name_tag.get_text(strip=True) if name_tag else cells[1].get_text(strip=True)
                        standings.append({"rank": rank, "name": name})

            # Create output filename
            safe_name = safe_filename(division_name)
            output_filename = os.path.join(output_dir, f"standings_{safe_name}.json")
            
            # Save standings to file
            with open(output_filename, "w") as f:
                json.dump(standings, f, indent=2)

            print(f"   ✅ Saved {len(standings)} players to {output_filename}")
            return True
        else:
            print(f"   ❌ Could not find standings table for {division_name}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error scraping {division_name}: {str(e)}")
        return False
    finally:
        if driver:
            driver.quit()

def main():
    """Main function to scrape all divisions"""
    print("🚀 Starting Multi-Division Standings Scraper")
    print("=" * 50)
    
    # Determine output directory
    script_dir = Path(__file__).parent
    output_dir = script_dir.parent / "public"
    
    if not output_dir.exists():
        print(f"❌ Output directory does not exist: {output_dir}")
        sys.exit(1)
    
    print(f"📁 Output directory: {output_dir}")
    print()
    
    # Track results
    successful = 0
    failed = 0
    
    # Fetch divisions dynamically
    divisions = dict(fetch_divisions())
    # Scrape each division
    for division_name, url in divisions.items():
        print(f"Processing division {division_name}...")
        if scrape_standings_for_division(division_name, url, output_dir):
            successful += 1
        else:
            failed += 1
        print()
    
    # Summary
    print("=" * 50)
    print("📊 Scraping Summary:")
    print(f"   ✅ Successful: {successful}")
    print(f"   ❌ Failed: {failed}")
    print(f"   📁 Files saved to: {output_dir}")
    
    if failed > 0:
        print("\n⚠️  Some divisions failed to scrape. Check the errors above.")
        sys.exit(1)
    else:
        print("\n🎉 All divisions scraped successfully!")

if __name__ == "__main__":
    main() 