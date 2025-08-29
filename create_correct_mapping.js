const fs = require('fs').promises;

// Top-tier kategorie Ovoko (tylko level 1, parent_id = "0")
const OVOKO_TOP_TIER_CATEGORIES = {
    "1": {
        name: "Brake system",
        pl: "Układ hamulcowy",
        keywords: [
            "hamulcowy", "hamulce", "ABS", "ESP", "hamulec", "postojowe", "bremza"
        ]
    },
    "98": {
        name: "Headlight/headlamp washing/cleaning system",
        pl: "Wycieraczki i spryskiwacze szyb i świateł",
        keywords: [
            "mycia", "mycie", "spryskiwacze", "wycieraczki", "spryskiwacz", "wycieraczka", "szyby", "okna"
        ]
    },
    "134": {
        name: "Lighting system",
        pl: "Oświetlenie",
        keywords: [
            "oświetlenie", "światła", "reflektory", "lampy", "klaksony", "światło", "lampa"
        ]
    },
    "197": {
        name: "Air conditioning-heating system/radiators",
        pl: "Układ klimatyzacji / Wentylacji / Chłodzenia silnika / Ogrzewanie postojowe",
        keywords: [
            "chłodzenia", "chłodnica", "chłodnice", "wentylatory", "pompy wody", "klimatyzacja", "ogrzewanie",
            "zbiorniki wyrównawcze", "przewody chłodnic", "kierownice powietrza", "intercoolery", "chłodnice oleju", "chłodnice wody"
        ]
    },
    "250": {
        name: "Engine",
        pl: "Silnik i osprzęt",
        keywords: [
            "silnik", "silniki", "blok", "głowica", "turbosprężarka", "turbosprężarki", "pompa", "pompy",
            "alternator", "rozrusznik", "moduł zapłonowy", "cewki zapłonowe", "kolektor", "wały korbowe",
            "zawory", "przepływomierz", "pasek osprzętu", "koła pasowe", "osłony silnika", "zawieszenie silnika",
            "poduszki silnika", "recyrkulacja spalin", "EGR", "chłodnice spalin", "czujniki poziomu oleju",
            "pompy oleju", "zawory podciśnienia", "pompy podciśnieniowe", "motoryzacja", "samochodowe"
        ]
    },
    "281": {
        name: "Fuel mixture system",
        pl: "Układ paliwowy",
        keywords: [
            "paliwowy", "paliwo", "wtryskiwacze", "pompy paliwa", "pompy wtryskowe", "wtrysk", "paliwo",
            "przewody wtryskowe", "przewody paliwa", "podgrzewacze", "benzyna", "diesel", "olej napędowy"
        ]
    },
    "330": {
        name: "Front axle",
        pl: "Oś przednia i inne elementy",
        keywords: [
            "zawieszenia", "zawieszenie", "sprężyny", "amortyzatory", "hydrauliczne", "pneumatyczne",
            "sterowniki zawieszenia", "poduszki zawieszenia", "oś", "osi", "przednia", "przedni"
        ]
    },
    "382": {
        name: "Rear axle",
        pl: "Oś tylna i inne elementy",
        keywords: [
            "tylna", "tylny", "tył", "tyłem", "most tylny", "oś tylna", "osi tylnej"
        ]
    },
    "416": {
        name: "Gearbox/clutch/transmission",
        pl: "Układ napędowy",
        keywords: [
            "napędowy", "napędowa", "skrzynie biegów", "skrzynia biegów", "mosty", "półosie", "przeguby",
            "wały napędowe", "lewarki", "wybieraki", "smarowanie", "transmisja", "sprzęgło"
        ]
    },
    "463": {
        name: "Wheels/tires/caps",
        pl: "Opony / Felgi / Kołpaki i inne elementy",
        keywords: [
            "koła", "opony", "felgi", "kołpaki", "opona", "felga", "kołpak", "koło"
        ]
    },
    "498": {
        name: "Exterior front body parts",
        pl: "Elementy przedniej części nadwozia / karoserii",
        keywords: [
            "maska", "maski", "błotniki", "błotnik", "przednia", "przedni", "karoseria", "nadwozie",
            "zderzaki", "zderzak", "drzwi", "drzwi", "listwy", "nakładki", "progi", "progowe"
        ]
    },
    "541": {
        name: "Exterior rear body parts",
        pl: "Elementy tylnej części nadwozia / karoserii",
        keywords: [
            "tylna", "tylny", "tył", "tyłem", "karoseria tylna", "nadwozie tylne"
        ]
    },
    "579": {
        name: "Door",
        pl: "Drzwi i inne elementy",
        keywords: [
            "drzwi", "drzwi", "drzwi", "drzwi", "drzwi", "drzwi", "drzwi", "drzwi"
        ]
    },
    "624": {
        name: "Body/body parts/hook",
        pl: "Części nadwozia i karoserii",
        keywords: [
            "karoserii", "karoseria", "nadwozia", "nadwozie", "części karoserii", "części nadwozia"
        ]
    },
    "806": {
        name: "Cabin/interior",
        pl: "Wyposażenie wnętrza samochodu",
        keywords: [
            "wnętrza", "wnętrze", "fotele", "kanapy", "zagłówki", "nawigacje", "GPS", "wyposażenie wnętrza",
            "salon", "interior", "kabina"
        ]
    },
    "999": {
        name: "Devices/switches/electronic system",
        pl: "Wyposażenie elektryczne",
        keywords: [
            "elektryczny", "elektryczna", "elektryczne", "stacyjki", "kluczyki", "czujniki", "sterowniki",
            "przekaźniki", "świece żarowe", "moduły komfortu", "moduły poduszek", "silniczki", "gniazda zapalniczki",
            "klemy", "kostki", "złączki", "instalacyjne", "zapłon", "zapłonowy", "zapłonowe", "elektryka"
        ]
    },
    "1168": {
        name: "Gas exhaust system",
        pl: "Układ wydechowy i inne elementy",
        keywords: [
            "wydechowy", "wydech", "rury wydechowe", "tłumiki", "tłumik", "spaliny", "wydech"
        ]
    },
    "1189": {
        name: "Glass",
        pl: "Szyby / Okna i inne elementy",
        keywords: [
            "szyby", "szyba", "okna", "okno", "przednia szyba", "tylna szyba", "szyba", "okno"
        ]
    },
    "1249": {
        name: "Other parts",
        pl: "Inne części",
        keywords: [
            "pozostałe", "pozostały", "akcesoria", "akcesorium", "inne", "inny", "pozostałe", "inne"
        ]
    }
};

