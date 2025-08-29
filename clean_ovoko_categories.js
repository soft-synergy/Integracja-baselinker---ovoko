const fs = require('fs');

// Read the original file
console.log('Reading ovoko_categories.json...');
const originalData = JSON.parse(fs.readFileSync('ovoko_categories.json', 'utf8'));

// Filter only level 3 categories and clean them up
console.log('Filtering level 3 categories...');
const level3Categories = originalData.data.list.filter(category => category.level === "3");

console.log(`Found ${level3Categories.length} level 3 categories`);

// Clean up each category - keep only id and Polish name
const cleanedCategories = level3Categories.map(category => ({
    id: category.id,
    pl: category.pl
}));

// Create new structure
const cleanedData = {
    source: "Ovoko",
    timestamp: new Date().toISOString(),
    status: "success",
    data: {
        list: cleanedCategories
    }
};

// Write the cleaned data to a new file
const outputFilename = 'ovoko_categories_cleaned.json';
fs.writeFileSync(outputFilename, JSON.stringify(cleanedData, null, 2), 'utf8');

console.log(`Cleaned data saved to ${outputFilename}`);
console.log(`Original categories: ${originalData.data.list.length}`);
console.log(`Cleaned categories: ${cleanedCategories.length}`);

// Show first few examples
console.log('\nFirst 5 cleaned categories:');
cleanedCategories.slice(0, 5).forEach(cat => {
    console.log(`ID: ${cat.id}, Name: ${cat.pl}`);
});
