const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3005;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/category_mapper.html' : req.url;
    filePath = path.join(__dirname, filePath);

    // Sprawdź czy plik istnieje
    if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Plik nie został znaleziony</h1>');
        return;
    }

    // Pobierz rozszerzenie pliku
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Przeczytaj plik
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>500 - Błąd serwera</h1>');
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Serwer uruchomiony na http://localhost:${PORT}`);
    console.log(`📁 Otwórz przeglądarkę i przejdź do: http://localhost:${PORT}`);
    console.log(`📋 Aplikacja mapowania kategorii jest gotowa do użycia!`);
    console.log(`\n📖 Instrukcja:`);
    console.log(`1. Otwórz przeglądarkę i przejdź do http://localhost:${PORT}`);
    console.log(`2. Wybierz kategorię BaseLinker z lewej listy`);
    console.log(`3. Wybierz odpowiednią kategorię OVOKO z prawej listy`);
    console.log(`4. Kliknij "Zapisz mapowanie" aby zapisać zmiany`);
    console.log(`5. Użyj wyszukiwania i filtrów aby łatwiej znaleźć potrzebne kategorie`);
    console.log(`\n⏹️  Aby zatrzymać serwer, naciśnij Ctrl+C`);
});
