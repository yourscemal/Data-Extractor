/**
 * Popup script — UI logic for start/stop/export controls.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');
  const btnCSV = document.getElementById('btnCSV');
  const btnExcel = document.getElementById('btnExcel');
  const maxResultsInput = document.getElementById('maxResults');
  const enrichedCheckbox = document.getElementById('enrichedMode');
  const progressSection = document.getElementById('progressSection');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressCount = document.getElementById('progressCount');
  const exportSection = document.getElementById('exportSection');
  const exportCount = document.getElementById('exportCount');
  const errorBanner = document.getElementById('errorBanner');
  const errorText = document.getElementById('errorText');
  const errorClose = document.getElementById('errorClose');
  const statusText = document.getElementById('statusText');

  let collectedData = [];

  // ---- Load persisted data ----

  chrome.storage.local.get(['scrapedData', 'scrapeTimestamp'], (result) => {
    if (result.scrapedData && result.scrapedData.length > 0) {
      collectedData = result.scrapedData;
      showExportSection(collectedData.length);
      const ago = timeSince(result.scrapeTimestamp);
      statusText.textContent = `${collectedData.length} results from ${ago}`;
    }
  });

  // ---- Event listeners ----

  btnStart.addEventListener('click', startScraping);
  btnStop.addEventListener('click', stopScraping);
  btnCSV.addEventListener('click', () => exportData('csv'));
  btnExcel.addEventListener('click', () => exportData('xlsx'));
  errorClose.addEventListener('click', () => errorBanner.classList.add('hidden'));

  // ---- Listen for messages from content script ----

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SCRAPE_PROGRESS') {
      updateProgress(msg.data);
    }
    if (msg.type === 'SCRAPE_COMPLETE') {
      onScrapeComplete(msg.data);
    }
    if (msg.type === 'SCRAPE_ERROR') {
      showError(msg.error);
      resetUI();
    }
  });

  // ---- Core functions ----

  async function startScraping() {
    const tab = await getActiveTab();
    if (!tab || !tab.url || !tab.url.includes('google.com/maps')) {
      showError('Please navigate to Google Maps with search results first.');
      return;
    }

    hideError();
    collectedData = [];
    exportSection.classList.add('hidden');

    // Show progress UI
    btnStart.classList.add('hidden');
    btnStop.classList.remove('hidden');
    progressSection.classList.remove('hidden');
    progressBar.classList.add('indeterminate');
    progressText.textContent = 'Scrolling through results...';
    progressCount.textContent = '0 items';
    statusText.textContent = 'Scraping...';

    const maxResults = parseInt(maxResultsInput.value, 10) || 200;
    const enriched = enrichedCheckbox.checked;

    chrome.tabs.sendMessage(tab.id, {
      type: 'START_SCRAPE',
      maxResults,
      enriched,
    }, (response) => {
      if (chrome.runtime.lastError) {
        showError('Could not connect to Google Maps page. Try refreshing the page.');
        resetUI();
      }
    });
  }

  function stopScraping() {
    getActiveTab().then((tab) => {
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: 'STOP_SCRAPE' });
      }
    });
    statusText.textContent = 'Stopped';
  }

  function updateProgress(data) {
    progressCount.textContent = `${data.count} items`;

    if (data.phase === 'enriching') {
      progressBar.classList.remove('indeterminate');
      const pct = data.total > 0 ? Math.round((data.current / data.total) * 100) : 0;
      progressBar.style.width = pct + '%';
      progressText.textContent = `Enriching details... (${data.current}/${data.total})`;
    } else if (data.phase === 'max_reached') {
      progressText.textContent = 'Max results reached';
    } else {
      progressText.textContent = 'Scrolling through results...';
    }
  }

  function onScrapeComplete(data) {
    collectedData = data || [];
    resetUI();
    if (collectedData.length > 0) {
      showExportSection(collectedData.length);
      statusText.textContent = `Done — ${collectedData.length} results found`;
    } else {
      statusText.textContent = 'No results found';
    }
  }

  async function exportData(format) {
    if (collectedData.length === 0) {
      showError('No data to export.');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    let filename, content, mimeType;

    if (format === 'csv') {
      content = Export.toCSV(collectedData);
      filename = `google-maps-data-${timestamp}.csv`;
      mimeType = 'text/csv;charset=utf-8';
    } else {
      const xlsxData = Export.toXLSX(collectedData);
      if (!xlsxData) {
        showError('Excel export unavailable. Try CSV instead.');
        return;
      }
      content = Array.from(new Uint8Array(xlsxData));
      filename = `google-maps-data-${timestamp}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_FILE',
      content,
      filename,
      mimeType,
    }, (response) => {
      if (response && response.success) {
        statusText.textContent = `Exported ${collectedData.length} records as ${format.toUpperCase()}`;
      } else {
        showError('Download failed: ' + (response?.error || 'unknown error'));
      }
    });
  }

  // ---- Helper functions ----

  function getActiveTab() {
    return chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs[0]);
  }

  function showExportSection(count) {
    exportSection.classList.remove('hidden');
    exportCount.textContent = `(${count} records)`;
  }

  function showError(message) {
    errorText.textContent = message;
    errorBanner.classList.remove('hidden');
  }

  function hideError() {
    errorBanner.classList.add('hidden');
  }

  function resetUI() {
    btnStart.classList.remove('hidden');
    btnStop.classList.add('hidden');
    progressSection.classList.add('hidden');
    progressBar.classList.remove('indeterminate');
    progressBar.style.width = '0%';
  }

  function timeSince(timestamp) {
    if (!timestamp) return 'unknown time';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
});
