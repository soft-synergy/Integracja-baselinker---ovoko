const fs = require('fs').promises;

// Test function to check product mapping
async function testProductMapping() {
    console.log('🧪 Testing product mapping between OVOKO and BaseLinker...\n');
    
    try {
        // Load sync status
        const syncStatus = JSON.parse(await fs.readFile('sync_status.json', 'utf8'));
        console.log('📋 Sync Status loaded:');
        console.log(`- Synced products: ${Object.keys(syncStatus.synced_products).length}`);
        console.log(`- Synced orders: ${Object.keys(syncStatus.synced_orders).length}\n`);
        
        // Load OVOKO orders
        const ovokoOrders = JSON.parse(await fs.readFile('ovoko_orders_latest.json', 'utf8'));
        console.log('📦 OVOKO Orders loaded:');
        console.log(`- Total orders: ${ovokoOrders.length}\n`);
        
        // Test mapping for each order
        for (const order of ovokoOrders) {
            console.log(`🔍 Testing order: ${order.order_id}`);
            console.log(`- Customer: ${order.customer_name}`);
            console.log(`- Items: ${order.item_list.length}`);
            
            for (const item of order.item_list) {
                console.log(`  📦 Item: ${item.name}`);
                console.log(`    - OVOKO ID: ${item.id}`);
                console.log(`    - OVOKO ID Bridge: ${item.id_bridge}`);
                console.log(`    - External ID: ${item.external_id}`);
                
                // Try to find BaseLinker SKU
                let baselinkerSku = null;
                for (const [sku, status] of Object.entries(syncStatus.synced_products)) {
                    if (status.ovoko_part_id == item.id || status.ovoko_part_id == item.id_bridge) {
                        baselinkerSku = sku;
                        break;
                    }
                }
                
                if (baselinkerSku) {
                    console.log(`    ✅ Found BaseLinker SKU: ${baselinkerSku}`);
                    console.log(`    📊 Product: ${syncStatus.synced_products[baselinkerSku].product_name}`);
                } else {
                    console.log(`    ❌ No BaseLinker SKU found!`);
                    console.log(`    ⚠️  This product is not synced to BaseLinker`);
                }
                console.log('');
            }
        }
        
        // Summary
        console.log('📊 SUMMARY:');
        let totalItems = 0;
        let mappedItems = 0;
        
        for (const order of ovokoOrders) {
            for (const item of order.item_list) {
                totalItems++;
                let found = false;
                for (const [sku, status] of Object.entries(syncStatus.synced_products)) {
                    if (status.ovoko_part_id == item.id || status.ovoko_part_id == item.id_bridge) {
                        found = true;
                        break;
                    }
                }
                if (found) mappedItems++;
            }
        }
        
        console.log(`- Total items in orders: ${totalItems}`);
        console.log(`- Items mapped to BaseLinker: ${mappedItems}`);
        console.log(`- Mapping success rate: ${((mappedItems / totalItems) * 100).toFixed(1)}%`);
        
        if (mappedItems < totalItems) {
            console.log('\n⚠️  WARNING: Some products are not synced to BaseLinker!');
            console.log('   You need to import these products to OVOKO first.');
        } else {
            console.log('\n✅ SUCCESS: All products are properly mapped!');
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
    }
}

// Run the test
testProductMapping().catch(console.error); 