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

      // This CSV has a weird format where each row is one long string with key:value pairs
      // Example: "produkt_id":"1151991066","produkt_nazwa":"Koło zamachowe BMW E60 E61 3.0D 778.8746",...
      const products = [];
      
      for (let i = 1; i < lines.length; i++) { // Skip header
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Parse the key:value format
        const product = {};
        const matches = line.match(/"([^"]+)":"([^"]*)"/g);
        if (matches) {
          matches.forEach(match => {
            const [, key, value] = match.match(/"([^"]+)":"([^"]*)"/);
            product[key] = value;
          });
        }
        
        if (product.produkt_id) {
          products.push({
            id: product.produkt_id,
            name: product.produkt_nazwa || '',
            price: product.cena || '0',
            sku: product.produkt_sku || '',
            category: product.kategoria_nazwa || '',
            images: [
              product.zdjecie,
              product.zdjecie_dodatkowe_1,
              product.zdjecie_dodatkowe_2,
              product.zdjecie_dodatkowe_3,
              product.zdjecie_dodatkowe_4,
              product.zdjecie_dodatkowe_5,
              product.zdjecie_dodatkowe_6,
              product.zdjecie_dodatkowe_7,
              product.zdjecie_dodatkowe_8,
              product.zdjecie_dodatkowe_9,
              product.zdjecie_dodatkowe_10,
              product.zdjecie_dodatkowe_11,
              product.zdjecie_dodatkowe_12,
              product.zdjecie_dodatkowe_13,
              product.zdjecie_dodatkowe_14,
              product.zdjecie_dodatkowe_15
            ].filter(Boolean),
            description: product.opis || '',
            manufacturer: product.producent_nazwa || '',
            weight: product.waga || '0',
            stock: product.ilosc || '0'
          });
        }
      }

      setProducts(products);
      setIds(products.map(p => p.id));
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
        body: JSON.stringify({ products })
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


