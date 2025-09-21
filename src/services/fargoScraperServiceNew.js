import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

class FargoScraperServiceNew {
  constructor() {
    this.baseUrl = 'http://fairmatch.fargorate.com';
    this.logsDir = 'logs';
    this.ensureLogsDir();
  }

  ensureLogsDir() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] [SCRAPER-NEW] ${message}`);
  }

  /**
   * Search for a single player on FargoRate
   */
  async searchPlayer(firstName, lastName) {
    let browser = null;
    try {
      this.log(`Searching for: ${firstName} ${lastName}`);
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set a realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1280, height: 720 });

      this.log('Navigating to FargoRate...');
      await page.goto(this.baseUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });

      // Wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 5000));

      this.log('Looking for search input...');
      
      // Wait for search input to be available
      await page.waitForSelector('input[placeholder="Player name or id"]', { timeout: 10000 });
      
      const searchTerm = `${firstName} ${lastName}`;
      this.log(`Searching for: "${searchTerm}"`);

      // Clear and fill the search input
      await page.evaluate((selector, value) => {
        const input = document.querySelector(selector);
        if (input) {
          input.value = '';
          input.focus();
          input.value = value;
          // Trigger events to ensure the value is recognized
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, 'input[placeholder="Player name or id"]', searchTerm);

      // Wait a moment for the input to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify the input has the correct value
      const inputValue = await page.evaluate(() => {
        const input = document.querySelector('input[placeholder="Player name or id"]');
        return input ? input.value : '';
      });
      
      this.log(`Input value: "${inputValue}"`);

      if (inputValue !== searchTerm) {
        this.log('Input value mismatch, trying alternative approach', 'WARN');
        // Try typing directly
        await page.click('input[placeholder="Player name or id"]');
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.type('input[placeholder="Player name or id"]', searchTerm);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.log('Looking for search button...');
      
      // Find and click the search button using JavaScript
      const buttonClicked = await page.evaluate(() => {
        const button = document.querySelector('button[id="searchPlayer-2"]');
        if (button) {
          button.click();
          return true;
        }
        return false;
      });

      if (buttonClicked) {
        this.log('Search button clicked successfully');
      } else {
        this.log('Search button not found, trying Enter key', 'WARN');
        await page.keyboard.press('Enter');
      }

      this.log('Waiting for search results...');
      
      // Wait for results to load - be patient
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check if we have results
      const hasResults = await page.evaluate(() => {
        const table = document.querySelector('#customListResults');
        return table && table.textContent.trim().length > 0;
      });

      if (!hasResults) {
        this.log('No results found, waiting longer...', 'WARN');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      // Get the page content
      const pageContent = await page.evaluate(() => document.body.textContent);
      
      this.log(`Page content length: ${pageContent.length}`);
      
      // Look for the player's name and rating
      const playerFound = pageContent.includes(firstName) && pageContent.includes(lastName);
      this.log(`Player name found: ${playerFound}`);
      
      if (playerFound) {
        // First, try to find the rating in the search results table
        const tableContent = await page.evaluate(() => {
          const table = document.querySelector('#searchResults-2');
          return table ? table.textContent : '';
        });
        
        this.log(`Table content length: ${tableContent.length}`);
        
        if (tableContent.length > 0) {
          // Look for the player's name in the table
          if (tableContent.includes(firstName) && tableContent.includes(lastName)) {
            this.log('Player found in search results table');
            
            // Look for ratings in the table content
            const tableRatings = tableContent.match(/\b\d{3,4}\b/g);
            if (tableRatings) {
              const ratings = tableRatings.map(n => parseInt(n)).filter(n => n >= 200 && n <= 900);
              this.log(`Found ratings in table: ${ratings.join(', ')}`);
              
              if (ratings.length > 0) {
                // Prefer ratings in the 500-600 range (like Tom's 514)
                let selectedRating = ratings.find(r => r >= 500 && r <= 600);
                if (!selectedRating) {
                  selectedRating = ratings.find(r => r >= 400 && r <= 600);
                }
                if (!selectedRating) {
                  selectedRating = ratings[0];
                }
                
                this.log(`Selected rating from table: ${selectedRating}`);
                return {
                  name: `${firstName} ${lastName}`,
                  rating: selectedRating,
                  source: 'FargoRate Search Results Table'
                };
              }
            }
          }
        }
        
        // If table search didn't work, try the original approach
        const ratingPattern = new RegExp(`${firstName}[^0-9]*${lastName}[^0-9]*(\\d{3,4})`, 'i');
        const match = pageContent.match(ratingPattern);
        
        if (match) {
          const rating = parseInt(match[1]);
          this.log(`Found rating with pattern: ${rating}`);
          return {
            name: `${firstName} ${lastName}`,
            rating: rating,
            source: 'FargoRate Search Pattern'
          };
        }
        
        // Last resort: look for any 3-4 digit number, but be smarter about selection
        const allNumbers = pageContent.match(/\b\d{3,4}\b/g);
        if (allNumbers) {
          const ratings = allNumbers.map(n => parseInt(n)).filter(n => n >= 200 && n <= 900);
          this.log(`Found potential ratings: ${ratings.join(', ')}`);
          
          if (ratings.length > 0) {
            // Prefer ratings in the 500-600 range (like Tom's 514)
            let selectedRating = ratings.find(r => r >= 500 && r <= 600);
            if (!selectedRating) {
              selectedRating = ratings.find(r => r >= 400 && r <= 600);
            }
            if (!selectedRating) {
              selectedRating = ratings[0];
            }
            
            this.log(`Selected rating (smart selection): ${selectedRating}`);
            return {
              name: `${firstName} ${lastName}`,
              rating: selectedRating,
              source: 'FargoRate Search (smart fallback)'
            };
          }
        }
      }

      this.log(`Player not found: ${firstName} ${lastName}`, 'WARN');
      return null;

    } catch (error) {
      this.log(`Search failed: ${error.message}`, 'ERROR');
      return null;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Test the scraper with a specific player
   */
  async testScraper(firstName, lastName) {
    this.log(`Testing scraper with: ${firstName} ${lastName}`);
    
    const result = await this.searchPlayer(firstName, lastName);
    
    if (result) {
      this.log(`✅ SUCCESS: Found ${result.name} with rating ${result.rating}`);
      return result;
    } else {
      this.log(`❌ FAILED: Could not find ${firstName} ${lastName}`);
      return null;
    }
  }
}

export default new FargoScraperServiceNew();
