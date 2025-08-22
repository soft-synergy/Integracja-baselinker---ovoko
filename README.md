# 🚗 Ovoko Baselinker Sync - Web GUI

System webowy do synchronizacji produktów BaseLinker z Ovoko.

## ✨ Funkcje

- 🔐 **Logowanie** - Bezpieczny system autoryzacji
- 📦 **Lista produktów BaseLinker** - Przeglądanie wszystkich produktów
- 🔄 **Status synchronizacji** - Sprawdzanie czy produkt jest już w Ovoko
- ➕ **Dodawanie do Ovoko** - Przycisk do importu produktów
- 📋 **Lista zamówień Ovoko** - Przeglądanie zamówień z systemu
- 🔍 **Wyszukiwanie** - Filtrowanie produktów po nazwie/SKU
- 📊 **Statystyki** - Liczba produktów, zsynchronizowanych, oczekujących

## 🚀 Uruchomienie

1. **Zainstaluj zależności:**
   ```bash
   npm install
   ```

2. **Uruchom serwer:**
   ```bash
   npm start
   # lub
   node server.js
   ```

3. **Otwórz przeglądarkę:**
   ```
   http://localhost:3000
   ```

## 🔑 Dane logowania

- **Username:** `admin`
- **Password:** `password`

## 📁 Struktura plików

```
├── server.js                 # Serwer Express
├── package.json             # Zależności
├── public/                  # Pliki statyczne
│   ├── login.html          # Strona logowania
│   └── dashboard.html      # Główny dashboard
├── baselinker_products_*.json  # Dane produktów BaseLinker
└── README.md               # Ten plik
```

## 🔧 API Endpoints

- `POST /api/login` - Logowanie
- `POST /api/logout` - Wylogowanie
- `GET /api/baselinker-products` - Lista produktów BaseLinker
- `GET /api/ovoko-orders` - Lista zamówień Ovoko
- `POST /api/import-product` - Import produktu do Ovoko

## 💡 Jak używać

1. **Zaloguj się** używając danych `admin` / `password`
2. **Przeglądaj produkty** na karcie "Products"
3. **Sprawdź status** - zielona ramka = zsynchronizowany, czerwona = nie
4. **Kliknij "Sync to Ovoko"** aby dodać produkt
5. **Przełącz na "Orders"** aby zobaczyć zamówienia z Ovoko

## 🎯 Status synchronizacji

- ✅ **Zielona ramka** - Produkt już zsynchronizowany z Ovoko
- ❌ **Czerwona ramka** - Produkt nie jest w Ovoko (można dodać)
- 🔍 **Wyszukiwanie** - Filtruj produkty po nazwie lub SKU

## 🚨 Uwagi

- Upewnij się, że plik `baselinker_products_*.json` jest w głównym katalogu
- Serwer używa portu 3000 (można zmienić w `server.js`)
- Dane logowania są hardcoded - w produkcji użyj bazy danych 