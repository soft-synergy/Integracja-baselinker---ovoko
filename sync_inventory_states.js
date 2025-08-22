const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');

class InventoryStateSynchronizer {
    constructor(baselinkerToken, ovokoCredentials) {
        this.baselinkerToken = baselinkerToken;
        this.ovokoCredentials = ovokoCredentials;
        this.baselinkerApiUrl = 'https://api.baselinker.com/connector.php';
        this.ovokoDeleteApiUrl = 'https://api.rrr.lt/crm/deletePart';
        this.requestDelay = 1000; // Delay between requests to avoid rate limiting
    }

    // BaseLinker API methods
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

    // Get current inventory states from BaseLinker
    async getCurrentInventoryStates() {
        try {
            console.log('📦 Fetching current inventory states from BaseLinker...');
            
            const inventories = await this.makeBaseLinkerRequest('getInventories');
            const inventoryStates = {};

            for (const inventory of inventories.inventories || []) {
                console.log(`\n🔍 Checking inventory: ${inventory.name} (ID: ${inventory.inventory_id})`);
                
                try {
                    const products = await this.makeBaseLinkerRequest('getInventoryProductsList', {
                        inventory_id: inventory.inventory_id
                    });

                    if (products.products) {
                        const productList = Object.values(products.products);
                        console.log(`  Found ${productList.length} products in this inventory`);
                        
                        for (const product of productList) {
                            const productId = product.product_id || product.id;
                            const sku = product.sku;
                            const stock = product.stock || 0;
                            
                            if (productId && sku) {
                                inventoryStates[sku] = {
                                    product_id: productId,
                                    stock: stock,
                                    inventory_id: inventory.inventory_id,
                                    inventory_name: inventory.name
                                };
                            }
                        }
                    }
                    
                    // Add delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, this.requestDelay));
                    
                } catch (error) {
                    console.error(`  Error processing inventory ${inventory.name}:`, error.message);
                }
            }

            console.log(`\n📊 Total products with inventory states: ${Object.keys(inventoryStates).length}`);
            return inventoryStates;

        } catch (error) {
            throw new Error(`Error fetching inventory states: ${error.message}`);
        }
    }

