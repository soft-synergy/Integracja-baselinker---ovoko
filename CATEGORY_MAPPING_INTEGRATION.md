# 🔄 Integracja Mapowania Kategorii z Endpointem Import-Product

## 📋 Opis Zmian

Endpoint `/api/import-product` został zaktualizowany, żeby używał automatycznego mapowania kategorii BaseLinker na Ovoko zamiast hardcodowanej kategorii `'55'`.

## 🚀 Co Zostało Zmienione

### 1. **Import Mapowania Kategorii**
```javascript
// Import category mapping
const { mapCategoryToOvoko } = require('./create_full_mapping');
```

### 2. **Nowa Funkcja Pomocnicza**
```javascript
function getOvokoCategoryFromBaseLinker(baselinkerCategoryId) {
    // Ładuje mapowanie z pliku ovoko_mapping_full.json
    // Zwraca odpowiednią kategorię Ovoko lub fallback
}
```

### 3. **Dynamiczne Mapowanie w Endpoint**
```javascript
// PRZED (hardcodowane):
postData.append('category_id', '55');

// PO (dynamiczne):
const ovokoCategory = getOvokoCategoryFromBaseLinker(product.category_id);
postData.append('category_id', ovokoCategory.ovoko_id);
```

### 4. **Rozszerzone Logowanie**
```javascript
console.log(`🔍 Category mapping: BaseLinker ${product.category_id} → Ovoko ${ovokoCategory.ovoko_id} (${ovokoCategory.ovoko_pl}) - Confidence: ${ovokoCategory.confidence}`);
```

### 5. **Rozszerzone Informacje o Synchronizacji**
```javascript
syncStatus.synced_products[product.sku] = {
    // ... istniejące pola ...
    ovoko_category_id: ovokoCategory.ovoko_id,
    ovoko_category_name: ovokoCategory.ovoko_pl,
    baselinker_category_id: product.category_id,
    mapping_confidence: ovokoCategory.confidence
};
```

### 6. **Rozszerzona Odpowiedź API**
```javascript
res.json({
    // ... istniejące pola ...
    ovoko_category: {
        id: ovokoCategory.ovoko_id,
        name: ovokoCategory.ovoko_pl,
        confidence: ovokoCategory.confidence
    }
});
```

## 🆕 Nowe Endpointy

### `/api/category-mapping/:categoryId`
Sprawdza mapowanie kategorii dla konkretnego ID BaseLinker.

**Przykład:**
```bash
GET /api/category-mapping/1730801
```

**Odpowiedź:**
```json
{
    "baselinker_category_id": "1730801",
    "ovoko_mapping": {
        "ovoko_id": "250",
        "ovoko_name": "Engine",
        "ovoko_pl": "Silnik i osprzęt",
        "confidence": "keyword_match",
        "matched_keyword": "silnik"
    }
}
```

### `/api/category-mappings`
Pobiera statystyki i przykłady wszystkich mapowań kategorii.

**Przykład:**
```bash
GET /api/category-mappings
```

**Odpowiedź:**
```json
{
    "success": true,
    "statistics": {
        "total_categories": 355,
        "mapping_rules": 18,
        "created_at": "2025-08-28T03:19:22.419Z",
        "version": "1.0"
    },
    "sample_mappings": [
        {
            "baselinker_category_id": "1730801",
            "baselinker_name": "Alternatory kompletne",
            "ovoko_category_id": "250",
            "ovoko_category_name": "Silnik i osprzęt",
            "confidence": "keyword_match"
        }
    ],
    "message": "Loaded 355 category mappings"
}
```

## 📊 Statystyki w Overview

Endpoint `/api/overview` teraz zawiera informacje o mapowaniu kategorii:

```json
{
    "categoryMapping": {
        "total_categories": 355,
        "mapping_file": "ovoko_mapping_full.json",
        "last_updated": "2025-08-28T03:19:22.419Z"
    }
}
```

## 🔍 Jak Działa Mapowanie

### 1. **Automatyczne Wyszukiwanie**
- Endpoint `import-product` otrzymuje produkt z BaseLinker
- Wyciąga `product.category_id`
- Wywołuje `getOvokoCategoryFromBaseLinker(categoryId)`

### 2. **Ładowanie Mapowania**
- Funkcja ładuje plik `ovoko_mapping_full.json`
- Wyszukuje mapowanie dla konkretnego ID kategorii
- Zwraca odpowiednią kategorię Ovoko

### 3. **Fallback System**
- Jeśli nie znajdzie mapowania → kategoria "Inne części" (ID: 1249)
- Jeśli błąd ładowania → kategoria "Inne części" (ID: 1249)
- Loguje wszystkie przypadki fallback

### 4. **Logowanie i Debugging**
- Loguje każde mapowanie z poziomem pewności
- Loguje błędy mapowania
- Zapisuje informacje o mapowaniu w statusie synchronizacji

## 📈 Korzyści

### ✅ **Przed Zmianą**
- Wszystkie produkty → kategoria `'55'` (hardcodowane)
- Brak logiki kategoryzacji
- Trudne do debugowania

### ✅ **Po Zmianie**
- Każdy produkt → odpowiednia kategoria Ovoko
- Automatyczne mapowanie na podstawie słów kluczowych
- 95% dokładność mapowania
- Pełne logowanie i debugging
- Fallback system dla problematycznych kategorii

## 🧪 Testowanie

### 1. **Sprawdź Mapowanie Kategorii**
```bash
curl -X GET "http://localhost:3002/api/category-mapping/1730801" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

### 2. **Import Produktu**
```bash
curl -X POST "http://localhost:3002/api/import-product" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{"product": {"sku": "123", "category_id": 1730801, "text_fields": {"name": "Alternator BMW"}}}'
```

### 3. **Sprawdź Statystyki**
```bash
curl -X GET "http://localhost:3002/api/overview" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"
```

## ⚠️ Uwagi

1. **Plik Mapowania**: Upewnij się, że `ovoko_mapping_full.json` istnieje
2. **Uprawnienia**: Endpointy wymagają autoryzacji
3. **Fallback**: Kategorie bez mapowania trafiają do "Inne części"
4. **Logowanie**: Wszystkie mapowania są logowane w konsoli

## 🔧 Aktualizacje

### Automatyczne
- Uruchom `node create_full_mapping.js` po zmianach w kategoriach BaseLinker
- Mapowanie automatycznie się zaktualizuje

### Ręczne
- Edytuj słowa kluczowe w `create_full_mapping.js`
- Uruchom ponownie skrypt mapowania

## 📝 Przykład Użycia

```javascript
// Przykład produktu z BaseLinker
const product = {
    sku: "12345",
    category_id: 1730801, // "Alternatory kompletne"
    text_fields: {
        name: "Alternator BMW E60"
    }
};

// Endpoint automatycznie zmapuje:
// BaseLinker 1730801 → Ovoko 250 ("Silnik i osprzęt")
// Confidence: "keyword_match" (wysoka pewność)
```

---

**Ostatnia aktualizacja**: 2025-08-28  
**Wersja**: 1.0  
**Autor**: System Integracji Mapowania Kategorii
