const fs = require('fs').promises;

// Top-tier kategorie Ovoko z mapowaniem słów kluczowych
const OVOKO_MAPPING_RULES = {
  // Silnik i osprzęt
  "250": {
    name: "Engine",
    pl: "Silnik i osprzęt",
    keywords: [
      "silnik", "silniki", "blok", "głowica", "turbosprężarka", "turbosprężarki",
      "pompa", "pompy", "alternator", "rozrusznik", "moduł zapłonowy", "cewki zapłonowe",
      "kolektor", "wały korbowe", "zawory", "przepływomierz", "pasek osprzętu",
      "koła pasowe", "osłony silnika", "zawieszenie silnika", "poduszki silnika",
      "recyrkulacja spalin", "EGR", "chłodnice spalin", "czujniki poziomu oleju",
      "pompy oleju", "zawory podciśnienia", "pompy podciśnieniowe"
    ]
  },
  
  // Układ paliwowy
  "281": {
    name: "Fuel mixture system", 
    pl: "Układ paliwowy",
    keywords: [
      "paliwowy", "paliwo", "wtryskiwacze", "pompy paliwa", "pompy wtryskowe",
      "przewody wtryskowe", "przewody paliwa", "podgrzewacze", "wtrysk"
    ]
  },
  
  // Układ chłodzenia
  "197": {
    name: "Air conditioning-heating system/radiators",
    pl: "Układ klimatyzacji / Wentylacji / Chłodzenia silnika / Ogrzewanie postojowe",
    keywords: [
      "chłodzenia", "chłodnica", "chłodnice", "wentylatory", "pompy wody",
      "zbiorniki wyrównawcze", "przewody chłodnic", "kierownice powietrza",
      "intercoolery", "chłodnice oleju", "chłodnice wody"
    ]
  },
  
  // Układ elektryczny
  "999": {
    name: "Devices/switches/electronic system",
    pl: "Wyposażenie elektryczne",
    keywords: [
      "elektryczny", "elektryczna", "elektryczne", "stacyjki", "kluczyki",
      "czujniki", "sterowniki", "przekaźniki", "świece żarowe", "moduły komfortu",
      "moduły poduszek", "silniczki", "gniazda zapalniczki", "klemy", "kostki",
      "złączki", "instalacyjne", "zapłon", "zapłonowy", "zapłonowe"
    ]
  },
  
  // Układ hamulcowy
  "1": {
    name: "Brake system",
    pl: "Układ hamulcowy",
    keywords: [
      "hamulcowy", "hamulce", "ABS", "ESP", "hamulec", "postojowe"
    ]
  },
  
  // Układ napędowy
  "416": {
    name: "Gearbox/clutch/transmission",
    pl: "Układ napędowy",
    keywords: [
      "napędowy", "napędowa", "skrzynie biegów", "skrzynia biegów", "mosty",
      "półosie", "przeguby", "wały napędowe", "lewarki", "wybieraki", "smarowanie"
    ]
  },
  
  // Oświetlenie
  "134": {
    name: "Lighting system",
    pl: "Oświetlenie",
    keywords: [
      "oświetlenie", "światła", "reflektory", "lampy", "klaksony"
    ]
  },
  
  // Karoseria przednia
  "498": {
    name: "Exterior front body parts",
    pl: "Elementy przedniej części nadwozia / karoserii",
    keywords: [
      "maska", "maski", "błotniki", "błotnik", "przednia", "przedni"
    ]
  },
  
  // Karoseria tylna
  "541": {
    name: "Exterior rear body parts",
    pl: "Elementy tylnej części nadwozia / karoserii",
    keywords: [
      "tylna", "tylny", "tył", "tyłem"
    ]
  },
  
  // Karoseria ogólna
  "624": {
    name: "Body/body parts/hook",
    pl: "Części nadwozia i karoserii",
    keywords: [
      "karoserii", "karoseria", "zderzaki", "zderzak", "drzwi", "drzwi",
      "listwy", "nakładki", "progi", "progowe", "nadwozia"
    ]
  },
  
  // Wyposażenie wnętrza
  "806": {
    name: "Cabin/interior",
    pl: "Wyposażenie wnętrza samochodu",
    keywords: [
      "wnętrza", "wnętrze", "fotele", "kanapy", "zagłówki", "nawigacje",
      "GPS", "wyposażenie wnętrza"
    ]
  },
  
  // Zawieszenie
  "330": {
    name: "Front axle",
    pl: "Oś przednia i inne elementy",
    keywords: [
      "zawieszenia", "zawieszenie", "sprężyny", "amortyzatory", "hydrauliczne",
      "pneumatyczne", "sterowniki zawieszenia", "poduszki zawieszenia"
    ]
  },
  
  // Oś tylna
  "382": {
    name: "Rear axle",
    pl: "Oś tylna i inne elementy",
    keywords: [
      "tylna", "tylny", "tył", "tyłem", "most tylny"
    ]
  },
  
  // Koła i opony
  "463": {
    name: "Wheels/tires/caps",
    pl: "Opony / Felgi / Kołpaki i inne elementy",
    keywords: [
      "koła", "opony", "felgi", "kołpaki", "opona", "felga"
    ]
  },
  
  // Układ wydechowy
  "1168": {
    name: "Gas exhaust system",
    pl: "Układ wydechowy i inne elementy",
    keywords: [
      "wydechowy", "wydech", "rury wydechowe", "tłumiki", "tłumik"
    ]
  },
  
  // Szyby
  "1189": {
    name: "Glass",
    pl: "Szyby / Okna i inne elementy",
    keywords: [
      "szyby", "szyba", "okna", "okno", "przednia szyba", "tylna szyba"
    ]
  },
  
  // System mycia
  "98": {
    name: "Headlight/headlamp washing/cleaning system",
    pl: "Wycieraczki i spryskiwacze szyb i świateł",
    keywords: [
      "mycia", "mycie", "spryskiwacze", "wycieraczki", "spryskiwacz", "wycieraczka"
    ]
  },
  
  // Inne części
  "1249": {
    name: "Other parts",
    pl: "Inne części",
    keywords: [
      "pozostałe", "pozostały", "akcesoria", "akcesorium", "inne", "inny"
    ]
  }
};

