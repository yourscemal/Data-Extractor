# Maps Data Extractor

A Chrome extension that extracts business data from Google Maps search results and exports it as CSV or Excel.

**Created by Cemal Shabinas** — credit must be given in any use, distribution, or derivative work.

## Features

- Scrape business listings from Google Maps search results
- Two scraping modes:
  - **Fast mode** — scrolls through the list and captures name, rating, reviews, category, address, and Google Maps URL
  - **Enriched mode** — clicks into each result to also extract phone number, website, and full address
- Export data as **CSV** or **Excel (.xlsx)**
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
5. (Optional) Adjust **Max results** and toggle **Enriched mode**
6. Click **Start Scraping**
7. Wait for scraping to complete — progress is shown in the popup
8. Click **CSV** or **Excel** to export your data

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

MIT License — see [LICENSE](LICENSE). Credit to **Cemal Shabinas** must be included in all copies or substantial portions of this software.
