const fs = require('fs');

// Wczytaj plik z produktami
const productsFile = 'baselinker_products_latest.json';
const outputFile = 'baselinker_category_ids.json';

try {
    // Wczytaj dane z pliku
    const productsData = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
    
    // Wyciągnij wszystkie ID kategorii
    const categoryIds = new Set();
    
    if (Array.isArray(productsData)) {
        // Jeśli to tablica produktów
        productsData.forEach(product => {
            if (product.category_id && typeof product.category_id === 'number') {
                categoryIds.add(product.category_id);
            }
        });
    } else if (productsData.products && Array.isArray(productsData.products)) {
        // Jeśli produkty są w obiekcie pod kluczem 'products'
        productsData.products.forEach(product => {
            if (product.category_id && typeof product.category_id === 'number') {
                categoryIds.add(product.category_id);
            }
        });
    } else {
        // Sprawdź inne możliwe struktury
        Object.keys(productsData).forEach(key => {
            const item = productsData[key];
            if (item && typeof item === 'object' && item.category_id && typeof item.category_id === 'number') {
                categoryIds.add(item.category_id);
            }
        });
    }
    
    // Konwertuj Set na tablicę i posortuj
    const sortedCategoryIds = Array.from(categoryIds).sort((a, b) => a - b);
    
    // Przygotuj dane do zapisu
    const outputData = {
        total_categories: sortedCategoryIds.length,
        category_ids: sortedCategoryIds,
        extracted_at: new Date().toISOString(),
        source_file: productsFile
    };
    
    // Zapisz do pliku
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');
    
    console.log(`✅ Pomyślnie wyciągnięto ${sortedCategoryIds.length} unikalnych ID kategorii`);
    console.log(`📁 Zapisano do pliku: ${outputFile}`);
    console.log(`📊 Pierwsze 10 ID: ${sortedCategoryIds.slice(0, 10).join(', ')}`);
    
} catch (error) {
    console.error('❌ Błąd podczas przetwarzania pliku:', error.message);
    
    // Spróbuj wyświetlić strukturę pliku
    try {
        const sampleData = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        console.log('\n📋 Struktura pliku:');
        console.log('Typ:', typeof sampleData);
        console.log('Klucze główne:', Object.keys(sampleData));
        
        if (Array.isArray(sampleData)) {
            console.log('Liczba produktów:', sampleData.length);
            if (sampleData.length > 0) {
                console.log('Przykład pierwszego produktu:', JSON.stringify(sampleData[0], null, 2));
            }
        }
    } catch (parseError) {
        console.error('Nie można odczytać struktury pliku:', parseError.message);
    }
}
