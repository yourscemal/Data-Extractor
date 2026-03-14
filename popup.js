/**
 * Popup script — UI logic for start/stop/export controls.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');
  const btnCSV = document.getElementById('btnCSV');
  const btnExcel = document.getElementById('btnExcel');
  const btnJSON = document.getElementById('btnJSON');
  const btnCopy = document.getElementById('btnCopy');
  const maxResultsInput = document.getElementById('maxResults');
  const enrichedCheckbox = document.getElementById('enrichedMode');
  const delayMinInput = document.getElementById('delayMin');
  const delayMaxInput = document.getElementById('delayMax');
  const progressSection = document.getElementById('progressSection');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressCount = document.getElementById('progressCount');
  const elapsedTimeEl = document.getElementById('elapsedTime');
  const itemsPerSecEl = document.getElementById('itemsPerSec');
  const exportSection = document.getElementById('exportSection');
  const exportCount = document.getElementById('exportCount');
  const errorBanner = document.getElementById('errorBanner');
  const errorText = document.getElementById('errorText');
  const errorClose = document.getElementById('errorClose');
  const statusText = document.getElementById('statusText');
  const btnToggleColumns = document.getElementById('btnToggleColumns');
  const columnSelector = document.getElementById('columnSelector');
  const statsBar = document.getElementById('statsBar');
  const statsDuration = document.getElementById('statsDuration');
  const statsRate = document.getElementById('statsRate');
  const previewSection = document.getElementById('previewSection');
  const previewHead = document.getElementById('previewHead');
  const previewBody = document.getElementById('previewBody');
  const previewNote = document.getElementById('previewNote');
  const btnClosePreview = document.getElementById('btnClosePreview');

  let collectedData = [];
  let scrapeStartTime = 0;
  let elapsedTimer = null;
  let totalElapsed = 0;

  // ---- Load persisted data ----

  chrome.storage.local.get(['scrapedData', 'scrapeTimestamp', 'scrapeDuration'], (result) => {
    if (result.scrapedData && result.scrapedData.length > 0) {
      collectedData = result.scrapedData;
      totalElapsed = result.scrapeDuration || 0;
      showExportSection(collectedData.length);
      showPreview();
      showStats();
      const ago = timeSince(result.scrapeTimestamp);
      statusText.textContent = `${collectedData.length} results from ${ago}`;
    }
  });

  // ---- Event listeners ----

  btnStart.addEventListener('click', startScraping);
  btnStop.addEventListener('click', stopScraping);
  btnCSV.addEventListener('click', () => exportData('csv'));
  btnExcel.addEventListener('click', () => exportData('xlsx'));
  btnJSON.addEventListener('click', () => exportData('json'));
  btnCopy.addEventListener('click', copyToClipboard);
  errorClose.addEventListener('click', () => errorBanner.classList.add('hidden'));
  btnToggleColumns.addEventListener('click', () => {
    columnSelector.classList.toggle('hidden');
    btnToggleColumns.textContent = columnSelector.classList.contains('hidden') ? 'Columns ▾' : 'Columns ▴';
  });
  btnClosePreview.addEventListener('click', () => previewSection.classList.add('hidden'));

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
    previewSection.classList.add('hidden');

    // Show progress UI
    btnStart.classList.add('hidden');
    btnStop.classList.remove('hidden');
    progressSection.classList.remove('hidden');
    progressBar.classList.add('indeterminate');
    progressText.textContent = 'Scrolling through results...';
    progressCount.textContent = '0 items';
    elapsedTimeEl.textContent = '0:00';
    itemsPerSecEl.textContent = '0 items/sec';
    statusText.textContent = 'Scraping...';

    scrapeStartTime = Date.now();
    startElapsedTimer();

    const maxResults = parseInt(maxResultsInput.value, 10) || 200;
    const enriched = enrichedCheckbox.checked;
    const delayMin = parseInt(delayMinInput.value, 10) || 300;
    const delayMax = parseInt(delayMaxInput.value, 10) || 800;

    chrome.tabs.sendMessage(tab.id, {
      type: 'START_SCRAPE',
      maxResults,
      enriched,
      delayMin,
      delayMax,
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

    // Update items/sec
    const elapsed = data.elapsed || (Date.now() - scrapeStartTime);
    if (elapsed > 0 && data.count > 0) {
      const rate = (data.count / (elapsed / 1000)).toFixed(1);
      itemsPerSecEl.textContent = `${rate} items/sec`;
    }

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
    totalElapsed = Date.now() - scrapeStartTime;
    stopElapsedTimer();
    resetUI();

    if (collectedData.length > 0) {
      showExportSection(collectedData.length);
      showPreview();
      showStats();
      statusText.textContent = `Done — ${collectedData.length} results found`;

      // Persist duration alongside data
      chrome.storage.local.set({ scrapeDuration: totalElapsed });
    } else {
      statusText.textContent = 'No results found';
    }
  }

  function getSelectedColumns() {
    const checks = columnSelector.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checks).map(cb => cb.value);
  }

  async function exportData(format) {
    if (collectedData.length === 0) {
      showError('No data to export.');
      return;
    }

    const selectedKeys = getSelectedColumns();
    const timestamp = new Date().toISOString().slice(0, 10);
    let filename, content, mimeType;

    if (format === 'csv') {
      content = Export.toCSV(collectedData, selectedKeys);
      filename = `google-maps-data-${timestamp}.csv`;
      mimeType = 'text/csv;charset=utf-8';
    } else if (format === 'json') {
      content = Export.toJSON(collectedData, selectedKeys);
      filename = `google-maps-data-${timestamp}.json`;
      mimeType = 'application/json;charset=utf-8';
    } else {
      const xlsxData = Export.toXLSX(collectedData, selectedKeys);
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

  async function copyToClipboard() {
    if (collectedData.length === 0) {
      showError('No data to copy.');
      return;
    }
    const selectedKeys = getSelectedColumns();
    const tsv = Export.toTSV(collectedData, selectedKeys);
    try {
      await navigator.clipboard.writeText(tsv);
      statusText.textContent = `Copied ${collectedData.length} records to clipboard`;
      btnCopy.textContent = 'Copied!';
      setTimeout(() => { btnCopy.textContent = 'Copy'; }, 1500);
    } catch (err) {
      showError('Failed to copy: ' + err.message);
    }
  }

  // ---- Preview table ----

  function showPreview() {
    if (collectedData.length === 0) return;

    previewSection.classList.remove('hidden');
    const cols = Export.COLUMNS;
    const maxPreview = 25;

    // Header
    previewHead.innerHTML = '<tr>' + cols.map(c => `<th>${c.header}</th>`).join('') + '</tr>';

    // Body (show up to maxPreview rows)
    const rows = collectedData.slice(0, maxPreview);
    previewBody.innerHTML = rows.map(record =>
      '<tr>' + cols.map(c => {
        const val = record[c.key];
        const display = val != null ? String(val) : '';
        const escaped = display.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<td title="${escaped}">${escaped}</td>`;
      }).join('') + '</tr>'
    ).join('');

    if (collectedData.length > maxPreview) {
      previewNote.textContent = `Showing ${maxPreview} of ${collectedData.length} results`;
    } else {
      previewNote.textContent = `${collectedData.length} results`;
    }
  }

  // ---- Stats ----

  function showStats() {
    if (totalElapsed > 0 && collectedData.length > 0) {
      statsBar.classList.remove('hidden');
      statsDuration.textContent = `Duration: ${formatDuration(totalElapsed)}`;
      const rate = (collectedData.length / (totalElapsed / 1000)).toFixed(1);
      statsRate.textContent = `${rate} items/sec`;
    }
  }

  // ---- Timer ----

  function startElapsedTimer() {
    stopElapsedTimer();
    elapsedTimer = setInterval(() => {
      const elapsed = Date.now() - scrapeStartTime;
      elapsedTimeEl.textContent = formatDuration(elapsed);
    }, 1000);
  }

  function stopElapsedTimer() {
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
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
    stopElapsedTimer();
  }

  function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
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
