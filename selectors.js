/**
 * Centralized CSS selector config for Google Maps DOM scraping.
 * Google Maps uses obfuscated class names that change periodically.
 * Update selectors here when Google changes the DOM — only this file needs patching.
 */

const SELECTORS = {
  // The scrollable feed container holding search results
  feedContainer: 'div[role="feed"]',

  // Individual result card in the list
  resultCard: '.Nv2PK',

  // Business name — primary: text element, fallback: aria-label on link
  businessName: ['.qBF1Pd', 'a.hfpxzc'],

  // Star rating (e.g. "4.5")
  rating: '.MW4etd',

  // Review count (e.g. "(1,234)")
  reviewCount: '.UY7F9',

  // Category / business type
  category: ['.W4Efsd .W4Efsd:last-child span:first-child', '.W4Efsd span[jstcache]'],

  // Address snippet in the list card
  addressSnippet: ['.W4Efsd .W4Efsd:last-child', '.W4Efsd:nth-child(3)'],

  // Link element on each card (contains the Google Maps place URL)
  placeLink: 'a.hfpxzc',

  // ----- Detail Panel Selectors (for enriched mode) -----

  // Detail panel container
  detailPanel: '.m6QErb.XiKgde',

  // Address in detail panel
  detailAddress: 'button[data-item-id="address"] .Io6YTe',

  // Phone in detail panel
  detailPhone: 'button[data-item-id^="phone"] .Io6YTe',

  // Website in detail panel
  detailWebsite: 'a[data-item-id="authority"] .Io6YTe',

  // Detail panel title (to confirm panel loaded for correct business)
  detailTitle: 'h1.DUwDvf',

  // Back button from detail panel to list
  backButton: 'button[jsaction*="back"], button.hYBOP',

  // End of list indicator
  endOfList: '.m6QErb p.fontBodyMedium span',
};

// Make available to content scripts in the same context
if (typeof window !== 'undefined') {
  window.__MAPS_SELECTORS = SELECTORS;
}
