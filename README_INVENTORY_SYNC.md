# 🔄 Synchronizacja Stanów Magazynowych: BaseLinker ↔ Ovoko

## 🎯 Cel

Ten system automatycznie synchronizuje stany magazynowe między **BaseLinker** a **Ovoko**. Jeśli produkt nie ma stanu w BaseLinker (lub ma stan 0), zostanie automatycznie usunięty z Ovoko.

## ✅ SYSTEM GOTOWY DO UŻYCIA!

**Wszystkie dane logowania są już skonfigurowane:**
- ✅ BaseLinker Token: `11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F`
- ✅ Ovoko Username: `bmw@bavariaparts.pl`
- ✅ Ovoko Password: `Karawan1!`
- ✅ Ovoko User Token: `dcf1fb235513c6d36b7a700defdee8ab`

**Możesz od razu uruchomić system!**

## 📁 Pliki Systemu

- **`sync_inventory_states.js`** - Główna logika synchronizacji
- **`export_ovoko_products.js`** - Eksport produktów z Ovoko
- **`run_inventory_sync.js`** - Główny plik do uruchamiania
- **`README_INVENTORY_SYNC.md`** - Ta instrukcja

## 🚀 Jak Uruchomić

### 0. Szybki Test (ZALECANE NA POCZĄTEK)
```bash
node quick_test.js
```

### 1. Sprawdź Status
```bash
node run_inventory_sync.js
# lub
node run_inventory_sync.js status
```

### 2. Pełna Synchronizacja (Eksport + Sync)
```bash
node run_inventory_sync.js full
```

### 3. Szybka Synchronizacja (Tylko Sync)
```bash
node run_inventory_sync.js quick
```

## 📊 Co Robi System

### 🔍 Analiza Stanów
1. **Pobiera stany magazynowe** z BaseLinker
2. **Sprawdza każdy produkt** w Ovoko
3. **Identyfikuje produkty do usunięcia:**
   - ❌ Nie ma w BaseLinker
   - ❌ Stan = 0 w BaseLinker

### 🗑️ Usuwanie Produktów
1. **Wywołuje API `deletePart`** dla każdego produktu
2. **Usuwa zdjęcia** produktu
3. **Usuwa z Ebay** (jeśli było tam wystawione)
4. **Generuje raport** z wynikami

### 📈 Raporty
- **Szczegółowe logi** w konsoli
- **Pliki JSON** z wynikami
- **Statystyki** przed/po synchronizacji

## 🔧 Konfiguracja

**Wszystkie dane są już skonfigurowane w plikach!**

```javascript
const CONFIG = {
    baselinkerToken: '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F',
    ovoko: {
        username: 'bmw@bavariaparts.pl',
        password: 'Karawan1!',
        userToken: 'dcf1fb235513c6d36b7a700defdee8ab'
    }
};
```

## 📋 Przykład Użycia

### Pierwszy Raz
```bash
# 1. Sprawdź status
node run_inventory_sync.js

# 2. Uruchom pełną synchronizację
node run_inventory_sync.js full
```

### Codzienna Synchronizacja
```bash
# Szybka synchronizacja (używa istniejących plików)
node run_inventory_sync.js quick
```

## 📊 Przykładowy Output

```
🚀 Starting full inventory synchronization process...
📊 BaseLinker ↔ Ovoko
==================================================

📤 STEP 1: Exporting current products from Ovoko...
🚀 Starting export of all products from Ovoko...
📄 Exporting page 1...
  Page 1: Found 100 products
📄 Exporting page 2...
  Page 2: Found 50 products
📊 Total products exported: 150
💾 Products saved to: ovoko_products_2025-01-20T10-30-00-000Z.json

🔄 STEP 2: Synchronizing inventory states...
📦 Fetching current inventory states from BaseLinker...
🔍 Checking inventory: Główny Magazyn (ID: 1)
  Found 200 products in this inventory
📊 Total products with inventory states: 200

🔍 Analyzing products for removal...
❌ Product ABC123 not found in BaseLinker - will be removed
❌ Product XYZ789 has no stock (0) in BaseLinker - will be removed
✅ Product DEF456 has stock 5 in Główny Magazyn
📋 Found 2 products to remove

🗑️ Starting removal of 2 products from Ovoko...
🗑️ Deleting part ID: 12345 from Ovoko...
✅ Successfully deleted part ID: 12345
🗑️ Deleting part ID: 67890 from Ovoko...
✅ Successfully deleted part ID: 67890

🎉 FULL SYNCHRONIZATION COMPLETED SUCCESSFULLY!
==================================================
⏱️ Total duration: 45 seconds
📊 Final report saved to: full_sync_report_2025-01-20T10-30-45-000Z.json
📦 Ovoko products: 150 → 148
🗑️ Products removed: 2
❌ Products failed: 0
🔗 BaseLinker products: 200
```

## 🚨 Możliwe Problemy

### ❌ "user_token not found"
- **Rozwiązanie:** Sprawdź czy plik konfiguracyjny ma poprawny user_token

### ❌ "API rate limit exceeded"
- **Rozwiązanie:** System automatycznie dodaje opóźnienia

### ❌ "Product not found in Ovoko"
- **Rozwiązanie:** Sprawdź czy masz aktualną listę produktów

## 📧 Wsparcie

- **Ovoko API:** `api@ovoko.com`
- **BaseLinker:** Sprawdź dokumentację API
- **Ten system:** Sprawdź logi i raporty

## 🔄 Automatyzacja

Możesz uruchamiać synchronizację automatycznie:

### Cron Job (Linux/Mac)
```bash
# Codziennie o 6:00
0 6 * * * cd /path/to/ovoko && node run_inventory_sync.js quick

# Co godzinę
0 * * * * cd /path/to/ovoko && node run_inventory_sync.js quick
```

### Windows Task Scheduler
- Utwórz zadanie uruchamiające `node run_inventory_sync.js quick`
- Ustaw harmonogram (np. codziennie o 6:00)

## 🎯 Korzyści

✅ **Automatyczna synchronizacja** stanów magazynowych  
✅ **Usuwanie produktów** bez stanu  
✅ **Szczegółowe raporty** z każdej synchronizacji  
✅ **Bezpieczne usuwanie** z opóźnieniami między requestami  
✅ **Logi wszystkich operacji** do debugowania  

---

**⚠️ PAMIĘTAJ:** Zawsze sprawdź raporty po synchronizacji i upewnij się, że wszystko działa poprawnie! 