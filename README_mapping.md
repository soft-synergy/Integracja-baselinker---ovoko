# Mapowanie Kategorii BaseLinker na Ovoko

## 📋 Opis

Ten zestaw plików zawiera mapowanie kategorii z systemu BaseLinker na top-tier kategorie systemu Ovoko. Mapowanie zostało podzielone na 3 części dla lepszej czytelności i zarządzania.

## 📁 Pliki

### Część 1: `baselinker_to_ovoko_mapping_part1.json`
- **Silnik i osprzęt** → Ovoko ID: 250
- **Układ paliwowy** → Ovoko ID: 281  
- **Układ chłodzenia** → Ovoko ID: 197

### Część 2: `baselinker_to_ovoko_mapping_part2.json`
- **Układ elektryczny** → Ovoko ID: 999
- **Układ hamulcowy** → Ovoko ID: 1
- **Układ napędowy** → Ovoko ID: 416
- **Oświetlenie** → Ovoko ID: 134

### Część 3: `baselinker_to_ovoko_mapping_part3.json`
- **Karoseria przednia** → Ovoko ID: 498
- **Karoseria tylna** → Ovoko ID: 541
- **Karoseria ogólna** → Ovoko ID: 624
- **Wyposażenie wnętrza** → Ovoko ID: 806
- **Zawieszenie** → Ovoko ID: 330
- **Oś tylna** → Ovoko ID: 382
- **Koła i opony** → Ovoko ID: 463
- **Układ wydechowy** → Ovoko ID: 1168
- **Szyby** → Ovoko ID: 1189
- **System mycia** → Ovoko ID: 98
- **Inne części** → Ovoko ID: 1249
- **Części BMW** → Ovoko ID: 250

## 🔍 Struktura Mapowania

Każde mapowanie zawiera:

```json
{
  "kategoria_nazwa": {
    "ovoko_top_category_id": "ID_kategorii_ovoko",
    "ovoko_top_category_name": "Nazwa angielska",
    "ovoko_top_category_pl": "Nazwa polska",
    "baselinker_categories": [
      {
        "category_id": "ID_kategorii_baselinker",
        "name": "Nazwa kategorii BaseLinker",
        "mapping_confidence": "high/medium/low",
        "notes": "Uwagi dotyczące mapowania"
      }
    ]
  }
}
```

## 📊 Statystyki

- **Część 1**: 3 główne kategorie, 30+ mapowań
- **Część 2**: 4 główne kategorie, 25+ mapowań  
- **Część 3**: 12 głównych kategorii, 45+ mapowań

**Łącznie**: 19 głównych kategorii Ovoko, 100+ mapowań BaseLinker

## 🎯 Poziomy Pewności Mapowania

### High Confidence (Wysoka pewność)
- Bezpośrednie mapowanie nazw
- Logiczne powiązania funkcjonalne
- Sprawdzone korelacje

### Medium Confidence (Średnia pewność)
- Częściowe pokrycie nazw
- Możliwe różnice w klasyfikacji
- Wymaga weryfikacji

### Low Confidence (Niska pewność)
- Ogólne kategorie
- Możliwe błędy mapowania
- Wymaga ręcznej weryfikacji

## 🚀 Jak Używać

### 1. Import do Systemu
```javascript
const mapping1 = require('./baselinker_to_ovoko_mapping_part1.json');
const mapping2 = require('./baselinker_to_ovoko_mapping_part2.json');
const mapping3 = require('./baselinker_to_ovoko_mapping_part3.json');
```

### 2. Wyszukiwanie Mapowania
```javascript
function findOvokoCategory(baselinkerCategoryId) {
  // Sprawdź wszystkie części mapowania
  const allMappings = [mapping1, mapping2, mapping3];
  
  for (const mapping of allMappings) {
    for (const category of Object.values(mapping.categories)) {
      const found = category.baselinker_categories.find(
        cat => cat.category_id === baselinkerCategoryId
      );
      if (found) {
        return {
          ovoko_id: category.ovoko_top_category_id,
          ovoko_name: category.ovoko_top_category_name,
          confidence: found.mapping_confidence
        };
      }
    }
  }
  return null;
}
```

### 3. Eksport do Ovoko
```javascript
function mapToOvoko(baselinkerProduct) {
  const mapping = findOvokoCategory(baselinkerProduct.category_id);
  
  if (mapping) {
    return {
      ...baselinkerProduct,
      ovoko_category_id: mapping.ovoko_id,
      mapping_confidence: mapping.confidence
    };
  }
  
  return baselinkerProduct;
}
```

## ⚠️ Uwagi

1. **Weryfikacja**: Zawsze weryfikuj mapowania przed użyciem w produkcji
2. **Aktualizacje**: Kategorie mogą się zmieniać w obu systemach
3. **Specyfika**: Niektóre mapowania mogą wymagać dostosowania do konkretnych potrzeb
4. **Testowanie**: Przetestuj mapowania na małym zbiorze danych

## 🔧 Aktualizacje

Mapowania są aktualizowane na podstawie:
- Zmian w API BaseLinker
- Zmian w API Ovoko  
- Użytkowników systemu
- Analizy błędów mapowania

## 📞 Wsparcie

W przypadku pytań lub problemów z mapowaniem:
1. Sprawdź logi błędów
2. Zweryfikuj aktualność kategorii
3. Skontaktuj się z zespołem deweloperskim

---

**Ostatnia aktualizacja**: 2025-08-28
**Wersja**: 1.0
**Autor**: System Mapowania Kategorii
