const fs = require('fs');

// Wczytaj pliki z kategoriami
const ovokoCategories = JSON.parse(fs.readFileSync('ovoko_categories_cleaned.json', 'utf8'));
const baselinkerCategories = JSON.parse(fs.readFileSync('baselinker_categories.json', 'utf8'));

// Funkcja do normalizacji tekstu (usuwanie polskich znaków, małe litery, usuwanie spacji)
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[ąćęłńóśźż]/g, (match) => {
            const replacements = {
                'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
                'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z'
            };
            return replacements[match] || match;
        })
        .replace(/[^a-z0-9]/g, '')
        .trim();
}

// Funkcja do znajdowania najlepszego dopasowania kategorii
function findBestMatch(baselinkerName, ovokoCategories) {
    const normalizedBaselinker = normalizeText(baselinkerName);
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const ovokoCat of ovokoCategories.data.list) {
        const normalizedOvoko = normalizeText(ovokoCat.pl);
        
        // Sprawdź czy kategoria Ovoko jest zawarta w nazwie Baselinker
        if (normalizedBaselinker.includes(normalizedOvoko) && normalizedOvoko.length > 3) {
            const score = normalizedOvoko.length;
            if (score > bestScore) {
                bestScore = score;
                bestMatch = ovokoCat;
            }
        }
        
        // Sprawdź czy nazwa Baselinker jest zawarta w kategorii Ovoko
        if (normalizedOvoko.includes(normalizedBaselinker) && normalizedBaselinker.length > 3) {
            const score = normalizedBaselinker.length;
            if (score > bestScore) {
                bestScore = score;
                bestMatch = ovokoCat;
            }
        }
    }
    
    // Jeśli nie znaleziono dopasowania, spróbuj znaleźć częściowe dopasowania
    if (!bestMatch) {
        for (const ovokoCat of ovokoCategories.data.list) {
            const normalizedOvoko = normalizeText(ovokoCat.pl);
            const words = normalizedBaselinker.split(/(?<=[a-z])(?=[a-z])/);
            
            for (const word of words) {
                if (word.length > 3 && normalizedOvoko.includes(word)) {
                    const score = word.length;
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = ovokoCat;
                    }
                }
            }
        }
    }
    
    return bestMatch;
}

// Główne mapowanie kategorii
function createCategoryMapping() {
    const mapping = [];
    const unmapped = [];
    
    console.log('Rozpoczynam mapowanie kategorii...');
    console.log(`Liczba kategorii Baselinker: ${baselinkerCategories.data.categories.length}`);
    console.log(`Liczba kategorii Ovoko: ${ovokoCategories.data.list.length}`);
    
    for (const baselinkerCat of baselinkerCategories.data.categories) {
        const match = findBestMatch(baselinkerCat.name, ovokoCategories);
        
        if (match) {
            mapping.push({
                baselinker_id: baselinkerCat.category_id,
                baselinker_name: baselinkerCat.name,
                ovoko_id: match.id,
                ovoko_name: match.pl,
                confidence: 'high'
            });
        } else {
            unmapped.push({
                baselinker_id: baselinkerCat.category_id,
                baselinker_name: baselinkerCat.name,
                reason: 'Brak dopasowania'
            });
        }
    }
    
    return { mapping, unmapped };
}

// Funkcja do zapisywania wyników
function saveResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Zapisz główne mapowanie
    fs.writeFileSync(
        `category_mapping_${timestamp}.json`,
        JSON.stringify({
            timestamp: new Date().toISOString(),
            total_baselinker_categories: baselinkerCategories.data.categories.length,
            total_ovoko_categories: ovokoCategories.data.list.length,
            mapped_categories: results.mapping.length,
            unmapped_categories: results.unmapped.length,
            mapping: results.mapping
        }, null, 2)
    );
    
    // Zapisz nierozmapowane kategorie
    fs.writeFileSync(
        `unmapped_categories_${timestamp}.json`,
        JSON.stringify({
            timestamp: new Date().toISOString(),
            unmapped_categories: results.unmapped
        }, null, 2)
    );
    
    // Zapisz statystyki
    const stats = {
        timestamp: new Date().toISOString(),
        total_baselinker: baselinkerCategories.data.categories.length,
        total_ovoko: ovokoCategories.data.list.length,
        mapped: results.mapping.length,
        unmapped: results.unmapped.length,
        success_rate: ((results.mapping.length / baselinkerCategories.data.categories.length) * 100).toFixed(2) + '%'
    };
    
    fs.writeFileSync(
        `mapping_statistics_${timestamp}.json`,
        JSON.stringify(stats, null, 2)
    );
    
    console.log('\n=== WYNIKI MAPOWANIA ===');
    console.log(`Całkowita liczba kategorii Baselinker: ${stats.total_baselinker}`);
    console.log(`Całkowita liczba kategorii Ovoko: ${stats.total_ovoko}`);
    console.log(`Rozmapowane kategorie: ${stats.mapped}`);
    console.log(`Nierozmapowane kategorie: ${stats.unmapped}`);
    console.log(`Wskaźnik sukcesu: ${stats.success_rate}`);
    
    console.log('\nPliki zostały zapisane:');
    console.log(`- category_mapping_${timestamp}.json`);
    console.log(`- unmapped_categories_${timestamp}.json`);
    console.log(`- mapping_statistics_${timestamp}.json`);
}

// Uruchom mapowanie
try {
    const results = createCategoryMapping();
    saveResults(results);
} catch (error) {
    console.error('Błąd podczas mapowania:', error);
}
