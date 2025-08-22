const fs = require('fs').promises;

/**
 * Script to update ovoko_products_latest.json from current sync_status.json
 * This ensures that products in sync_status.json are also in ovoko_products_latest.json
 */

async function updateOvokoProductsFromSyncStatus() {
    try {
        console.log('🔄 Updating ovoko_products_latest.json from sync_status.json...');
        
        // Load current sync status
        const syncStatusData = await fs.readFile('sync_status.json', 'utf8');
        const syncStatus = JSON.parse(syncStatusData);
        
        // Load current ovoko products (if exists)
        let ovokoProducts = [];
        try {
            const ovokoData = await fs.readFile('ovoko_products_latest.json', 'utf8');
            ovokoProducts = JSON.parse(ovokoData);
        } catch (error) {
            console.log('📦 ovoko_products_latest.json not found or empty, starting fresh');
        }
        
        console.log(`📊 Current sync_status.json has ${Object.keys(syncStatus.synced_products).length} synced products`);
        console.log(`📦 Current ovoko_products_latest.json has ${ovokoProducts.length} products`);
        
        // Get existing SKUs in ovoko_products_latest.json
        const existingSkus = ovokoProducts.map(p => p.sku);
        
        // Add missing products from sync_status.json
        let addedCount = 0;
        for (const [sku, productInfo] of Object.entries(syncStatus.synced_products)) {
            if (!existingSkus.includes(sku)) {
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
                addedCount++;
                console.log(`✅ Added missing product: ${sku} (Part ID: ${productInfo.ovoko_part_id})`);
            } else {
                console.log(`ℹ️  Product ${sku} already exists in ovoko_products_latest.json`);
            }
        }
        
        // Save updated ovoko_products_latest.json
        await fs.writeFile('ovoko_products_latest.json', JSON.stringify(ovokoProducts, null, 2), 'utf8');
        
        console.log(`\n📊 UPDATE RESULTS:`);
        console.log(`  ✅ Products added: ${addedCount}`);
        console.log(`  📦 Total products in ovoko_products_latest.json: ${ovokoProducts.length}`);
        console.log(`  🔄 Products in sync_status.json: ${Object.keys(syncStatus.synced_products).length}`);
        
        if (addedCount > 0) {
            console.log('\n📋 Added products:');
            ovokoProducts.slice(-addedCount).forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.sku} - ${p.name} (Part ID: ${p.part_id})`);
            });
        }
        
        console.log(`\n💾 ovoko_products_latest.json updated successfully!`);
        console.log(`💡 Now you can run smart_inventory_sync.js and it will:`);
        console.log(`   - Find products with stock = 0 in ovoko_products_latest.json`);
        console.log(`   - Remove them from Ovoko`);
        console.log(`   - Update sync_status.json accordingly`);
        
        return ovokoProducts;
        
    } catch (error) {
        throw new Error(`Update failed: ${error.message}`);
    }
}

// Main execution
async function main() {
    try {
        const products = await updateOvokoProductsFromSyncStatus();
        
        console.log('\n🎉 Update completed successfully!');
        console.log(`📦 Final product count: ${products.length}`);
        
    } catch (error) {
        console.error('\n💥 Update failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { updateOvokoProductsFromSyncStatus }; 