const fs = require('fs').promises;

/**
 * Simple script to reset ovoko_products_latest.json
 * Since all products seem to be removed from Ovoko, we'll start fresh
 */

async function resetOvokoProducts() {
    try {
        console.log('🔄 Resetting ovoko_products_latest.json...');
        
        // Create empty products array
        const emptyProducts = [];
        
        // Save empty array
        await fs.writeFile('ovoko_products_latest.json', JSON.stringify(emptyProducts, null, 2), 'utf8');
        
        console.log('✅ ovoko_products_latest.json reset to empty array');
        console.log('📦 Product count: 0');
        console.log('\n💡 Now you can run smart_inventory_sync.js and it will:');
        console.log('   - Not try to remove any products from Ovoko');
        console.log('   - Only update sync_status.json for products with stock = 0');
        console.log('   - Work without errors');
        
        return emptyProducts;
        
    } catch (error) {
        throw new Error(`Reset failed: ${error.message}`);
    }
}

// Main execution
async function main() {
    try {
        await resetOvokoProducts();
        console.log('\n🎉 Reset completed successfully!');
        
    } catch (error) {
        console.error('\n💥 Reset failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { resetOvokoProducts }; 