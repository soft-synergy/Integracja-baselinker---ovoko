import React, { useState } from 'react';

const CsvImport = () => {
  const [file, setFile] = useState(null);
  const [ids, setIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [parsingError, setParsingError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const handleFileChange = (e) => {
    setResults(null);
    setParsingError(null);
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
  };

  const parseCsv = async () => {
    if (!file) return;
    setParsingError(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) throw new Error('Plik jest pusty');

      // Try to detect header; accept formats with either explicit sku column or key:value blob
      const header = lines[0];
      const hasSkuHeader = /(^|,)(sku|SKU)(,|$)/.test(header);

      const skus = [];
      for (let i = hasSkuHeader ? 1 : 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        if (hasSkuHeader) {
          // Simple CSV; split by comma respecting basic quotes
          // Minimal parser: split on commas not inside quotes
          const cols = [];
          let cur = '';
          let inQ = false;
          for (let c = 0; c < line.length; c++) {
            const ch = line[c];
            if (ch === '"') { inQ = !inQ; cur += ch; continue; }
            if (ch === ',' && !inQ) { cols.push(cur); cur = ''; continue; }
            cur += ch;
          }
        	cols.push(cur);

          const headers = header.split(',');
          const idx = headers.findIndex(h => h.trim().toLowerCase() === 'sku');
          if (idx >= 0) {
            const raw = (cols[idx] || '').trim().replace(/^"|"$/g, '');
            if (raw) skus.push(raw);
          }
        } else {
          // Key:value blob line
          const matches = line.match(/"([^"]+)":"([^"]*)"/g);
          if (matches) {
            const obj = {};
            matches.forEach(m => {
              const [, key, value] = m.match(/"([^"]+)":"([^"]*)"/);
              obj[key] = value;
            });
            const skuVal = obj.produkt_sku || obj.sku || obj.SKU || '';
            if (skuVal) skus.push(String(skuVal));
          }
        }
      }

      // For backend we now just send identifiers; keep also as products for UI count
      setProducts(skus.map(sku => ({ sku })));
      setIds(skus);
    } catch (e) {
      setParsingError(e.message);
      setIds([]);
      setProducts([]);
    }
  };

  const handleImport = async () => {
    if (products.length === 0) return;
    setUploading(true);
    setResults(null);
    try {
      const resp = await fetch('/api/import-csv-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send only identifiers to backend; it will resolve full product by SKU
        body: JSON.stringify({ products: ids })
      });
      const json = await resp.json();
      setResults(json);
    } catch (e) {
      setResults({ success: false, error: e.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import z CSV do Ovoko</h1>
        <p className="text-gray-600 mt-1">Wczytaj plik CSV z kolumną produkt_id i wyślij produkty do Ovoko.</p>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center space-x-3">
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
          <button className="btn-primary" onClick={parseCsv} disabled={!file}>Zaczytaj plik</button>
        </div>
        {parsingError && (
          <div className="text-error-600 text-sm">Błąd parsowania: {parsingError}</div>
        )}
        {products.length > 0 && (
          <div className="text-sm text-gray-700">Znaleziono produktów: {products.length}</div>
        )}
        <div>
          <button className="btn-success" onClick={handleImport} disabled={products.length === 0 || uploading}>
            {uploading ? 'Wysyłanie...' : 'Wyślij do Ovoko'}
          </button>
        </div>
      </div>

      {results && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Wyniki</h3>
          {!results.success ? (
            <div className="text-error-600 text-sm">{results.error || 'Błąd'}</div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-700">Zaimportowano: {results.imported} / {results.total}</div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="py-2 pr-4">ID</th>
                      <th className="py-2 pr-4">Nazwa</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Szczegóły</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(results.results || []).map((r, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-2 pr-4">{r.id}</td>
                        <td className="py-2 pr-4">{r.name || '-'}</td>
                        <td className="py-2 pr-4">{r.success ? 'OK' : 'Błąd'}</td>
                        <td className="py-2 pr-4 text-gray-600">{r.success ? (r.part_id ? `part_id: ${r.part_id}` : '') : (r.error || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CsvImport;


