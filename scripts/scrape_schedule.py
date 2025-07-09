from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import json
import time
import sys
import re
import requests

BACKEND_API = "http://localhost:8080/api/seasons/divisions"

DIVISION_URLS = {
    "FRBCAPL TEST": "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=e05896bb-b0f4-4a80-bf99-b2ca012ceaaa&divisionId=b345a437-3415-4765-b19a-b2f7014f2cfa",
    "Singles Test": "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=e05896bb-b0f4-4a80-bf99-b2ca012ceaaa&divisionId=9058a0cc-3231-4118-bd91-b305006fe578"
}

def safe_filename(name):
    # Replace spaces and non-alphanumeric chars with underscores
    return re.sub(r'[^A-Za-z0-9]', '_', name)

def fetch_divisions():
    resp = requests.get(BACKEND_API)
    resp.raise_for_status()
    data = resp.json()
    if not data.get('success'):
        raise Exception('Failed to fetch divisions from backend')
    # Return list of division names
    return data['divisions']

def scrape_division(division_name, url):
    print(f"Scraping {division_name}...")
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')

    driver = webdriver.Chrome(options=options)
    driver.get(url)
    time.sleep(5)  # Wait for page to load

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    schedule_list = soup.find("div", id="schedule-list")
    schedule = []
    current_date = None

    if not schedule_list:
        print(f"Could not find schedule list for {division_name}")
        return []

    for elem in schedule_list.children:
        if getattr(elem, 'name', None) == 'div':
            if 'schedule-date' in elem.get('class', []):
                current_date = elem.get_text(strip=True)
            elif 'schedule-team-block' in elem.get('class', []):
                teams = elem.find_all('span', class_='schedule-team')
                if len(teams) == 2:
                    player1 = teams[0].get_text(strip=True).replace('(H)', '').replace('(A)', '').strip()
                    player2 = teams[1].get_text(strip=True).replace('(H)', '').replace('(A)', '').strip()
                    location = elem.find('span', class_='schedule-location').get_text(strip=True)
                    schedule.append({
                        "division": division_name,
                        "date": current_date,
                        "player1": player1,
                        "player2": player2,
                        "location": location
                    })
    print(f"  Found {len(schedule)} matches.")
    return schedule

def main():
    divisions = fetch_divisions()
    if len(sys.argv) > 2:
        division_to_scrape = sys.argv[1]
        output_filename = sys.argv[2]
        if division_to_scrape not in divisions:
            print(f"Division '{division_to_scrape}' not found in backend.")
            print("Available divisions:", ", ".join(divisions))
            sys.exit(1)
        url = DIVISION_URLS.get(division_to_scrape)
        if not url:
            print(f"No URL found for division '{division_to_scrape}'.")
            sys.exit(1)
        matches = scrape_division(division_to_scrape, url)
        with open(output_filename, "w", encoding="utf-8") as f:
            json.dump(matches, f, indent=2)
        print(f"Saved {len(matches)} matches to {output_filename}")
    else:
        print("Usage: python scripts/scrape_schedule.py \"DIVISION NAME\" \"OUTPUT FILE\"")

if __name__ == "__main__":
    main()