// Funkcja do mapowania kategorii na podstawie słów kluczowych
function mapCategoryToOvoko(categoryName) {
  const lowerName = categoryName.toLowerCase();
  
  // Sprawdź każdą regułę mapowania
  for (const [ovokoId, rule] of Object.entries(OVOKO_MAPPING_RULES)) {
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
async function createFullMapping() {
  try {
    console.log('🔄 Tworzenie kompletnego mapowania kategorii...');
    
    // Wczytaj kategorie BaseLinker
    const baselinkerData = JSON.parse(await fs.readFile('baselinker_categories.json', 'utf8'));
    const categories = baselinkerData.data.categories;
    
    console.log(`📊 Znaleziono ${categories.length} kategorii BaseLinker`);
    
    // Mapuj każdą kategorię
    const fullMapping = {
      mapping_description: "KOMPLETNE mapowanie WSZYSTKICH kategorii BaseLinker na top-tier kategorie Ovoko",
      created_at: new Date().toISOString(),
      version: "1.0",
      total_categories: categories.length,
      mapping_rules: OVOKO_MAPPING_RULES,
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
      
      fullMapping.categories[category.category_id] = {
        baselinker: {
          category_id: category.category_id,
          name: category.name,
          parent_id: category.parent_id
        },
        ovoko_mapping: mapping
      };
    }
    
    // Zapisz kompletne mapowanie
    await fs.writeFile('ovoko_mapping_full.json', JSON.stringify(fullMapping, null, 2), 'utf8');
    
    console.log('\n🎉 Kompletne mapowanie utworzone!');
    console.log(`📊 Statystyki:`);
    console.log(`   - Łącznie kategorii: ${categories.length}`);
    console.log(`   - Pomapowanych przez słowa kluczowe: ${mappedCount}`);
    console.log(`   - Domyślnych (inne części): ${defaultCount}`);
    console.log(`   - Plik: ovoko_mapping_full.json`);
    
    // Zapisz również statystyki
    const stats = {
      total_categories: categories.length,
      mapped_by_keywords: mappedCount,
      default_mapping: defaultCount,
      mapping_percentage: Math.round((mappedCount / categories.length) * 100),
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile('mapping_statistics.json', JSON.stringify(stats, null, 2), 'utf8');
    console.log(`   - Statystyki: mapping_statistics.json`);
    
  } catch (error) {
    console.error('💥 Błąd podczas tworzenia mapowania:', error.message);
  }
}

// Uruchom jeśli wywołano bezpośrednio
if (require.main === module) {
  createFullMapping();
}

module.exports = { createFullMapping, mapCategoryToOvoko };
