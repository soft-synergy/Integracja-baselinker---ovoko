const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');

/**
 * SMART INVENTORY SYNCHRONIZER
 * 
 * This is the MAIN synchronization system that:
 * 1. Fetches latest products from BaseLinker
 * 2. Updates baselinker_products_latest.json with current data
 * 3. Compares with previous version to detect changes
 * 4. Synchronizes with Ovoko
 */

class SmartInventorySynchronizer {
    constructor(baselinkerToken, ovokoCredentials) {
        this.baselinkerToken = baselinkerToken;
        this.ovokoCredentials = ovokoCredentials;
        this.baselinkerApiUrl = 'https://api.baselinker.com/connector.php';
        this.ovokoDeleteApiUrl = 'https://api.rrr.lt/crm/deletePart';
        this.requestDelay = 1000;
        
        // Only use stock from this BaseLinker warehouse key
        this.allowedStockKey = 'bl_4376';
        
        // Files for tracking changes
        this.latestBaselinkerFile = 'baselinker_products_latest.json';
        this.changesLogFile = 'inventory_changes_log.json';
        this.syncReportFile = 'smart_sync_report.json';
    }

    // Keep only allowed stock key on product; return true if present
    keepOnlyAllowedStock(product) {
        const stock = product && product.stock;
        if (stock && typeof stock === 'object' && this.allowedStockKey in stock) {
            const val = stock[this.allowedStockKey] || 0;
            product.stock = { [this.allowedStockKey]: val };
            return true;
        }
        return false;
    }

