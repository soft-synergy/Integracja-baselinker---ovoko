const XLSX = require('xlsx');
const fs = require('fs');

// Read the JSON files
const baselinkerData = JSON.parse(fs.readFileSync('baselinker_categories.json', 'utf8'));
const ovokoData = JSON.parse(fs.readFileSync('ovoko_categories.json', 'utf8'));

// Extract categories data
const baselinkerCategories = baselinkerData.data.categories;
const ovokoCategories = ovokoData.data.list;

// Filter only level 3 categories from OVOKO
const ovokoLevel3Categories = ovokoCategories.filter(category => category.level === "3");

// Prepare BaseLinker data for Excel
const baselinkerExcelData = baselinkerCategories.map(category => ({
    'Source': 'BaseLinker',
    'Category ID': category.category_id,
    'Name': category.name,
    'Parent ID': category.parent_id,
    'OVOKO ID': '', // Empty column for mapping
    'OVOKO Name': '' // Empty column for mapping
}));

// Prepare OVOKO level 3 data for Excel
const ovokoExcelData = ovokoLevel3Categories.map(category => ({
    'Source': 'OVOKO',
    'Category ID': category.id,
    'Name': category.pl || category.en, // Use Polish name if available, otherwise English
    'Parent ID': category.parent_id,
    'Level': category.level,
    'BaseLinker ID': '', // Empty column for mapping
    'BaseLinker Name': '' // Empty column for mapping
}));

// Combine both datasets
const combinedData = [...baselinkerExcelData, ...ovokoExcelData];

// Create a new workbook
const workbook = XLSX.utils.book_new();

// Create a worksheet from the combined data
const worksheet = XLSX.utils.json_to_sheet(combinedData);

// Set column widths for better readability
const columnWidths = [
    { wch: 12 }, // Source
    { wch: 15 }, // Category ID
    { wch: 80 }, // Name
    { wch: 15 }, // Parent ID
    { wch: 8 },  // Level
    { wch: 15 }, // OVOKO ID / BaseLinker ID
    { wch: 80 }  // OVOKO Name / BaseLinker Name
];
worksheet['!cols'] = columnWidths;

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Category Mapping');

// Generate filename with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filename = `category_mapping_level3_${timestamp}.xlsx`;

// Write the Excel file
XLSX.writeFile(workbook, filename);

console.log(`Excel file created successfully: ${filename}`);
console.log(`Total BaseLinker categories: ${baselinkerCategories.length}`);
console.log(`Total OVOKO level 3 categories: ${ovokoLevel3Categories.length}`);
console.log(`Total rows in Excel: ${combinedData.length}`);
console.log('\nInstructions for mapping:');
console.log('- Fill in "OVOKO ID" column for BaseLinker rows with corresponding OVOKO category ID');
console.log('- Fill in "BaseLinker ID" column for OVOKO rows with corresponding BaseLinker category ID');
console.log('- You can also fill in the name columns for reference');
console.log('- Only OVOKO level 3 categories are included for easier mapping');
