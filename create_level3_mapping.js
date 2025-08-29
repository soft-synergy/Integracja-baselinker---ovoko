const fs = require('fs').promises;

// Funkcja do wczytania wszystkich kategorii level 3 z Ovoko
async function loadOvokoLevel3Categories() {
    try {
        const ovokoData = JSON.parse(await fs.readFile('ovoko_categories.json', 'utf8'));
        const level3Categories = ovokoData.data.list.filter(cat => cat.level === "3");
        
        console.log(`📊 Znaleziono ${level3Categories.length} kategorii level 3 w Ovoko`);
        
        return level3Categories;
    } catch (error) {
        console.error('💥 Błąd podczas ładowania kategorii Ovoko:', error.message);
        return [];
    }
}

// Funkcja do mapowania kategorii na podstawie słów kluczowych
function mapCategoryToOvokoLevel3(categoryName, level3Categories) {
    if (!categoryName || !level3Categories) {
        return null;
    }
    
    const lowerName = categoryName.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;
    
    // Sprawdź każdą kategorię level 3
    for (const ovokoCategory of level3Categories) {
        const ovokoName = ovokoCategory.pl || ovokoCategory.en || '';
        const ovokoNameLower = ovokoName.toLowerCase();
        
        // Proste dopasowanie słów kluczowych
        const words = lowerName.split(/\s+/);
        let score = 0;
        
        for (const word of words) {
            if (word.length > 2 && ovokoNameLower.includes(word)) {
                score += word.length; // Dłuższe słowa mają większą wagę
            }
        }
        
        // Dodatkowe punkty za dokładne dopasowania
        if (ovokoNameLower.includes(lowerName) || lowerName.includes(ovokoNameLower)) {
            score += 10;
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = ovokoCategory;
        }
    }
    
    // Zwróć dopasowanie tylko jeśli score jest wystarczająco wysoki
    if (bestScore >= 3) {
        return {
            ovoko_id: bestMatch.id,
            ovoko_name: bestMatch.en,
            ovoko_pl: bestMatch.pl,
            confidence: "level3_match",
            matched_keyword: bestMatch.pl,
            score: bestScore
        };
    }
    
    return null;
}

// Główna funkcja
async function createLevel3Mapping() {
    try {
        console.log('🔄 Tworzenie mapowania na level 3 kategorie Ovoko...');
        
        // Wczytaj kategorie level 3 z Ovoko
        const level3Categories = await loadOvokoLevel3Categories();
        if (level3Categories.length === 0) {
            throw new Error('Nie udało się wczytać kategorii level 3 z Ovoko');
        }
        
        // Wczytaj kategorie BaseLinker
        const baselinkerData = JSON.parse(await fs.readFile('baselinker_categories.json', 'utf8'));
        const categories = baselinkerData.data.categories;
        
        console.log(`📊 Znaleziono ${categories.length} kategorii BaseLinker`);
        console.log(`🎯 Mapuję na ${level3Categories.length} kategorii level 3 Ovoko`);
        
        // Mapuj każdą kategorię
        const level3Mapping = {
            mapping_description: "Mapowanie WSZYSTKICH kategorii BaseLinker na LEVEL 3 kategorie Ovoko (używane do nazw części)",
            created_at: new Date().toISOString(),
            version: "3.0",
            total_categories: categories.length,
            ovoko_level3_categories: level3Categories.length,
            categories: {}
        };
        
        let mappedCount = 0;
        let unmappedCount = 0;
        
        for (const category of categories) {
            const mapping = mapCategoryToOvokoLevel3(category.name, level3Categories);
            
            if (mapping) {
                mappedCount++;
                level3Mapping.categories[category.category_id] = {
                    baselinker: {
                        category_id: category.category_id,
                        name: category.name,
                        parent_id: category.parent_id
                    },
                    ovoko_mapping: mapping
                };
            } else {
                unmappedCount++;
                // Dla kategorii bez dopasowania, nie dodajemy ich do mapowania
                console.log(`⚠️ Brak dopasowania dla: ${category.name} (ID: ${category.category_id})`);
            }
        }
        
        // Zapisz mapowanie level 3
        await fs.writeFile('ovoko_mapping_level3.json', JSON.stringify(level3Mapping, null, 2), 'utf8');
        
        console.log('\n🎉 Mapowanie level 3 utworzone!');
        console.log(`📊 Statystyki:`);
        console.log(`   - Łącznie kategorii BaseLinker: ${categories.length}`);
        console.log(`   - Pomapowanych na level 3: ${mappedCount}`);
        console.log(`   - Bez dopasowania: ${unmappedCount}`);
        console.log(`   - Procent dopasowania: ${Math.round((mappedCount / categories.length) * 100)}%`);
        console.log(`   - Plik: ovoko_mapping_level3.json`);
        
        // Zapisz również statystyki
        const stats = {
            total_categories: categories.length,
            mapped_to_level3: mappedCount,
            unmapped: unmappedCount,
            mapping_percentage: Math.round((mappedCount / categories.length) * 100),
            ovoko_level3_categories: level3Categories.length,
            timestamp: new Date().toISOString()
        };
        
        await fs.writeFile('mapping_level3_statistics.json', JSON.stringify(stats, null, 2), 'utf8');
        console.log(`   - Statystyki: mapping_level3_statistics.json`);
        
        // Pokaż przykłady dopasowań
        console.log('\n🔍 Przykłady dopasowań:');
        let exampleCount = 0;
        for (const [id, data] of Object.entries(level3Mapping.categories)) {
            if (exampleCount < 5) {
                console.log(`   ${data.baselinker.name} → ${data.ovoko_mapping.ovoko_pl} (ID: ${data.ovoko_mapping.ovoko_id}, Score: ${data.ovoko_mapping.score})`);
                exampleCount++;
            }
        }
        
    } catch (error) {
        console.error('💥 Błąd podczas tworzenia mapowania level 3:', error.message);
    }
}

// Funkcja do testowania pojedynczego mapowania
async function testLevel3Mapping(categoryName) {
    try {
        const level3Categories = await loadOvokoLevel3Categories();
        const mapping = mapCategoryToOvokoLevel3(categoryName, level3Categories);
        
        if (mapping) {
            console.log(`✅ Dopasowanie dla "${categoryName}":`);
            console.log(`   ID: ${mapping.ovoko_id}`);
            console.log(`   Nazwa: ${mapping.ovoko_pl}`);
            console.log(`   Score: ${mapping.score}`);
            console.log(`   Confidence: ${mapping.confidence}`);
        } else {
            console.log(`❌ Brak dopasowania dla "${categoryName}"`);
        }
        
        return mapping;
    } catch (error) {
        console.error('💥 Błąd podczas testowania:', error.message);
        return null;
    }
}

// Uruchom jeśli wywołano bezpośrednio
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length > 0 && args[0] === 'test') {
        // Test pojedynczego mapowania
        const categoryName = args[1] || 'Alternatory kompletne';
        testLevel3Mapping(categoryName);
    } else {
        // Twórz pełne mapowanie
        createLevel3Mapping();
    }
}

module.exports = { createLevel3Mapping, testLevel3Mapping, mapCategoryToOvokoLevel3 };
