const fs = require('fs').promises;

/**
 * Script to create ovoko_products_latest.json from sync_status_backup.json
 * This is needed because Ovoko API doesn't have an endpoint to get all parts
 */

async function createOvokoProductsFromSyncStatus() {
    try {
        console.log('🔄 Creating ovoko_products_latest.json from sync_status_backup.json...');
        
        // Read sync status backup
        const syncStatusData = await fs.readFile('sync_status_backup.json', 'utf8');
        const syncStatus = JSON.parse(syncStatusData);
        
        // Convert synced products to Ovoko format
        const ovokoProducts = [];
        
        for (const [sku, productInfo] of Object.entries(syncStatus.synced_products)) {
            if (productInfo.ovoko_part_id) {
                const ovokoProduct = {
                    id: productInfo.ovoko_part_id,
                    part_id: productInfo.ovoko_part_id,
                    sku: sku,
                    external_id: sku,
                    name: productInfo.product_name || `Product ${sku}`,
                    synced_at: productInfo.synced_at,
                    baselinker_info: {
                        sku: sku,
                        product_name: productInfo.product_name,
                        last_checked: productInfo.last_checked || null
                    }
                };
                
                ovokoProducts.push(ovokoProduct);
                console.log(`✅ Added product: ${sku} (Part ID: ${productInfo.ovoko_part_id})`);
            }
        }
        
        // Save to ovoko_products_latest.json
        await fs.writeFile('ovoko_products_latest.json', JSON.stringify(ovokoProducts, null, 2), 'utf8');
        
        console.log(`\n💾 Successfully created ovoko_products_latest.json with ${ovokoProducts.length} products`);
        console.log('📋 Products:');
        ovokoProducts.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.sku} - ${p.name} (Part ID: ${p.part_id})`);
        });
        
        return ovokoProducts;
        
    } catch (error) {
        console.error('❌ Error creating ovoko_products_latest.json:', error.message);
        throw error;
    }
}

// Main execution
async function main() {
    try {
        const products = await createOvokoProductsFromSyncStatus();
        console.log('\n🎉 ovoko_products_latest.json created successfully!');
        console.log(`📊 Total products: ${products.length}`);
        
    } catch (error) {
        console.error('\n💥 Failed to create ovoko_products_latest.json:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { createOvokoProductsFromSyncStatus }; 