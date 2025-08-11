# Instrukcje Importu Produktów z BaseLinker do Ovoko

## 📁 Pliki w projekcie

1. **`test_import_simple.js`** - Główny skrypt do testowego importu (ZALECANY)
2. **`import_to_ovoko.js`** - Pełny skrypt z dodatkowymi funkcjami
3. **`get_ovoko_data.js`** - Skrypt pomocniczy do pobierania danych z Ovoko
4. **`baselinker_products_2025-08-09T06-31-13-827Z.json`** - Dane produktów z BaseLinker

## 🚀 Szybki Start

### Krok 1: Uruchom test
```bash
node test_import_simple.js
```

### Krok 2: Uzyskaj wymagane dane
Skrypt wyświetli błąd o brakującym tokenie. Musisz:

1. **Uzyskać user_token z Ovoko**
   - Skontaktuj się z supportem Ovoko (bavarian.rrr.lt)
   - Podaj swoje dane logowania: `bmw@bavariaparts.pl` / `Karawan1!`
   - Poproś o user_token do API

2. **Sprawdzić category_id i car_id**
   - Poproś support o poprawne ID kategorii dla części samochodowych BMW
   - Obecnie używane wartości to przykładowe:
     - `category_id: 55` (kategoria części)
     - `car_id: 291` (BMW)

### Krok 3: Zaktualizuj skrypt
W pliku `test_import_simple.js` zaktualizuj:

```javascript
const OVOKO_CREDENTIALS = {
    username: 'bmw@bavariaparts.pl',
    password: 'Karawan1!',
    user_token: 'TWOJ_PRAWDZIWY_TOKEN_TUTAJ', // Zastąp tym z Ovoko
    apiUrl: 'https://api.rrr.lt/crm/importPart'
};

const DEFAULT_VALUES = {
    category_id: 55,    // Zaktualizuj jeśli potrzeba
    car_id: 291,        // Zaktualizuj jeśli potrzeba  
    quality: 1,         // Części używane
    status: 0           // Dostępne
};
```

### Krok 4: Uruchom ponownie
```bash
node test_import_simple.js
```

## 📋 Co importuje skrypt

Pierwszy produkt z BaseLinker:
- **SKU:** 11481380
- **Nazwa:** DRZWI LEWE TYLNE BMW E60 CARBONSCHWARZ
- **Cena:** 276 EUR
- **Zdjęcia:** 6 sztuk
- **Stan:** Używany
- **Producent:** BMW OE

## 🔧 Mapowanie pól

| BaseLinker | Ovoko API | Wartość |
|------------|-----------|---------|
| sku | external_id | 11481380 |
| sku | visible_code | 11481380 |
| features.Numer_katalogowy | manufacturer_code | X4 |
| prices[0] | price | 276 |
| images[0] | photo | URL głównego zdjęcia |
| images[*] | photos[0], photos[1]... | URLs wszystkich zdjęć |
| text_fields.name | notes | Nazwa + dodatkowe info |

## 🔍 Diagnostyka problemów

### Błąd: "Empty user token"
- Musisz uzyskać prawdziwy token z Ovoko
- Skontaktuj się z ich supportem

### Błąd: "Category not found" lub podobny
- Sprawdź czy `category_id` jest poprawne
- Poproś support o listę dostępnych kategorii

### Błąd: "Car not found"
- Sprawdź czy `car_id` dla BMW jest poprawne
- Poproś support o listę dostępnych samochodów

### Błąd sieciowy
- Sprawdź połączenie z internetem
- Sprawdź czy API Ovoko jest dostępne

## 📞 Kontakt z Ovoko Support

**URL:** https://bavarian.rrr.lt/v2  
**Login:** bmw@bavariaparts.pl  
**Hasło:** Karawan1!

**Co poprosić:**
1. User token do API importPart
2. Poprawne category_id dla części BMW
3. Poprawne car_id dla BMW
4. Dokumentację API (jeśli dostępna)

## 🛡️ Bezpieczeństwo

⚠️ **WAŻNE:**
- Nie udostępniaj user_token nikomu
- Nie commituj plików z tokenem do git
- Używaj plików .env do przechowywania poufnych danych

## 📊 Oczekiwany wynik

Po udanym imporcie:
```
✅ SUCCESS! Product imported successfully
🆔 Ovoko Part ID: 288651
📝 Message: OK
```

## 🔄 Kolejne kroki

Po udanym imporcie jednego produktu możesz:
1. Zmodyfikować skrypt do importu wszystkich produktów
2. Dodać mechanizm sprawdzania duplikatów
3. Dodać logowanie do pliku
4. Stworzyć harmonogram automatycznego importu

## 🐛 Debugowanie

Aby zobaczyć szczegółowe logi:
```bash
node test_import_simple.js 2>&1 | tee import_log.txt
```

Skrypt automatycznie wyświetla:
- Wysyłane dane
- Odpowiedź z API
- Szczegóły błędów