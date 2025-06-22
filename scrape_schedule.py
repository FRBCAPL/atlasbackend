from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import json
import time

# Replace with your actual schedule page URL
SCHEDULE_URL = "https://lms.fargorate.com/PublicReport/LeagueReports?leagueId=e05896bb-b0f4-4a80-bf99-b2ca012ceaaa&divisionId=b345a437-3415-4765-b19a-b2f7014f2cfa"

options = Options()
options.add_argument('--headless')
options.add_argument('--disable-gpu')

driver = webdriver.Chrome(options=options)
driver.get(SCHEDULE_URL)
time.sleep(5)  # Adjust if needed for slower pages

soup = BeautifulSoup(driver.page_source, "html.parser")
driver.quit()

schedule_list = soup.find("div", id="schedule-list")
schedule = []
current_date = None

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
                    "date": current_date,
                    "player1": player1,
                    "player2": player2,
                    "location": location
                })

with open("public/schedule.json", "w", encoding="utf-8") as f:

    json.dump(schedule, f, indent=2)

print(f"Saved {len(schedule)} matches to schedule.json")
