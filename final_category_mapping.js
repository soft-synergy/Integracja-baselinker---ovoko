const fs = require('fs');

// Wczytaj pliki z kategoriami
console.log('Wczytywanie plików...');
const ovokoCategories = JSON.parse(fs.readFileSync('ovoko_categories_cleaned.json', 'utf8'));
const baselinkerCategories = JSON.parse(fs.readFileSync('baselinker_categories.json', 'utf8'));

// Wczytaj ulepszone mapowanie
console.log('Wczytywanie ulepszonego mapowania...');
const improvedMapping = JSON.parse(fs.readFileSync('improved_category_mapping_2025-08-28T07-47-08-014Z.json', 'utf8'));

console.log('Struktura improvedMapping:', Object.keys(improvedMapping));
console.log('Mapping length:', improvedMapping.mapping ? improvedMapping.mapping.length : 'undefined');
console.log('Unmapped length:', improvedMapping.unmapped ? improvedMapping.unmapped.length : 'undefined');

// Funkcja do tworzenia finalnego mapowania
function createFinalMapping() {
    console.log('Tworzenie finalnego mapowania...');
    
    // Sprawdź czy istnieje tablica unmapped, jeśli nie, utwórz pustą
    const unmappedCategories = improvedMapping.unmapped || [];
    const unmappedCount = improvedMapping.unmapped_categories || 0;
    
    const finalMapping = {
        timestamp: new Date().toISOString(),
        description: "Finalne mapowanie kategorii Baselinker do kategorii Ovoko",
        total_baselinker_categories: baselinkerCategories.data.categories.length,
        total_ovoko_categories: ovokoCategories.data.list.length,
        mapped_categories: improvedMapping.mapping.length,
        unmapped_categories: unmappedCount,
        success_rate: improvedMapping.mapping.length / baselinkerCategories.data.categories.length * 100,
        mapping: {},
        reverse_mapping: {},
        statistics: {
            high_confidence: 0,
            medium_confidence: 0,
            unmapped: 0
        }
    };
    
    console.log('Final mapping object created');
    
    // Tworzenie mapowania Baselinker -> Ovoko
    for (const map of improvedMapping.mapping) {
        finalMapping.mapping[map.baselinker_id] = {
            ovoko_id: map.ovoko_id,
            ovoko_name: map.ovoko_name,
            confidence: map.confidence,
            baselinker_name: map.baselinker_name
        };
        
        // Liczenie statystyk
        if (map.confidence === 'high') {
            finalMapping.statistics.high_confidence++;
        } else if (map.confidence === 'medium') {
            finalMapping.statistics.medium_confidence++;
        }
    }
    
    console.log('Baselinker -> Ovoko mapping created');
    
    // Tworzenie mapowania odwrotnego Ovoko -> Baselinker
    for (const map of improvedMapping.mapping) {
        if (!finalMapping.reverse_mapping[map.ovoko_id]) {
            finalMapping.reverse_mapping[map.ovoko_id] = [];
        }
        finalMapping.reverse_mapping[map.ovoko_id].push({
            baselinker_id: map.baselinker_id,
            baselinker_name: map.baselinker_name,
            confidence: map.confidence
        });
    }
    
    console.log('Reverse mapping created');
    
    // Dodanie nierozmapowanych kategorii
    finalMapping.unmapped_categories_list = unmappedCategories;
    finalMapping.statistics.unmapped = unmappedCount;
    
    console.log('Unmapped categories added');
    
    return finalMapping;
}

