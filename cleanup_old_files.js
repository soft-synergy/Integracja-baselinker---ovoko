const fs = require('fs');
const path = require('path');

// Funkcja do usuwania plików
function deleteFile(filePath) {
    try {
        fs.unlinkSync(filePath);
        console.log(`✅ Usunięto: ${filePath}`);
        return true;
    } catch (error) {
        console.log(`❌ Błąd podczas usuwania ${filePath}: ${error.message}`);
        return false;
    }
}

// Funkcja do czyszczenia starych plików
function cleanupOldFiles() {
    console.log('🧹 Rozpoczynam czyszczenie starych plików...\n');
    
    const currentDir = process.cwd();
    const files = fs.readdirSync(currentDir);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    // Usuń smart sync report pliki
    const smartSyncReports = files.filter(file => 
        file.startsWith('smart_sync_report_') && 
        file.endsWith('.json')
    );
    
    console.log(`📊 Znaleziono ${smartSyncReports.length} smart sync report plików:`);
    smartSyncReports.forEach(file => {
        if (deleteFile(file)) {
            deletedCount++;
        } else {
            errorCount++;
        }
    });
    
    // Usuń baselinker products pliki (z wyjątkiem latest)
    const baselinkerProducts = files.filter(file => 
        file.startsWith('baselinker_products_') && 
        file.endsWith('.json') &&
        file !== 'baselinker_products_latest.json'
    );
    
    console.log(`\n📦 Znaleziono ${baselinkerProducts.length} baselinker products plików (bez latest):`);
    baselinkerProducts.forEach(file => {
        if (deleteFile(file)) {
            deletedCount++;
        } else {
            errorCount++;
        }
    });
    
    // Usuń smart sync error pliki
    const smartSyncErrors = files.filter(file => 
        file.startsWith('smart_sync_error_') && 
        file.endsWith('.json')
    );
    
    console.log(`\n🚨 Znaleziono ${smartSyncErrors.length} smart sync error plików:`);
    smartSyncErrors.forEach(file => {
        if (deleteFile(file)) {
            deletedCount++;
        } else {
            errorCount++;
        }
    });
    
    // Podsumowanie
    console.log('\n' + '='.repeat(50));
    console.log('📋 PODSUMOWANIE CZYSZCZENIA:');
    console.log(`✅ Pomyślnie usunięto: ${deletedCount} plików`);
    console.log(`❌ Błędy: ${errorCount} plików`);
    console.log(`📁 Pozostało plików w katalogu: ${files.length - deletedCount}`);
    console.log('='.repeat(50));
    
    // Lista pozostałych plików
    const remainingFiles = fs.readdirSync(currentDir);
    console.log('\n📁 Pozostałe pliki w katalogu:');
    remainingFiles.forEach(file => {
        console.log(`  - ${file}`);
    });
}

// Uruchom czyszczenie
if (require.main === module) {
    cleanupOldFiles();
}

module.exports = { cleanupOldFiles };
