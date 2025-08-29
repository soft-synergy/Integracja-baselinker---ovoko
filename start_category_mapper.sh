#!/bin/bash

echo "🚀 Uruchamianie aplikacji mapowania kategorii..."
echo ""

# Sprawdź czy Node.js jest zainstalowany
if ! command -v node &> /dev/null; then
    echo "❌ Błąd: Node.js nie jest zainstalowany!"
    echo "   Zainstaluj Node.js ze strony: https://nodejs.org/"
    exit 1
fi

# Sprawdź czy pliki JSON istnieją
if [ ! -f "baselinker_categories.json" ]; then
    echo "❌ Błąd: Plik baselinker_categories.json nie został znaleziony!"
    echo "   Upewnij się, że plik znajduje się w tym katalogu."
    exit 1
fi

if [ ! -f "ovoko_categories_cleaned.json" ]; then
    echo "❌ Błąd: Plik ovoko_categories_cleaned.json nie został znaleziony!"
    echo "   Upewnij się, że plik znajduje się w tym katalogu."
    exit 1
fi

echo "✅ Wszystkie wymagane pliki zostały znalezione"
echo ""

# Sprawdź czy port 3001 jest wolny
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3001 jest już zajęty. Zatrzymuję istniejący proces..."
    pkill -f "category_mapper_server.js"
    sleep 2
fi

echo "🌐 Uruchamianie serwera na porcie 3001..."
echo ""

# Uruchom serwer
node category_mapper_server.js &

# Poczekaj chwilę na uruchomienie
sleep 3

# Sprawdź czy serwer działa
if curl -s http://localhost:3001 > /dev/null; then
    echo ""
    echo "🎉 Aplikacja została uruchomiona pomyślnie!"
    echo ""
    echo "📱 Otwórz przeglądarkę i przejdź do:"
    echo "   http://localhost:3001"
    echo ""
    echo "⏹️  Aby zatrzymać serwer, naciśnij Ctrl+C"
    echo ""
    
    # Otwórz przeglądarkę (jeśli jest dostępna)
    if command -v open &> /dev/null; then
        echo "🌐 Otwieram przeglądarkę..."
        open http://localhost:3001
    elif command -v xdg-open &> /dev/null; then
        echo "🌐 Otwieram przeglądarkę..."
        xdg-open http://localhost:3001
    fi
    
    # Czekaj na sygnał przerwania
    wait
else
    echo "❌ Błąd: Serwer nie uruchomił się poprawnie!"
    echo "   Sprawdź logi powyżej."
    exit 1
fi
