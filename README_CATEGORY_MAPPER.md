# 🗺️ Aplikacja Mapowania Kategorii - BaseLinker ↔ OVOKO

## 📋 Opis

Aplikacja webowa do mapowania kategorii między systemami BaseLinker i OVOKO. Pozwala pracownikom na przypisanie każdej kategorii z BaseLinker do odpowiedniej kategorii z OVOKO.

## 🚀 Uruchomienie

### Sposób 1: Uruchomienie przez serwer HTTP (zalecane)

1. **Uruchom serwer:**
   ```bash
   node category_mapper_server.js
   ```

2. **Otwórz przeglądarkę i przejdź do:**
   ```
   http://localhost:3001
   ```

### Sposób 2: Otwarcie bezpośrednio w przeglądarce

1. **Otwórz plik `category_mapper.html` w przeglądarce**
2. **Uwaga:** W tym trybie mogą wystąpić problemy z CORS przy ładowaniu plików JSON

## 📖 Instrukcja użytkowania

### 1. Podstawowe mapowanie kategorii

1. **Wybierz kategorię BaseLinker** z lewej listy (kliknij na nią)
2. **Wybierz odpowiednią kategorię OVOKO** z prawej listy (kliknij na nią)
3. **Kategoria zostanie automatycznie zmapowana** (pojawi się zielona ramka)
4. **Powtórz proces** dla wszystkich kategorii

### 2. Funkcje wyszukiwania i filtrowania

- **🔍 Wyszukiwanie:** Wpisz tekst w polu wyszukiwania aby znaleźć kategorie
- **📊 Filtry:** Użyj rozwijanej listy aby wyświetlić:
  - Wszystkie kategorie
  - Tylko zmapowane kategorie
  - Tylko niezmapowane kategorie

### 3. Zapisywanie i wczytywanie

- **💾 Zapisz mapowanie:** Eksportuje aktualne mapowanie do pliku JSON
- **📤 Eksportuj JSON:** To samo co "Zapisz mapowanie"
- **📥 Wczytaj mapowanie:** Importuje wcześniej zapisane mapowanie z pliku JSON

## 📊 Statystyki i postęp

Aplikacja wyświetla:
- **Liczba kategorii BaseLinker** - całkowita liczba kategorii do zmapowania
- **Liczba kategorii OVOKO** - dostępne kategorie do wyboru
- **Liczba zmapowanych** - ile kategorii zostało już zmapowanych
- **Liczba niezmapowanych** - ile kategorii pozostało do zmapowania
- **Pasek postępu** - wizualne przedstawienie postępu mapowania

## 💾 Format pliku mapowania

Zapisywany plik JSON zawiera:

```json
{
  "source": "Category Mapping Tool",
  "timestamp": "2025-08-28T10:30:00.000Z",
  "mapping": {
    "1730798": "42",
    "1730799": "43",
    "1730800": "45"
  },
  "statistics": {
    "totalBaselinker": 1785,
    "totalOvoko": 6977,
    "mappedCount": 3,
    "unmappedCount": 1782
  }
}
```

Gdzie:
- `mapping` - obiekt mapujący ID kategorii BaseLinker na ID kategorii OVOKO
- `statistics` - statystyki mapowania

## 🎨 Funkcje interfejsu

### Kolory i oznaczenia:
- **🔴 Czerwona ramka** - kategoria niezmapowana
- **🟢 Zielona ramka** - kategoria zmapowana
- **🔵 Niebieskie tło** - wybrana kategoria
- **⚪ Szare tło** - kategoria w stanie domyślnym

### Responsywność:
- Interfejs dostosowuje się do różnych rozmiarów ekranu
- Na urządzeniach mobilnych listy wyświetlają się jedna pod drugą

## ⚠️ Wymagania

- **Pliki JSON:**
  - `baselinker_categories.json` - kategorie z BaseLinker
  - `ovoko_categories_cleaned.json` - kategorie z OVOKO
- **Przeglądarka:** Nowoczesna przeglądarka z obsługą ES6+
- **Node.js:** Wersja 12+ (jeśli używamy serwera HTTP)

## 🔧 Rozwiązywanie problemów

### Problem: "Błąd podczas ładowania danych"
**Rozwiązanie:** Sprawdź czy pliki JSON są dostępne w tym samym katalogu co aplikacja

### Problem: Kategorie się nie ładują
**Rozwiązanie:** 
1. Sprawdź format plików JSON
2. Użyj serwera HTTP zamiast otwierania pliku bezpośrednio
3. Sprawdź konsolę przeglądarki pod kątem błędów

### Problem: Mapowanie się nie zapisuje
**Rozwiązanie:** 
1. Sprawdź czy przeglądarka nie blokuje pobierania plików
2. Sprawdź uprawnienia do zapisu w katalogu

## 📝 Przykład użycia

1. **Uruchom aplikację** przez `node category_mapper_server.js`
2. **Otwórz przeglądarkę** i przejdź do `http://localhost:3001`
3. **Znajdź kategorię BaseLinker** np. "Motoryzacja/Części samochodowe/Układ hamulcowy"
4. **Kliknij na nią** (pojawi się niebieskie tło)
5. **Znajdź odpowiednią kategorię OVOKO** np. "Układ hamulcowy"
6. **Kliknij na nią** (kategoria BaseLinker zmieni kolor na zielony)
7. **Powtórz** dla wszystkich kategorii
8. **Kliknij "Zapisz mapowanie"** aby pobrać plik JSON

## 🎯 Korzyści

- **Intuicyjny interfejs** - łatwe w użyciu nawet dla początkujących
- **Wizualne oznaczenia** - jasne rozróżnienie zmapowanych i niezmapowanych kategorii
- **Wyszukiwanie i filtry** - szybkie znajdowanie potrzebnych kategorii
- **Automatyczne zapisywanie** - mapowanie jest zapisywane w czasie rzeczywistym
- **Eksport JSON** - gotowy plik do użycia w innych systemach
- **Statystyki** - monitorowanie postępu mapowania