    // Load existing Ovoko products (you'll need to create this file)
    async loadOvokoProducts(filename = 'ovoko_products.json') {
        try {
            const data = await fs.readFile(filename, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.log(`⚠️  Could not load ${filename}, starting with empty list`);
            return [];
        }
    }

    // Check which products need to be removed (no stock in BaseLinker)
    async findProductsToRemove(baselinkerStates, ovokoProducts) {
        const productsToRemove = [];
        
        console.log('\n🔍 Analyzing products for removal...');
        
        for (const ovokoProduct of ovokoProducts) {
            const sku = ovokoProduct.sku || ovokoProduct.external_id;
            const baselinkerState = baselinkerStates[sku];
            
            if (!baselinkerState) {
                console.log(`❌ Product ${sku} not found in BaseLinker - will be removed`);
                productsToRemove.push({
                    ...ovokoProduct,
                    reason: 'Not found in BaseLinker'
                });
            } else if (baselinkerState.stock <= 0) {
                console.log(`❌ Product ${sku} has no stock (${baselinkerState.stock}) in BaseLinker - will be removed`);
                productsToRemove.push({
                    ...ovokoProduct,
                    reason: `No stock (${baselinkerState.stock}) in ${baselinkerState.inventory_name}`,
                    baselinker_state: baselinkerState
                });
            } else {
                console.log(`✅ Product ${sku} has stock ${baselinkerState.stock} in ${baselinkerState.inventory_name}`);
            }
        }
        
        console.log(`\n📋 Found ${productsToRemove.length} products to remove`);
        return productsToRemove;
    }

    // Remove products from Ovoko
    async removeProductsFromOvoko(productsToRemove) {
        console.log(`\n🗑️  Starting removal of ${productsToRemove.length} products from Ovoko...`);
        
        const results = {
            successful: [],
            failed: [],
            total: productsToRemove.length
        };

        for (let i = 0; i < productsToRemove.length; i++) {
            const product = productsToRemove[i];
            const partId = product.part_id || product.id;
            
            if (!partId) {
                console.log(`⚠️  Skipping product ${product.sku} - no part_id found`);
                results.failed.push({
                    ...product,
                    error: 'No part_id found'
                });
                continue;
            }

            try {
                console.log(`\n${i + 1}/${productsToRemove.length}: Removing ${product.sku} (Part ID: ${partId})`);
                console.log(`Reason: ${product.reason}`);
                
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

            // Add delay between requests
            if (i < productsToRemove.length - 1) {
                await new Promise(resolve => setTimeout(resolve, this.requestDelay));
            }
        }

        return results;
    }

    // Main synchronization method
    async synchronizeInventoryStates() {
        const startTime = Date.now();
        
        try {
            console.log('🚀 Starting inventory state synchronization...');
            console.log('📊 BaseLinker → Ovoko');
            
            // Step 1: Get current states from BaseLinker
            const baselinkerStates = await this.getCurrentInventoryStates();
            
            // Step 2: Load existing Ovoko products
            const ovokoProducts = await this.loadOvokoProducts();
            
            if (ovokoProducts.length === 0) {
                console.log('⚠️  No Ovoko products found to synchronize');
                return {
                    success: false,
                    message: 'No Ovoko products found'
                };
            }
            
            console.log(`📦 Loaded ${ovokoProducts.length} products from Ovoko`);
            
            // Step 3: Find products to remove
            const productsToRemove = await this.findProductsToRemove(baselinkerStates, ovokoProducts);
            
            if (productsToRemove.length === 0) {
                console.log('✅ All products are in sync - no removal needed');
                return {
                    success: true,
                    message: 'All products are in sync',
                    baselinker_products: Object.keys(baselinkerStates).length,
                    ovoko_products: ovokoProducts.length,
                    products_to_remove: 0
                };
            }
            
            // Step 4: Remove products from Ovoko
            const removalResults = await this.removeProductsFromOvoko(productsToRemove);
            
            // Step 5: Generate report
            const endTime = Date.now();
            const duration = Math.round((endTime - startTime) / 1000);
            
            const report = {
                success: true,
                duration: duration,
                baselinker_products: Object.keys(baselinkerStates).length,
                ovoko_products_before: ovokoProducts.length,
                ovoko_products_after: ovokoProducts.length - removalResults.successful.length,
                products_removed: removalResults.successful.length,
                products_failed: removalResults.failed.length,
                removal_results: removalResults
            };
            
            // Save detailed report
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportFilename = `inventory_sync_report_${timestamp}.json`;
            await fs.writeFile(reportFilename, JSON.stringify(report, null, 2), 'utf8');
            
            console.log(`\n🎉 Synchronization completed in ${duration} seconds!`);
            console.log(`📊 Report saved to: ${reportFilename}`);
            console.log(`✅ Products removed: ${report.products_removed}`);
            console.log(`❌ Products failed: ${report.products_failed}`);
            
            return report;
            
        } catch (error) {
            console.error('💥 Synchronization failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Configuration
const CONFIG = {
    baselinkerToken: '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F',
    ovoko: {
        username: 'bmw@bavariaparts.pl',
        password: 'Karawan1!',
        userToken: 'dcf1fb235513c6d36b7a700defdee8ab'
    }
};

// Main execution
async function main() {
    const synchronizer = new InventoryStateSynchronizer(
        CONFIG.baselinkerToken,
        CONFIG.ovoko
    );
    
    try {
        const result = await synchronizer.synchronizeInventoryStates();
        
        if (result.success) {
            console.log('\n🏆 Synchronization completed successfully!');
        } else {
            console.error('\n💀 Synchronization failed:', result.error || result.message);
        }
        
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { InventoryStateSynchronizer }; 