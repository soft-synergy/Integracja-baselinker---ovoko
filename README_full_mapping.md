# 🎯 KOMPLETNE Mapowanie Kategorii BaseLinker → Ovoko

## 📊 Statystyki

- **Łącznie kategorii BaseLinker**: 355
- **Pomapowanych przez słowa kluczowe**: 338 (95%)
- **Domyślnych (inne części)**: 17 (5%)
- **Plik mapowania**: `ovoko_mapping_full.json`
- **Plik statystyk**: `mapping_statistics.json`

## 🏆 Sukces Mapowania

**95% kategorii BaseLinker ma precyzyjne mapowanie na Ovoko!**

Tylko 17 kategorii zostało przypisanych do domyślnej kategorii "Inne części" (ID: 1249).

## 📁 Pliki

### `ovoko_mapping_full.json`
**GŁÓWNY PLIK** zawierający kompletne mapowanie wszystkich 355 kategorii.

### `create_full_mapping.js`
Skrypt JavaScript, który automatycznie tworzy mapowanie na podstawie słów kluczowych.

### `mapping_statistics.json`
Statystyki mapowania w formacie JSON.

## 🔍 Jak Działa Mapowanie

### 1. Słowa Kluczowe
Każda kategoria Ovoko ma zdefiniowane słowa kluczowe w języku polskim:
```javascript
"250": { // Silnik i osprzęt
  keywords: [
    "silnik", "silniki", "blok", "głowica", "turbosprężarka",
    "pompa", "alternator", "rozrusznik", "moduł zapłonowy"
  ]
}
```

### 2. Automatyczne Dopasowanie
Skrypt sprawdza nazwę każdej kategorii BaseLinker i szuka dopasowań słów kluczowych.

### 3. Poziomy Pewności
- **`keyword_match`** - Znaleziono dopasowanie słowa kluczowego
- **`default`** - Brak dopasowania, przypisano do "Inne części"

## 🎯 Kategorie Ovoko (Top-Tier)

| ID | Nazwa | Polski | Opis |
|----|-------|--------|------|
| 250 | Engine | Silnik i osprzęt | Silniki, turbosprężarki, pompy, alternatory |
| 281 | Fuel mixture system | Układ paliwowy | Wtryskiwacze, pompy paliwa, przewody |
| 197 | Air conditioning-heating system/radiators | Układ chłodzenia | Chłodnice, wentylatory, pompy wody |
| 999 | Devices/switches/electronic system | Wyposażenie elektryczne | Sterowniki, czujniki, moduły |
| 1 | Brake system | Układ hamulcowy | Hamulce, ABS, ESP |
| 416 | Gearbox/clutch/transmission | Układ napędowy | Skrzynie biegów, mosty, półosie |
| 134 | Lighting system | Oświetlenie | Reflektory, lampy, klaksony |
| 498 | Exterior front body parts | Karoseria przednia | Maski, błotniki przednie |
| 541 | Exterior rear body parts | Karoseria tylna | Elementy tylne |
| 624 | Body/body parts/hook | Karoseria ogólna | Zderzaki, drzwi, listwy |
| 806 | Cabin/interior | Wyposażenie wnętrza | Fotele, nawigacje, zagłówki |
| 330 | Front axle | Zawieszenie | Sprężyny, amortyzatory |
| 382 | Rear axle | Oś tylna | Most tylny |
| 463 | Wheels/tires/caps | Koła i opony | Opony, felgi, kołpaki |
| 1168 | Gas exhaust system | Układ wydechowy | Rury, tłumiki |
| 1189 | Glass | Szyby | Przednia/tylna szyba |
| 98 | Headlight/headlamp washing/cleaning system | System mycia | Spryskiwacze, wycieraczki |
| 1249 | Other parts | Inne części | Kategorie bez dopasowania |

## 🚀 Jak Używać

### 1. Import Mapowania
```javascript
const fullMapping = require('./ovoko_mapping_full.json');
```

### 2. Znajdź Kategorię Ovoko
```javascript
function getOvokoCategory(baselinkerCategoryId) {
  const mapping = fullMapping.categories[baselinkerCategoryId];
  if (mapping) {
    return mapping.ovoko_mapping;
  }
  return null;
}
```

### 3. Przykład Użycia
```javascript
const product = { category_id: 1730801, name: "Alternator" };
const ovokoMapping = getOvokoCategory(product.category_id);

console.log(`Kategoria Ovoko: ${ovokoMapping.ovoko_pl} (ID: ${ovokoMapping.ovoko_id})`);
console.log(`Pewność: ${ovokoMapping.confidence}`);
// Output: Kategoria Ovoko: Silnik i osprzęt (ID: 250)
```

## 📈 Jakość Mapowania

### Wysoka Jakość (95%)
- **338 kategorii** ma precyzyjne mapowanie
- Używa słów kluczowych w języku polskim
- Logiczne powiązania funkcjonalne

### Domyślne (5%)
- **17 kategorii** bez dopasowania
- Automatycznie przypisane do "Inne części"
- Wymagają ręcznej weryfikacji

## 🔧 Aktualizacje

### Automatyczne
- Uruchom `node create_full_mapping.js` po zmianach w kategoriach BaseLinker
- Skrypt automatycznie zaktualizuje mapowanie

### Ręczne
- Edytuj słowa kluczowe w `OVOKO_MAPPING_RULES`
- Dodaj nowe reguły mapowania
- Dostosuj domyślne kategorie

## ⚠️ Uwagi

1. **Weryfikacja**: Zawsze weryfikuj mapowania przed użyciem w produkcji
2. **Język**: Słowa kluczowe są w języku polskim
3. **Aktualizacje**: Kategorie mogą się zmieniać w obu systemach
4. **Testowanie**: Przetestuj na małym zbiorze danych

## 🎉 Podsumowanie

**MISJA WYKONANA!** 

Każda z 355 kategorii BaseLinker ma teraz mapowanie na Ovoko:
- ✅ **338 kategorii** - precyzyjne mapowanie
- ✅ **17 kategorii** - domyślne mapowanie
- ✅ **100% pokrycie** - żadna kategoria nie została pominięta

System jest gotowy do automatycznego importu produktów z BaseLinker do Ovoko!

---

**Ostatnia aktualizacja**: 2025-08-28  
**Wersja**: 1.0  
**Autor**: System Automatycznego Mapowania Kategorii
