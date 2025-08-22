const fs = require('fs').promises;
const { enqueueEvent } = require('./events_queue');

// Configuration
const SYNC_STATUS_FILE = 'sync_status.json';
const BASELINKER_PRODUCTS_FILE = 'baselinker_products_latest.json';

// Load sync status
async function loadSyncStatus() {
    try {
        const data = await fs.readFile(SYNC_STATUS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('📄 No sync status file found, creating new one...');
        return {
            last_updated: new Date().toISOString(),
            synced_products: {}
        };
    }
}

// Save sync status
async function saveSyncStatus(syncStatus) {
    try {
        syncStatus.last_updated = new Date().toISOString();
        await fs.writeFile(SYNC_STATUS_FILE, JSON.stringify(syncStatus, null, 2), 'utf8');
        console.log('💾 Sync status saved');
    } catch (error) {
        console.error('❌ Error saving sync status:', error.message);
    }
}

// Load BaseLinker products
async function loadBaseLinkerProducts() {
    try {
        const data = await fs.readFile(BASELINKER_PRODUCTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Error loading BaseLinker products:', error.message);
        return [];
    }
}

// Check if product has changed
function hasProductChanged(oldProduct, newProduct) {
    if (!oldProduct || !newProduct) return false;
    
    // Check price changes
    const oldPrice = Object.values(oldProduct.prices || {})[0];
    const newPrice = Object.values(newProduct.prices || {})[0];
    if (oldPrice !== newPrice) {
        console.log(`💰 Price changed for ${newProduct.sku}: ${oldPrice} → ${newPrice}`);
        return true;
    }
    
    // Check image changes
    const oldImages = Object.values(oldProduct.images || {});
    const newImages = Object.values(newProduct.images || {});
    if (JSON.stringify(oldImages) !== JSON.stringify(newImages)) {
        console.log(`🖼️ Images changed for ${newProduct.sku}`);
        return true;
    }
    
    // Check name changes
    const oldName = oldProduct.text_fields?.name;
    const newName = newProduct.text_fields?.name;
    if (oldName !== newName) {
        console.log(`📝 Name changed for ${newProduct.sku}: "${oldName}" → "${newName}"`);
        return true;
    }
    
    // Check features changes
    const oldFeatures = oldProduct.text_fields?.features || {};
    const newFeatures = newProduct.text_fields?.features || {};
    if (JSON.stringify(oldFeatures) !== JSON.stringify(newFeatures)) {
        console.log(`🔧 Features changed for ${newProduct.sku}`);
        return true;
    }
    
    return false;
}

// Main function to check for product changes
async function checkProductChanges() {
    console.log('🔍 Checking for product changes...');
    
    try {
        const syncStatus = await loadSyncStatus();
        const products = await loadBaseLinkerProducts();
        
        let changesFound = 0;
        
        for (const product of products) {
            const savedStatus = syncStatus.synced_products[product.sku];
            
            // Only check products that are already synced to Ovoko
            if (savedStatus && savedStatus.ovoko_part_id) {
                // Load the previous version from sync status
                const previousProduct = savedStatus.previous_version;
                
                if (hasProductChanged(previousProduct, product)) {
                    console.log(`🔄 Product ${product.sku} has changes, enqueueing update...`);
                    
                    try {
                        // Enqueue update event
                        await enqueueEvent('OVOKO_UPDATE_PRODUCT', {
                            source: 'baselinker',
                            sku: product.sku,
                            ovoko_part_id: savedStatus.ovoko_part_id,
                            product,
                            changes: {
                                price: previousProduct?.prices !== product.prices,
                                images: previousProduct?.images !== product.images,
                                name: previousProduct?.text_fields?.name !== product.text_fields?.name,
                                features: previousProduct?.text_fields?.features !== product.text_fields?.features
                            }
                        });
                        
                        changesFound++;
                        
                        // Update the previous version in sync status
                        savedStatus.previous_version = product;
                        savedStatus.last_checked = new Date().toISOString();
                        
                    } catch (error) {
                        console.error(`❌ Failed to enqueue update for ${product.sku}:`, error.message);
                    }
                }
            }
        }
        
        if (changesFound > 0) {
            console.log(`✅ Found ${changesFound} products with changes, events enqueued.`);
            await saveSyncStatus(syncStatus);
        } else {
            console.log('✅ No product changes detected.');
        }
        
        return changesFound;
        
    } catch (error) {
        console.error('💥 Error checking product changes:', error.message);
        return 0;
    }
}

// Update sync status with current product versions (for new syncs)
async function updateProductVersions() {
    console.log('📝 Updating product versions in sync status...');
    
    try {
        const syncStatus = await loadSyncStatus();
        const products = await loadBaseLinkerProducts();
        
        let updated = 0;
        
        for (const product of products) {
            const savedStatus = syncStatus.synced_products[product.sku];
            
            if (savedStatus && savedStatus.ovoko_part_id) {
                // Store current version for future change detection
                savedStatus.previous_version = product;
                savedStatus.last_checked = new Date().toISOString();
                updated++;
            }
        }
        
        if (updated > 0) {
            await saveSyncStatus(syncStatus);
            console.log(`✅ Updated ${updated} product versions in sync status.`);
        }
        
        return updated;
        
    } catch (error) {
        console.error('💥 Error updating product versions:', error.message);
        return 0;
    }
}

// Main execution
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'update-versions') {
        updateProductVersions()
            .then(() => process.exit(0))
            .catch(error => {
                console.error('💥 Error:', error.message);
                process.exit(1);
            });
    } else {
        checkProductChanges()
            .then(() => process.exit(0))
            .catch(error => {
                console.error('💥 Error:', error.message);
                process.exit(1);
            });
    }
}

module.exports = { checkProductChanges, updateProductVersions }; 