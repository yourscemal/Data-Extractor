/**
 * Export module — CSV and XLSX generation for scraped data.
 */

const Export = (() => {
  const COLUMNS = [
    { key: 'name', header: 'Business Name' },
    { key: 'phone', header: 'Phone' },
    { key: 'rating', header: 'Rating' },
    { key: 'reviewCount', header: 'Reviews' },
    { key: 'website', header: 'Website' },
    { key: 'address', header: 'Address' },
    { key: 'category', header: 'Category' },
    { key: 'googleMapsUrl', header: 'Google Maps URL' },
  ];

  /**
   * Filter columns based on selected keys.
   */
  function filterColumns(selectedKeys) {
    if (!selectedKeys || selectedKeys.length === 0) return COLUMNS;
    return COLUMNS.filter(c => selectedKeys.includes(c.key));
  }

  /**
   * Escape a value for CSV: wrap in quotes if it contains comma, quote, or newline.
   */
  function csvEscape(value) {
    if (value == null) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * Generate a CSV string from an array of records.
   */
  function toCSV(records, selectedKeys) {
    const cols = filterColumns(selectedKeys);
    const header = cols.map(c => csvEscape(c.header)).join(',');
    const rows = records.map(record =>
      cols.map(c => csvEscape(record[c.key])).join(',')
    );
    return [header, ...rows].join('\r\n');
  }

  /**
   * Generate a JSON string from an array of records.
   */
  function toJSON(records, selectedKeys) {
    const cols = filterColumns(selectedKeys);
    const filtered = records.map(record => {
      const obj = {};
      for (const c of cols) {
        obj[c.key] = record[c.key] ?? null;
      }
      return obj;
    });
    return JSON.stringify(filtered, null, 2);
  }

  /**
   * Generate tab-separated text for clipboard.
   */
  function toTSV(records, selectedKeys) {
    const cols = filterColumns(selectedKeys);
    const header = cols.map(c => c.header).join('\t');
    const rows = records.map(record =>
      cols.map(c => String(record[c.key] ?? '')).join('\t')
    );
    return [header, ...rows].join('\n');
  }

  /**
   * Generate an XLSX ArrayBuffer using SheetJS.
   * Falls back to CSV if SheetJS is not available.
   */
  function toXLSX(records, selectedKeys) {
    if (typeof XLSX === 'undefined') {
      console.warn('SheetJS not loaded, falling back to CSV');
      return null;
    }

    const cols = filterColumns(selectedKeys);
    const data = [cols.map(c => c.header)];
    for (const record of records) {
      data.push(cols.map(c => record[c.key] ?? ''));
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-size columns
    ws['!cols'] = cols.map((col, i) => {
      let maxLen = col.header.length;
      for (const record of records) {
        const val = String(record[col.key] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      }
      return { wch: Math.min(maxLen + 2, 50) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Google Maps Data');

    return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  }

  return { toCSV, toXLSX, toJSON, toTSV, COLUMNS };
})();
