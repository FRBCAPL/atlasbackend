from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import json
import time
import tempfile
import sys
import re

STANDINGS_URL = "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=e05896bb-b0f4-4a80-bf99-b2ca012ceaaa&divisionId=b345a437-3415-4765-b19a-b2f7014f2cfa"

def safe_filename(filename):
    """Convert filename to safe version for filesystem"""
    return re.sub(r'[^A-Za-z0-9]', '_', filename)

def scrape_standings(division_name, output_filename):
    # Create a unique temp directory for Chrome's user data
    user_data_dir = tempfile.mkdtemp()

    options = Options()
    options.add_argument('--headless')  # Run in headless mode (no window)
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument(f'--user-data-dir={user_data_dir}')

    driver = webdriver.Chrome(options=options)
    driver.get(STANDINGS_URL)

    # Wait for the table to load (increase if your internet is slow)
    time.sleep(5)

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    # Find the first standings table (team standings)
    table = soup.find("table", class_="tablesaw")
    standings = []

    if table:
        for row in table.find("tbody").find_all("tr"):
            cells = row.find_all("td")
            if len(cells) >= 2:
                rank = cells[0].get_text(strip=True)
                name_tag = cells[1].find("a")
                name = name_tag.get_text(strip=True) if name_tag else cells[1].get_text(strip=True)
                standings.append({"rank": rank, "name": name})

        with open(output_filename, "w") as f:
            json.dump(standings, f, indent=2)

        print(f"Saved {len(standings)} players to {output_filename}")
    else:
        print("Could not find standings table.")

def main():
    # Usage: python scrape_standings.py [division name] [output filename]
    if len(sys.argv) > 2:
        division_name = sys.argv[1]
        output_filename = sys.argv[2]
    else:
        division_name = "default"
        output_filename = "standings.json"
    
    scrape_standings(division_name, output_filename)

if __name__ == "__main__":
    main()