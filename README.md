# Maps Data Extractor

A Chrome extension that extracts business data from Google Maps search results and exports it as CSV or Excel.

**Created by Cemal** — credit must be given in any use, distribution, or derivative work.

## Features

- Scrape business listings from Google Maps search results
- Two scraping modes:
  - **Fast mode** — scrolls through the list and captures name, rating, reviews, category, address, and Google Maps URL
  - **Enriched mode** — clicks into each result to also extract phone number, website, and full address
- Export data as **CSV**, **Excel (.xlsx)**, or **JSON**
- **Copy to clipboard** — one-click copy as tab-separated text (paste into spreadsheets)
- **Data preview table** — see scraped results directly in the popup before exporting
- **Column selection** — choose which fields to include in your export
- **Configurable scroll speed** — adjust min/max delay between scrolls
- **Scrape stats** — elapsed time and items/sec shown during and after scraping
- Configurable max results (up to 1000)
- Progress tracking with stop/cancel support
- Data persists across popup opens

## Installation

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `data-extractor` folder
5. The extension icon will appear in your toolbar

## Usage

1. Go to [Google Maps](https://www.google.com/maps)
2. Search for something (e.g. "Restaurants in Texas", "Hotels in New York")
3. Wait for results to load in the left panel
4. Click the **Maps Data Extractor** extension icon
5. (Optional) Adjust **Max results**, toggle **Enriched mode**, and set **Scroll speed**
6. Click **Start Scraping**
7. Wait for scraping to complete — progress, elapsed time, and items/sec are shown
8. Review data in the **Preview table**
9. (Optional) Click **Columns** to select which fields to include
10. Click **CSV**, **Excel**, **JSON**, or **Copy** to export

## Exported Fields

| Field | Fast Mode | Enriched Mode |
|-------|-----------|---------------|
| Business Name | ✅ | ✅ |
| Rating | ✅ | ✅ |
| Reviews | ✅ | ✅ |
| Category | ✅ | ✅ |
| Address | partial | ✅ |
| Phone | ❌ | ✅ |
| Website | ❌ | ✅ |
| Google Maps URL | ✅ | ✅ |

## Disclaimer

**USE AT YOUR OWN RISK.** The author (Cemal) is **not responsible** for how this tool is used. By using this software, you agree that:

- You are solely responsible for your use of this tool and any data you collect with it.
- You will comply with all applicable laws, regulations, and terms of service, including Google's Terms of Service.
- The author bears no liability for any misuse, legal consequences, data loss, or damages arising from the use of this software.
- This tool is provided for educational and personal use purposes.

## License

MIT License — see [LICENSE](LICENSE). Credit to **Cemal** must be included in all copies or substantial portions of this software.