// Funkcja do zapisywania finalnego mapowania
function saveFinalMapping(finalMapping) {
    console.log('Zapisywanie plików...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Zapisz główne mapowanie
    fs.writeFileSync(
        `final_category_mapping_${timestamp}.json`,
        JSON.stringify(finalMapping, null, 2)
    );
    
    // Zapisz mapowanie w formacie prostym (tylko ID)
    const simpleMapping = {};
    for (const [baselinkerId, mapping] of Object.entries(finalMapping.mapping)) {
        simpleMapping[baselinkerId] = mapping.ovoko_id;
    }
    
    fs.writeFileSync(
        `simple_category_mapping_${timestamp}.json`,
        JSON.stringify({
            timestamp: finalMapping.timestamp,
            description: "Proste mapowanie ID kategorii Baselinker -> Ovoko",
            mapping: simpleMapping
        }, null, 2)
    );
    
    // Zapisz mapowanie w formacie CSV
    let csvContent = 'baselinker_id,ovoko_id,confidence,baselinker_name,ovoko_name\n';
    for (const [baselinkerId, mapping] of Object.entries(finalMapping.mapping)) {
        csvContent += `${baselinkerId},${mapping.ovoko_id},${mapping.confidence},"${mapping.baselinker_name}","${mapping.ovoko_name}"\n`;
    }
    
    fs.writeFileSync(
        `category_mapping_${timestamp}.csv`,
        csvContent
    );
    
    console.log('\n=== FINALNE MAPOWANIE KATEGORII ===');
    console.log(`Całkowita liczba kategorii Baselinker: ${finalMapping.total_baselinker_categories}`);
    console.log(`Całkowita liczba kategorii Ovoko: ${finalMapping.total_ovoko_categories}`);
    console.log(`Rozmapowane kategorie: ${finalMapping.mapped_categories}`);
    console.log(`Nierozmapowane kategorie: ${finalMapping.unmapped_categories}`);
    console.log(`Wskaźnik sukcesu: ${finalMapping.success_rate.toFixed(2)}%`);
    console.log(`\nStatystyki pewności:`);
    console.log(`- Wysoka pewność: ${finalMapping.statistics.high_confidence}`);
    console.log(`- Średnia pewność: ${finalMapping.statistics.medium_confidence}`);
    console.log(`- Nierozmapowane: ${finalMapping.statistics.unmapped}`);
    
    console.log('\nPliki zostały zapisane:');
    console.log(`- final_category_mapping_${timestamp}.json (pełne mapowanie)`);
    console.log(`- simple_category_mapping_${timestamp}.json (proste mapowanie ID)`);
    console.log(`- category_mapping_${timestamp}.csv (mapowanie w formacie CSV)`);
    
    return timestamp;
}

// Funkcja do weryfikacji mapowania
function verifyMapping(finalMapping) {
    console.log('\n=== WERYFIKACJA MAPOWANIA ===');
    
    // Sprawdź czy wszystkie zmapowane kategorie mają poprawne ID
    let validMappings = 0;
    let invalidMappings = 0;
    
    for (const [baselinkerId, mapping] of Object.entries(finalMapping.mapping)) {
        const ovokoCategory = ovokoCategories.data.list.find(cat => cat.id === mapping.ovoko_id);
        if (ovokoCategory) {
            validMappings++;
        } else {
            invalidMappings++;
            console.log(`BŁĄD: Nieprawidłowe ID Ovoko: ${mapping.ovoko_id} dla kategorii Baselinker: ${baselinkerId}`);
        }
    }
    
    console.log(`Poprawne mapowania: ${validMappings}`);
    console.log(`Niepoprawne mapowania: ${invalidMappings}`);
    
    // Sprawdź duplikaty
    const ovokoIds = Object.values(finalMapping.mapping).map(m => m.ovoko_id);
    const duplicates = ovokoIds.filter((id, index) => ovokoIds.indexOf(id) !== index);
    
    if (duplicates.length > 0) {
        console.log(`\nUWAGA: Znaleziono duplikaty ID Ovoko: ${[...new Set(duplicates)].join(', ')}`);
    } else {
        console.log('\n✓ Brak duplikatów ID Ovoko');
    }
    
    return { validMappings, invalidMappings, duplicates: [...new Set(duplicates)] };
}

// Główna funkcja
function main() {
    try {
        console.log('Tworzenie finalnego mapowania kategorii...');
        
        // Utwórz finalne mapowanie
        const finalMapping = createFinalMapping();
        
        // Zapisz pliki
        const timestamp = saveFinalMapping(finalMapping);
        
        // Zweryfikuj mapowanie
        const verification = verifyMapping(finalMapping);
        
        // Zapisz raport weryfikacji
        const verificationReport = {
            timestamp: new Date().toISOString(),
            verification_results: verification,
            summary: {
                total_categories: finalMapping.total_baselinker_categories,
                mapped_categories: finalMapping.mapped_categories,
                success_rate: finalMapping.success_rate,
                confidence_distribution: finalMapping.statistics
            }
        };
        
        fs.writeFileSync(
            `verification_report_${timestamp}.json`,
            JSON.stringify(verificationReport, null, 2)
        );
        
        console.log(`\nRaport weryfikacji zapisany: verification_report_${timestamp}.json`);
        
    } catch (error) {
        console.error('Błąd podczas tworzenia finalnego mapowania:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Uruchom program
main();
