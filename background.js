/**
 * Background service worker — message relay and download orchestration.
 */

// Relay messages between content script and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'DOWNLOAD_FILE') {
    const { content, filename, mimeType } = msg;

    // Convert content to a data URL
    let dataUrl;
    if (content instanceof Array || ArrayBuffer.isView(content) || content instanceof ArrayBuffer) {
      // Binary data (XLSX)
      const bytes = new Uint8Array(content);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      dataUrl = 'data:' + mimeType + ';base64,' + btoa(binary);
    } else {
      // Text data (CSV) — handle Unicode with UTF-8 BOM
      const bom = '\uFEFF';
      const blob = new Blob([bom + content], { type: mimeType });
      // Use a blob URL via an offscreen approach or data URL
      const encoder = new TextEncoder();
      const encoded = encoder.encode(bom + content);
      let binary = '';
      for (let i = 0; i < encoded.length; i++) {
        binary += String.fromCharCode(encoded[i]);
      }
      dataUrl = 'data:' + mimeType + ';base64,' + btoa(binary);
    }

    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: true,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      }
    );

    return true; // keep channel open for async
  }

  // Store data in storage.local for persistence across popup opens
  if (msg.type === 'SCRAPE_COMPLETE') {
    chrome.storage.local.set({
      scrapedData: msg.data,
      scrapeTimestamp: Date.now(),
    });
  }

  if (msg.type === 'SCRAPE_PROGRESS') {
    // Forward progress to popup if it's open
    chrome.runtime.sendMessage(msg).catch(() => {
      // Popup not open, ignore
    });
  }
});