    // BaseLinker API methods (copied exactly from get_baselinker_products.js)
    async makeBaseLinkerRequest(method, parameters = {}) {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams();
            postData.append('token', this.baselinkerToken);
            postData.append('method', method);
            postData.append('parameters', JSON.stringify(parameters));

            const options = {
                hostname: 'api.baselinker.com',
                path: '/connector.php',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData.toString()),
                    'User-Agent': 'BaseLinker-Client/1.0'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.status === 'SUCCESS') {
                            resolve(response);
                        } else {
                            reject(new Error(`BaseLinker API Error: ${response.error_message || JSON.stringify(response)}`));
                        }
                    } catch (error) {
                        reject(new Error(`JSON Parse Error: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request Error: ${error.message}`));
            });

            req.write(postData.toString());
            req.end();
        });
    }

    // Add missing method from get_baselinker_products.js
    async getInventoryProductsData(products, inventoryId) {
        try {
            const parameters = {
                inventory_id: inventoryId,
                products: products
            };
            const response = await this.makeBaseLinkerRequest('getInventoryProductsData', parameters);

            if (response.products) {
                if (typeof response.products === 'object' && !Array.isArray(response.products)) {
                    return response.products;
                } else if (Array.isArray(response.products)) {
                    const productsObj = {};
                    response.products.forEach(product => {
                        const id = product.product_id || product.id;
                        if (id) {
                            productsObj[id] = product;
                        }
                    });
                    return productsObj;
                }
            }

            return response.products || {};
        } catch (error) {
            throw new Error(`Error fetching products data: ${error.message}`);
        }
    }

    // Ovoko API methods
    async makeOvokoDeleteRequest(partId) {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams();
            postData.append('username', this.ovokoCredentials.username);
            postData.append('password', this.ovokoCredentials.password);
            postData.append('user_token', this.ovokoCredentials.userToken);
            postData.append('part_id', partId.toString());

            const options = {
                hostname: 'api.rrr.lt',
                path: '/crm/deletePart',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData.toString())
                }
            };

            console.log(`🗑️  Deleting part ID: ${partId} from Ovoko...`);

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (response.status_code === 'R200') {
                            console.log(`✅ Successfully deleted part ID: ${partId}`);
                            resolve(response);
                        } else {
                            reject(new Error(`Ovoko API Error: ${response.msg || JSON.stringify(response)}`));
                        }
                    } catch (error) {
                        console.error('Raw response:', responseData);
                        reject(new Error(`JSON Parse Error: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request Error: ${error.message}`));
            });

            req.write(postData.toString());
            req.end();
        });
    }

    // Get current inventory states from BaseLinker (EXACT COPY from get_baselinker_products.js)
    async getCurrentBaselinkerInventory() {
        try {
            console.log('📦 Fetching current inventory from BaseLinker...');
            
            const inventories = await this.makeBaseLinkerRequest('getInventories');
            const allProducts = [];

            for (const inventory of inventories.inventories || []) {
                console.log(`🔍 Checking inventory: ${inventory.name} (ID: ${inventory.inventory_id})`);
                
                try {
                    // Try paginated approach first (EXACT COPY from get_baselinker_products.js)
                    let page = 1;
                    let hasMoreProducts = true;
                    const pageSize = 1000; // Baselinker default page size
                    
                    while (hasMoreProducts) {
                        console.log(`  Fetching page ${page}...`);
                        try {
                            const parameters = {
                                inventory_id: inventory.inventory_id,
                                page: page,
                                get_products: 1
                            };
                            
                            const response = await this.makeBaseLinkerRequest('getInventoryProductsList', parameters);
                            
                            if (response.products && Object.keys(response.products).length > 0) {
                                const products = Object.values(response.products);
                                console.log(`  Page ${page}: Found ${products.length} products, fetching full data...`);
                                
                                // Get full product data including images (EXACT COPY)
                                const productIds = products.map(p => p.product_id || p.id).filter(Boolean);
                                if (productIds.length > 0) {
                                    try {
                                        const fullProductsData = await this.makeBaseLinkerRequest('getInventoryProductsData', {
                                            inventory_id: inventory.inventory_id,
                                            products: productIds
                                        });
                                        
                                        if (fullProductsData.products) {
                                            const fullProducts = Object.values(fullProductsData.products);
                                            
                                            const filteredProducts = [];
                                            fullProducts.forEach(product => {
                                                product.inventory_id = inventory.inventory_id;
                                                product.inventory_name = inventory.name;
                                                if (this.keepOnlyAllowedStock(product)) {
                                                    filteredProducts.push(product);
                                                }
                                            });
                                            
                                            allProducts.push(...filteredProducts);
                                            console.log(`  Page ${page}: Added ${filteredProducts.length} products with full data (only ${this.allowedStockKey})`);
                                        }
                                    } catch (error) {
                                        console.log(`  Failed to get full data for page ${page}: ${error.message}`);
                                        // Fallback to basic data (EXACT COPY)
                                        const filteredProducts = [];
                                        products.forEach(product => {
                                            product.inventory_id = inventory.inventory_id;
                                            product.inventory_name = inventory.name;
                                            if (this.keepOnlyAllowedStock(product)) {
                                                filteredProducts.push(product);
                                            }
                                        });
                                        allProducts.push(...filteredProducts);
                                        console.log(`  Page ${page}: Added ${filteredProducts.length} products with basic data (only ${this.allowedStockKey})`);
                                    }
                                }
                                
                                // Check if we have more products (EXACT COPY)
                                if (products.length < pageSize) {
                                    hasMoreProducts = false;
                                } else {
                                    page++;
                                    await new Promise(resolve => setTimeout(resolve, this.requestDelay));
                                }
                            } else {
                                hasMoreProducts = false;
                            }
                        } catch (error) {
                            console.log(`  Page ${page} failed: ${error.message}`);
                            hasMoreProducts = false;
                        }
                    }
                    
                    // If paginated approach didn't work, try direct method (EXACT COPY)
                    if (allProducts.filter(p => p.inventory_id === inventory.inventory_id).length === 0) {
                        try {
                            console.log('  Trying direct getInventoryProductsData...');
                            const productsResponse = await this.makeBaseLinkerRequest('getInventoryProductsData', {
                                inventory_id: inventory.inventory_id
                            });

                            if (productsResponse.products && Object.keys(productsResponse.products).length > 0) {
                                const products = Object.values(productsResponse.products);
                                const filteredProducts = [];
                                products.forEach(product => {
                                    product.inventory_id = inventory.inventory_id;
                                    product.inventory_name = inventory.name;
                                    if (this.keepOnlyAllowedStock(product)) {
                                        filteredProducts.push(product);
                                    }
                                });
                                allProducts.push(...filteredProducts);
                                console.log(`  Direct method added ${filteredProducts.length} products (only ${this.allowedStockKey})`);
                            }
                        } catch (error) {
                            console.log(`  Direct method failed: ${error.message}`);
                        }
                    }
                    
                } catch (error) {
                    console.error(`  Error processing inventory ${inventory.name}:`, error.message);
                }
                
                await new Promise(resolve => setTimeout(resolve, this.requestDelay));
            }

            console.log(`📊 Total products fetched: ${allProducts.length}`);
            
            // Filter out products without SKU and keep original format for compatibility with frontend
            const productsWithSku = allProducts.filter(product => product.sku && product.sku.trim() !== '');
            console.log(`📊 Keeping original format: ${productsWithSku.length} products (filtered out ${allProducts.length - productsWithSku.length} products without SKU)`);
            return productsWithSku;

        } catch (error) {
            throw new Error(`Error fetching current inventory: ${error.message}`);
        }
    }

    // Load last known inventory state from latest file
    async loadLastBaselinkerInventory() {
        try {
            const data = await fs.readFile(this.latestBaselinkerFile, 'utf8');
            const products = JSON.parse(data);
            
            // Convert to inventory format for comparison
            const lastInventory = {};
            products.forEach(product => {
                if (product.sku) {
                    // Extract stock from the original format
                    let stock = 0;
                    if (product.stock && typeof product.stock === 'object') {
                        // Only count allowed warehouse stock
                        const val = product.stock[this.allowedStockKey];
                        stock = typeof val === 'number' ? val : 0;
                    } else {
                        // Old format: stock: 5
                        stock = product.stock || 0;
                    }
                    
                    lastInventory[product.sku] = {
                        product_id: product.product_id || product.id,
                        stock: stock,
                        inventory_id: product.inventory_id || '',
                        inventory_name: product.inventory_name || '',
                        last_checked: product.last_checked || new Date().toISOString()
                    };
                }
            });
            
            console.log(`📊 Loaded ${Object.keys(lastInventory).length} products from latest inventory file`);
            return lastInventory;
            
        } catch (error) {
            console.log(`⚠️  Could not load ${this.latestBaselinkerFile}, starting fresh`);
            return {};
        }
    }

    // Load Ovoko products
    async loadOvokoProducts() {
        try {
            const data = await fs.readFile('ovoko_products_latest.json', 'utf8');
            const products = JSON.parse(data);
            
            if (!Array.isArray(products)) {
                console.log(`⚠️  ovoko_products_latest.json is not an array, converting...`);
                if (typeof products === 'object' && products !== null) {
                    // If it's an object, try to extract products array
                    const productsArray = Object.values(products);
                    console.log(`📦 Converted ${productsArray.length} products from object format`);
                    return productsArray;
                } else {
                    console.log(`⚠️  Invalid format in ovoko_products_latest.json, using empty array`);
                    return [];
                }
            }
            
            console.log(`📦 Loaded ${products.length} products from ovoko_products_latest.json`);
            return products;
            
        } catch (error) {
            console.log(`⚠️  Could not load ovoko_products_latest.json: ${error.message}`);
            console.log(`📦 Starting with empty products list`);
            return [];
        }
    }

    // Analyze changes between current and last inventory
    async analyzeInventoryChanges(currentProducts, lastInventory) {
        console.log('\n🔍 Analyzing inventory changes...');
        
        const changes = {
            new_products: [],
            removed_products: [],
            stock_changes: [],
            unchanged_products: []
        };

        // Check for new products and stock changes
        for (const currentProduct of currentProducts) {
            const sku = currentProduct.sku;
            if (!sku) continue;
            
            const last = lastInventory[sku];
            
            // Extract current stock from original format
            let currentStock = 0;
            if (currentProduct.stock && typeof currentProduct.stock === 'object') {
                // Only count allowed warehouse stock
                const val = currentProduct.stock[this.allowedStockKey];
                currentStock = typeof val === 'number' ? val : 0;
            } else {
                // Old format: stock: 5
                currentStock = currentProduct.stock || 0;
            }
            
            if (!last) {
                changes.new_products.push({
                    sku: sku,
                    current: currentProduct,
                    reason: 'New product'
                });
            } else if (currentStock !== last.stock) {
                changes.stock_changes.push({
                    sku: sku,
                    previous: last.stock,
                    current: currentStock,
                    previous_inventory: last.inventory_name,
                    current_inventory: currentProduct.inventory_name,
                    reason: `Stock changed from ${last.stock} to ${currentStock}`
                });
            } else {
                changes.unchanged_products.push(sku);
            }
        }

        // Check for removed products
        for (const [sku, last] of Object.entries(lastInventory)) {
            const stillExists = currentProducts.some(p => p.sku === sku);
            if (!stillExists) {
                changes.removed_products.push({
                    sku: sku,
                    last_known: last,
                    reason: 'Product removed from BaseLinker'
                });
            }
        }

        console.log(`📊 Change analysis results:`);
        console.log(`  ✅ New products: ${changes.new_products.length}`);
        console.log(`  ❌ Removed products: ${changes.removed_products.length}`);
        console.log(`  🔄 Stock changes: ${changes.stock_changes.length}`);
        console.log(`  ➡️  Unchanged: ${changes.unchanged_products.length}`);

        return changes;
    }

    // Find products that need to be removed from Ovoko
    async findProductsToRemoveFromOvoko(changes, ovokoProducts) {
        console.log('\n🔍 Finding products to remove from Ovoko...');
        console.log(`📦 Total Ovoko products: ${ovokoProducts.length}`);
        console.log(`📊 Changes detected:`);
        console.log(`  - Removed products: ${changes.removed_products.length}`);
        console.log(`  - Stock changes to 0: ${changes.stock_changes.filter(c => c.current === 0).length}`);
        
        const productsToRemove = [];
        
        // Check removed products
        console.log('\n🔍 Checking removed products...');
        for (const removed of changes.removed_products) {
            const ovokoProduct = ovokoProducts.find(p => 
                (p.sku === removed.sku) || (p.external_id === removed.sku)
            );
            
            if (ovokoProduct) {
                console.log(`  ✅ Found ${removed.sku} in Ovoko (will remove)`);
                productsToRemove.push({
                    ...ovokoProduct,
                    reason: removed.reason,
                    baselinker_info: removed.last_known
                });
            } else {
                console.log(`  ❌ ${removed.sku} not found in Ovoko (no need to remove)`);
            }
        }

        // Check products with stock = 0
        console.log('\n🔍 Checking products with stock = 0...');
        for (const stockChange of changes.stock_changes) {
            if (stockChange.current === 0) {
                const ovokoProduct = ovokoProducts.find(p => 
                    (p.sku === stockChange.sku) || (p.external_id === stockChange.sku)
                );
                
                if (ovokoProduct) {
                    console.log(`  ✅ Found ${stockChange.sku} in Ovoko with stock 0 (will remove)`);
                    productsToRemove.push({
                        ...ovokoProduct,
                        reason: `Stock changed to 0 (was ${stockChange.previous})`,
                        baselinker_info: stockChange
                    });
                } else {
                    console.log(`  ❌ ${stockChange.sku} not found in Ovoko with stock 0 (no need to remove)`);
                }
            }
        }

        console.log(`\n📋 Summary: Found ${productsToRemove.length} products to remove from Ovoko`);
        if (productsToRemove.length > 0) {
            console.log('Products to remove:');
            productsToRemove.forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.sku} - ${p.reason}`);
            });
        }
        
        return productsToRemove;
    }

    // Remove products from Ovoko
    async removeProductsFromOvoko(productsToRemove) {
        console.log(`\n🗑️  Starting removal of ${productsToRemove.length} products from Ovoko...`);
        
        if (productsToRemove.length === 0) {
            console.log('📋 No products to remove from Ovoko');
            return { successful: [], failed: [], total: 0 };
        }
        
        const results = {
            successful: [],
            failed: [],
            total: productsToRemove.length
        };

        for (let i = 0; i < productsToRemove.length; i++) {
            const product = productsToRemove[i];
            const partId = product.part_id || product.id;
            
            console.log(`\n${i + 1}/${productsToRemove.length}: Processing ${product.sku}`);
            console.log(`  SKU: ${product.sku}`);
            console.log(`  Part ID: ${partId}`);
            console.log(`  Reason: ${product.reason}`);
            
            if (!partId) {
                console.log(`⚠️  Skipping product ${product.sku} - no part_id found`);
                results.failed.push({
                    ...product,
                    error: 'No part_id found'
                });
                continue;
            }

            try {
                console.log(`  🗑️  Sending delete request to Ovoko...`);
                const result = await this.makeOvokoDeleteRequest(partId);
                results.successful.push({
                    ...product,
                    delete_result: result
                });
                
                console.log(`✅ Successfully removed: ${product.sku}`);
                
            } catch (error) {
                console.error(`❌ Failed to remove ${product.sku}:`, error.message);
                results.failed.push({
                    ...product,
                    error: error.message
                });
            }

            if (i < productsToRemove.length - 1) {
                console.log(`  ⏳ Waiting ${this.requestDelay}ms before next request...`);
                await new Promise(resolve => setTimeout(resolve, this.requestDelay));
            }
        }

        console.log(`\n📊 Removal results:`);
        console.log(`  ✅ Successful: ${results.successful.length}`);
        console.log(`  ❌ Failed: ${results.failed.length}`);
        console.log(`  📋 Total: ${results.total}`);

        return results;
    }

    // Save current inventory and update latest file
    async saveCurrentInventory(products) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `baselinker_products_${timestamp}.json`;
            
            // Save to timestamped file for history
            await fs.writeFile(filename, JSON.stringify(products, null, 2), 'utf8');
            
            // Update the latest file with current data (keeping original format)
            await fs.writeFile(this.latestBaselinkerFile, JSON.stringify(products, null, 2), 'utf8');
            
            console.log(`💾 Current inventory saved to: ${filename}`);
            console.log(`💾 Latest inventory updated: ${this.latestBaselinkerFile}`);
            
            return filename;
        } catch (error) {
            throw new Error(`Error saving inventory: ${error.message}`);
        }
    }

    // Save changes log
    async saveChangesLog(changes, timestamp) {
        try {
            const changesLog = {
                timestamp: timestamp,
                changes: changes,
                summary: {
                    new_products: changes.new_products.length,
                    removed_products: changes.removed_products.length,
                    stock_changes: changes.stock_changes.length,
                    unchanged_products: changes.unchanged_products.length
                }
            };
            
            await fs.writeFile(this.changesLogFile, JSON.stringify(changesLog, null, 2), 'utf8');
            console.log(`📝 Changes log saved to: ${this.changesLogFile}`);
            
        } catch (error) {
            console.error('Error saving changes log:', error.message);
        }
    }

    // Update sync status with changes
    async updateSyncStatus(changes, removalResults) {
        try {
            const syncStatusFile = 'sync_status.json';
            let syncStatus = { last_updated: new Date().toISOString(), synced_products: {}, synced_orders: {} };
            
            // Load existing sync status if available
            try {
                const data = await fs.readFile(syncStatusFile, 'utf8');
                syncStatus = JSON.parse(data);
            } catch (error) {
                console.log('📄 No existing sync status found, creating new one...');
            }
            
            // Get list of successfully removed products from Ovoko
            const successfullyRemovedSkus = removalResults.successful.map(p => p.sku);
            const failedRemovalSkus = removalResults.failed.map(p => p.sku);
            
            // Remove products that are out of stock (stock = 0) ONLY if they were successfully removed from Ovoko
            for (const stockChange of changes.stock_changes) {
                if (stockChange.current === 0 && syncStatus.synced_products[stockChange.sku]) {
                    if (successfullyRemovedSkus.includes(stockChange.sku)) {
                        console.log(`🗑️  Removing ${stockChange.sku} from sync status (out of stock and successfully removed from Ovoko)`);
                        delete syncStatus.synced_products[stockChange.sku];
                    } else if (failedRemovalSkus.includes(stockChange.sku)) {
                        console.log(`⚠️  Keeping ${stockChange.sku} in sync status (out of stock but failed to remove from Ovoko)`);
                    } else {
                        console.log(`⚠️  Keeping ${stockChange.sku} in sync status (out of stock but not found in Ovoko removal list)`);
                    }
                }
            }
            
            // Remove products that were completely removed from BaseLinker ONLY if they were successfully removed from Ovoko
            for (const removedProduct of changes.removed_products) {
                if (syncStatus.synced_products[removedProduct.sku]) {
                    if (successfullyRemovedSkus.includes(removedProduct.sku)) {
                        console.log(`🗑️  Removing ${removedProduct.sku} from sync status (removed from BaseLinker and successfully removed from Ovoko)`);
                        delete syncStatus.synced_products[removedProduct.sku];
                    } else if (failedRemovalSkus.includes(removedProduct.sku)) {
                        console.log(`⚠️  Keeping ${removedProduct.sku} in sync status (removed from BaseLinker but failed to remove from Ovoko)`);
                    } else {
                        console.log(`⚠️  Keeping ${removedProduct.sku} in sync status (removed from BaseLinker but not found in Ovoko removal list)`);
                    }
                }
            }
            
            // Update last_updated timestamp
            syncStatus.last_updated = new Date().toISOString();
            
            // Save updated sync status
            await fs.writeFile(syncStatusFile, JSON.stringify(syncStatus, null, 2), 'utf8');
            console.log(`💾 Sync status updated: ${Object.keys(syncStatus.synced_products).length} products in sync`);
            
        } catch (error) {
            console.error('Error updating sync status:', error.message);
        }
    }

    // Main synchronization method
    async runSmartSync() {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        
        try {
            console.log('🚀 Starting SMART inventory synchronization...');
            console.log('📊 BaseLinker ↔ Ovoko (Intelligent Sync)');
            console.log('=' .repeat(60));
            
            // Step 1: Get current BaseLinker inventory
            console.log('\n📦 STEP 1: Getting current BaseLinker inventory...');
            const currentInventory = await this.getCurrentBaselinkerInventory();
            
            // Step 2: Load last known inventory
            console.log('\n📚 STEP 2: Loading last known inventory...');
            const lastInventory = await this.loadLastBaselinkerInventory();
            
            // Step 3: Analyze changes
            console.log('\n🔍 STEP 3: Analyzing inventory changes...');
            const changes = await this.analyzeInventoryChanges(currentInventory, lastInventory);
            
            // Step 4: Load Ovoko products
            console.log('\n📤 STEP 4: Loading Ovoko products...');
            const ovokoProducts = await this.loadOvokoProducts();
            console.log(`📦 Loaded ${ovokoProducts.length} products from Ovoko`);
            
            // Step 5: Find products to remove
            console.log('\n🗑️  STEP 5: Finding products to remove from Ovoko...');
            const productsToRemove = await this.findProductsToRemoveFromOvoko(changes, ovokoProducts);
            
            // Step 6: Remove products from Ovoko
            let removalResults = { successful: [], failed: [], total: 0 };
            if (productsToRemove.length > 0) {
                console.log('\n🗑️  STEP 6: Removing products from Ovoko...');
                console.log(`📋 Products to remove: ${productsToRemove.map(p => p.sku).join(', ')}`);
                removalResults = await this.removeProductsFromOvoko(productsToRemove);
            } else {
                console.log('\n✅ STEP 6: No products to remove from Ovoko');
                removalResults = { successful: [], failed: [], total: 0 };
            }
            
            // Step 7: Save current inventory for next comparison
            console.log('\n💾 STEP 7: Saving current inventory...');
            await this.saveCurrentInventory(currentInventory);
            
            // Step 8: Save changes log
            console.log('\n📝 STEP 8: Saving changes log...');
            await this.saveChangesLog(changes, timestamp);
            
            // Step 9: Update sync status (AFTER removing from Ovoko)
            console.log('\n🔄 STEP 9: Updating sync status...');
            console.log(`📊 Removal results for sync status update:`);
            console.log(`  - Successful: ${removalResults.successful.length}`);
            console.log(`  - Failed: ${removalResults.failed.length}`);
            console.log(`  - Total: ${removalResults.total}`);
            await this.updateSyncStatus(changes, removalResults);
            
            // Step 10: Generate final report
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000);
            
            const report = {
                timestamp: timestamp,
                duration: duration,
                current_inventory: {
                    total_products: Object.keys(currentInventory).length,
                    inventories: Object.values(currentInventory).reduce((acc, item) => {
                        acc[item.inventory_name] = (acc[item.inventory_name] || 0) + 1;
                        return acc;
                    }, {})
                },
                last_inventory: {
                    total_products: Object.keys(lastInventory).length
                },
                changes: changes,
                ovoko_products: {
                    before: ovokoProducts.length,
                    after: ovokoProducts.length - removalResults.successful.length
                },
                removal_results: removalResults,
                summary: {
                    new_products: changes.new_products.length,
                    removed_products: changes.removed_products.length,
                    stock_changes: changes.stock_changes.length,
                    products_removed_from_ovoko: removalResults.successful.length,
                    products_failed_removal: removalResults.failed.length
                }
            };
            
            // Save detailed report
            const reportFilename = `smart_sync_report_${timestamp.replace(/[:.]/g, '-')}.json`;
            await fs.writeFile(reportFilename, JSON.stringify(report, null, 2), 'utf8');
            
            console.log('\n🎉 SMART SYNCHRONIZATION COMPLETED SUCCESSFULLY!');
            console.log('=' .repeat(60));
            console.log(`⏱️  Duration: ${duration} seconds`);
            console.log(`📊 Report saved to: ${reportFilename}`);
            console.log(`📦 Current inventory: ${report.current_inventory.total_products} products`);
            console.log(`🔄 Changes detected: ${changes.new_products.length + changes.removed_products.length + changes.stock_changes.length}`);
            console.log(`🗑️  Products removed from Ovoko: ${report.summary.products_removed_from_ovoko}`);
            console.log(`❌ Products failed removal: ${report.summary.products_failed_removal}`);
            
            return report;
            
        } catch (error) {
            console.error('\n💥 SMART SYNCHRONIZATION FAILED!');
            console.error('Error:', error.message);
            
            const errorReport = {
                timestamp: timestamp,
                error: error.message,
                stack: error.stack
            };
            
            const errorFilename = `smart_sync_error_${timestamp.replace(/[:.]/g, '-')}.json`;
            await fs.writeFile(errorFilename, JSON.stringify(errorReport, null, 2), 'utf8');
            
            console.error(`📄 Error report saved to: ${errorFilename}`);
            
            throw error;
        }
    }
}

// Configuration
const CONFIG = {
    baselinkerToken: '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F',
    ovoko: {
        username: 'bavarian',
        password: '5J1iod3cY6zUCkid',
        userToken: 'dcf1fb235513c6d36b7a700defdee8ab'
    }
};

// Main execution
async function main() {
    const synchronizer = new SmartInventorySynchronizer(
        CONFIG.baselinkerToken,
        CONFIG.ovoko
    );
    
    try {
        const result = await synchronizer.runSmartSync();
        
        if (result) {
            console.log('\n🏆 Smart synchronization completed successfully!');
        }
        
    } catch (error) {
        console.error('\n💀 Smart synchronization failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { SmartInventorySynchronizer }; 