// Funkcja do mapowania kategorii na podstawie słów kluczowych
function mapCategoryToOvoko(categoryName) {
    if (!categoryName) {
        return OVOKO_TOP_TIER_CATEGORIES["1249"]; // Default fallback
    }
    
    const lowerName = categoryName.toLowerCase();
    
    // Sprawdź każdą regułę mapowania
    for (const [ovokoId, rule] of Object.entries(OVOKO_TOP_TIER_CATEGORIES)) {
        for (const keyword of rule.keywords) {
            if (lowerName.includes(keyword.toLowerCase())) {
                return {
                    ovoko_id: ovokoId,
                    ovoko_name: rule.name,
                    ovoko_pl: rule.pl,
                    confidence: "keyword_match",
                    matched_keyword: keyword
                };
            }
        }
    }
    
    // Jeśli nie znaleziono dopasowania, użyj domyślnej kategorii
    return {
        ovoko_id: "1249",
        ovoko_name: "Other parts",
        ovoko_pl: "Inne części",
        confidence: "default",
        matched_keyword: "brak dopasowania"
    };
}

// Główna funkcja
async function createCorrectMapping() {
    try {
        console.log('🔄 Tworzenie poprawnego mapowania kategorii (tylko top-tier)...');
        
        // Wczytaj kategorie BaseLinker
        const baselinkerData = JSON.parse(await fs.readFile('baselinker_categories.json', 'utf8'));
        const categories = baselinkerData.data.categories;
        
        console.log(`📊 Znaleziono ${categories.length} kategorii BaseLinker`);
        console.log(`🎯 Używam tylko ${Object.keys(OVOKO_TOP_TIER_CATEGORIES).length} top-tier kategorii Ovoko`);
        
        // Mapuj każdą kategorię
        const correctMapping = {
            mapping_description: "POPRAWNE mapowanie WSZYSTKICH kategorii BaseLinker na TOP-TIER kategorie Ovoko (level 1)",
            created_at: new Date().toISOString(),
            version: "2.0",
            total_categories: categories.length,
            ovoko_top_tier_categories: Object.keys(OVOKO_TOP_TIER_CATEGORIES).length,
            mapping_rules: OVOKO_TOP_TIER_CATEGORIES,
            categories: {}
        };
        
        let mappedCount = 0;
        let defaultCount = 0;
        
        for (const category of categories) {
            const mapping = mapCategoryToOvoko(category.name);
            
            if (mapping.confidence === "keyword_match") {
                mappedCount++;
            } else {
                defaultCount++;
            }
            
            correctMapping.categories[category.category_id] = {
                baselinker: {
                    category_id: category.category_id,
                    name: category.name,
                    parent_id: category.parent_id
                },
                ovoko_mapping: mapping
            };
        }
        
        // Zapisz poprawne mapowanie
        await fs.writeFile('ovoko_mapping_correct.json', JSON.stringify(correctMapping, null, 2), 'utf8');
        
        console.log('\n🎉 Poprawne mapowanie utworzone!');
        console.log(`📊 Statystyki:`);
        console.log(`   - Łącznie kategorii: ${categories.length}`);
        console.log(`   - Pomapowanych przez słowa kluczowe: ${mappedCount}`);
        console.log(`   - Domyślnych (inne części): ${defaultCount}`);
        console.log(`   - Plik: ovoko_mapping_correct.json`);
        console.log(`   - Używam tylko TOP-TIER kategorii Ovoko (level 1)`);
        
        // Zapisz również statystyki
        const stats = {
            total_categories: categories.length,
            mapped_by_keywords: mappedCount,
            default_mapping: defaultCount,
            mapping_percentage: Math.round((mappedCount / categories.length) * 100),
            ovoko_top_tier_categories: Object.keys(OVOKO_TOP_TIER_CATEGORIES).length,
            timestamp: new Date().toISOString()
        };
        
        await fs.writeFile('mapping_correct_statistics.json', JSON.stringify(stats, null, 2), 'utf8');
        console.log(`   - Statystyki: mapping_correct_statistics.json`);
        
        // Sprawdź czy wszystkie top-tier kategorie są używane
        const usedCategories = new Set();
        Object.values(correctMapping.categories).forEach(cat => {
            usedCategories.add(cat.ovoko_mapping.ovoko_id);
        });
        
        console.log(`   - Użyte kategorie Ovoko: ${usedCategories.size}/${Object.keys(OVOKO_TOP_TIER_CATEGORIES).length}`);
        
        // Pokaż nieużywane kategorie
        const unusedCategories = Object.keys(OVOKO_TOP_TIER_CATEGORIES).filter(id => !usedCategories.has(id));
        if (unusedCategories.length > 0) {
            console.log(`   - Nieużywane kategorie: ${unusedCategories.join(', ')}`);
        }
        
    } catch (error) {
        console.error('💥 Błąd podczas tworzenia poprawnego mapowania:', error.message);
    }
}

// Uruchom jeśli wywołano bezpośrednio
if (require.main === module) {
    createCorrectMapping();
}

module.exports = { createCorrectMapping, mapCategoryToOvoko, OVOKO_TOP_TIER_CATEGORIES };
