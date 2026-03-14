/**
 * Content script — injected into Google Maps pages.
 * Handles DOM scraping, scroll automation, and detail-panel enrichment.
 */

(() => {
  const S = window.__MAPS_SELECTORS;
  let isRunning = false;
  let shouldStop = false;
  let scrapedData = [];
  let seenUrls = new Set();
  let scrapeStartTime = 0;
  let delayMin = 300;
  let delayMax = 800;

  // ---- Utility helpers ----

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function jitteredDelay(min, max) {
    return sleep((min || delayMin) + Math.random() * ((max || delayMax) - (min || delayMin)));
  }

  function queryFirst(parent, selectorOrList) {
    const selectors = Array.isArray(selectorOrList) ? selectorOrList : [selectorOrList];
    for (const sel of selectors) {
      const el = parent.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function getTextContent(parent, selectorOrList) {
    const el = queryFirst(parent, selectorOrList);
    return el ? el.textContent.trim() : null;
  }

  // ---- List-mode scraping ----

  function parseResultCard(card) {
    // Get the place link element
    const linkEl = card.querySelector(S.placeLink);
    const googleMapsUrl = linkEl ? linkEl.getAttribute('href') : null;

    // Deduplicate
    if (!googleMapsUrl || seenUrls.has(googleMapsUrl)) return null;

    // Business name: try text element first, then aria-label on link
    let name = getTextContent(card, S.businessName);
    if (!name && linkEl) {
      name = linkEl.getAttribute('aria-label');
    }

    const rating = getTextContent(card, S.rating);

    let reviewCount = getTextContent(card, S.reviewCount);
    if (reviewCount) {
      reviewCount = reviewCount.replace(/[()]/g, '').trim();
    }

    // Address and category from the info spans
    let address = null;
    let category = null;
    const infoSpans = card.querySelectorAll('.W4Efsd');
    if (infoSpans.length >= 2) {
      // Category is usually in the second W4Efsd group
      const catContainer = infoSpans[1];
      if (catContainer) {
        const spans = catContainer.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent.trim();
          if (text && text !== '·' && !text.startsWith('$')) {
            if (!category) category = text;
          }
        }
      }
    }
    // Address is often in the third W4Efsd group 
    if (infoSpans.length >= 3) {
      const addrContainer = infoSpans[2];
      if (addrContainer) {
        const spans = addrContainer.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent.trim();
          if (text && text !== '·' && text.length > 3) {
            address = text;
            break;
          }
        }
      }
    }

    return {
      name: name || 'Unknown',
      phone: null,
      rating,
      reviewCount,
      website: null,
      address,
      category,
      googleMapsUrl,
    };
  }

  function parseVisibleResults() {
    const cards = document.querySelectorAll(S.resultCard);
    const newResults = [];
    for (const card of cards) {
      const data = parseResultCard(card);
      if (data) {
        seenUrls.add(data.googleMapsUrl);
        scrapedData.push(data);
        newResults.push(data);
      }
    }
    return newResults;
  }

  // ---- Scroll automation ----

  async function autoScroll(maxResults) {
    const feed = document.querySelector(S.feedContainer);
    if (!feed) {
      throw new Error('Could not find the results feed. Make sure you have search results visible on Google Maps.');
    }

    let noNewResultsCount = 0;
    const MAX_STALE_SCROLLS = 3;

    while (isRunning && !shouldStop) {
      if (scrapedData.length >= maxResults) {
        sendProgress('max_reached');
        break;
      }

      const prevCount = scrapedData.length;
      parseVisibleResults();

      // Report progress
      sendProgress('scraping', null, null, scrapeStartTime);

      if (scrapedData.length === prevCount) {
        noNewResultsCount++;
        if (noNewResultsCount >= MAX_STALE_SCROLLS) {
          // Check for "end of list" indicator
          const endEl = document.querySelector(S.endOfList);
          if (endEl || noNewResultsCount >= MAX_STALE_SCROLLS + 2) {
            break;
          }
        }
      } else {
        noNewResultsCount = 0;
      }

      // Scroll down
      feed.scrollTop = feed.scrollHeight;
      await jitteredDelay(400, 900);
    }

    // Final parse
    parseVisibleResults();
  }

  // ---- Enriched mode (detail panel) ----

  async function enrichResults() {
    for (let i = 0; i < scrapedData.length; i++) {
      if (shouldStop) break;

      const record = scrapedData[i];
      // Skip if already enriched
      if (record.phone || record.website) continue;

      // Find and click the matching card
      const cards = document.querySelectorAll(S.resultCard);
      let targetCard = null;
      for (const card of cards) {
        const link = card.querySelector(S.placeLink);
        if (link && link.getAttribute('href') === record.googleMapsUrl) {
          targetCard = card;
          break;
        }
      }

      if (!targetCard) continue;

      const linkEl = targetCard.querySelector(S.placeLink);
      if (linkEl) linkEl.click();

      // Wait for detail panel to load
      await sleep(1500);

      // Wait for the detail title to appear (up to 5 seconds)
      let detailLoaded = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        const title = document.querySelector(S.detailTitle);
        if (title) {
          detailLoaded = true;
          break;
        }
        await sleep(500);
      }

      if (detailLoaded) {
        // Extract enriched data
        const phone = getTextContent(document, S.detailPhone);
        const website = getTextContent(document, S.detailWebsite);
        const address = getTextContent(document, S.detailAddress);

        if (phone) record.phone = phone;
        if (website) record.website = website;
        if (address) record.address = address;
      }

      // Navigate back to list
      const backBtn = queryFirst(document, S.backButton);
      if (backBtn) {
        backBtn.click();
        await sleep(1000);
      }

      sendProgress('enriching', i + 1, scrapedData.length, scrapeStartTime);
      await jitteredDelay(delayMin + 200, delayMax + 400);
    }
  }

  // ---- Communication with popup / background ----

  function sendProgress(phase, current, total, startTime) {
    const elapsed = startTime ? Date.now() - startTime : 0;
    chrome.runtime.sendMessage({
      type: 'SCRAPE_PROGRESS',
      data: {
        phase,
        count: scrapedData.length,
        current,
        total,
        elapsed,
      },
    });
  }

  function sendComplete() {
    chrome.runtime.sendMessage({
      type: 'SCRAPE_COMPLETE',
      data: scrapedData,
    });
  }

  function sendError(message) {
    chrome.runtime.sendMessage({
      type: 'SCRAPE_ERROR',
      error: message,
    });
  }

  // ---- Message listener ----

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'START_SCRAPE') {
      if (isRunning) {
        sendResponse({ status: 'already_running' });
        return;
      }

      isRunning = true;
      shouldStop = false;
      scrapedData = [];
      seenUrls = new Set();
      scrapeStartTime = Date.now();

      const maxResults = msg.maxResults || 200;
      const enriched = msg.enriched || false;
      delayMin = msg.delayMin || 300;
      delayMax = msg.delayMax || 800;

      (async () => {
        try {
          await autoScroll(maxResults);

          if (enriched && !shouldStop) {
            sendProgress('enriching', 0, scrapedData.length);
            await enrichResults();
          }

          sendComplete();
        } catch (err) {
          sendError(err.message);
        } finally {
          isRunning = false;
        }
      })();

      sendResponse({ status: 'started' });
      return true; // keep channel open for async
    }

    if (msg.type === 'STOP_SCRAPE') {
      shouldStop = true;
      isRunning = false;
      sendResponse({ status: 'stopped', count: scrapedData.length });
      sendComplete();
      return;
    }

    if (msg.type === 'GET_DATA') {
      sendResponse({ data: scrapedData });
      return;
    }
  });
})();
