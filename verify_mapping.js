const fs = require('fs');

// Wczytaj pliki
const baselinkerCategories = JSON.parse(fs.readFileSync('baselinker_categories.json', 'utf8'));
const mapping = JSON.parse(fs.readFileSync('complete_mapping.json', 'utf8'));

// Pobierz wszystkie ID z BaseLinker
const baselinkerIds = baselinkerCategories.data.categories.map(cat => cat.category_id).sort((a, b) => a - b);

// Pobierz wszystkie ID z mappingu
const mappedIds = mapping.map(item => item.baselinker_id).sort((a, b) => a - b);

// Sprawdź czy wszystkie ID są zmapowane
const missingIds = baselinkerIds.filter(id => !mappedIds.includes(id));
const extraIds = mappedIds.filter(id => !baselinkerIds.includes(id));

console.log('=== WERYFIKACJA MAPPINGU KATEGORII ===\n');

console.log(`Liczba kategorii BaseLinker: ${baselinkerIds.length}`);
console.log(`Liczba kategorii w mapowaniu: ${mappedIds.length}`);
console.log(`Brakujące ID: ${missingIds.length}`);
console.log(`Nadmiarowe ID: ${extraIds.length}`);

if (missingIds.length > 0) {
    console.log('\n❌ BRAKUJĄCE ID:');
    missingIds.forEach(id => {
        const category = baselinkerCategories.data.categories.find(cat => cat.category_id === id);
        console.log(`  ${id}: ${category ? category.name : 'Nieznana kategoria'}`);
    });
}

if (extraIds.length > 0) {
    console.log('\n⚠️ NADMIAROWE ID:');
    extraIds.forEach(id => console.log(`  ${id}`));
}

if (missingIds.length === 0 && extraIds.length === 0) {
    console.log('\n✅ MAPPING JEST KOMPLETNY!');
    console.log('Wszystkie kategorie BaseLinker zostały zmapowane.');
}

// Sprawdź statystyki użycia kategorii OVOKO
const ovokoUsage = {};
mapping.forEach(item => {
    ovokoUsage[item.ovoko_id] = (ovokoUsage[item.ovoko_id] || 0) + 1;
});

console.log('\n=== STATYSTYKI UŻYCIA KATEGORII OVOKO ===');
Object.entries(ovokoUsage)
    .sort(([,a], [,b]) => b - a)
    .forEach(([ovokoId, count]) => {
        console.log(`Kategoria OVOKO ${ovokoId}: ${count} przypisań`);
    });

console.log('\n=== PODSUMOWANIE ===');
console.log(`✅ Pokrycie: ${((mappedIds.length / baselinkerIds.length) * 100).toFixed(1)}%`);
console.log(`✅ Status: ${missingIds.length === 0 ? 'KOMPLETNY' : 'NIEKOMPLETNY'}`);
