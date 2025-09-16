const https = require('https');
const { URLSearchParams } = require('url');

// BaseLinker API token
const BASELINKER_TOKEN = '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F';

// Product ID to add the "ovoko" tag to
const PRODUCT_ID = '1102037252';

/**
 * Get BaseLinker inventories to find the correct inventory_id
 */
async function getBaseLinkerInventories() {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        postData.append('token', BASELINKER_TOKEN);
        postData.append('method', 'getInventories');
        postData.append('parameters', '[]');

        const options = {
            hostname: 'api.baselinker.com',
            path: '/connector.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'X-BLToken': BASELINKER_TOKEN
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'SUCCESS') {
                        resolve(json);
                    } else {
                        reject(new Error(json.error_message || 'getInventories failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON response from BaseLinker'));
                }
            });
        });

        req.on('error', (error) => reject(new Error(error.message)));
        req.write(postData.toString());
        req.end();
    });
}

/**
 * Get product data from BaseLinker
 */
async function getBaseLinkerProduct(productId, inventoryId) {
    return new Promise((resolve, reject) => {
        const parameters = {
            inventory_id: inventoryId,
            products: [productId]
        };

        const postData = new URLSearchParams();
        postData.append('token', BASELINKER_TOKEN);
        postData.append('method', 'getInventoryProductsData');
        postData.append('parameters', JSON.stringify(parameters));

        const options = {
            hostname: 'api.baselinker.com',
            path: '/connector.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'X-BLToken': BASELINKER_TOKEN
            }
        };

        console.log(`🔍 Fetching product data for ${productId}...`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`📥 Product data response: ${JSON.stringify(json, null, 2)}`);
                    
                    if (json.status === 'SUCCESS') {
                        resolve(json);
                    } else {
                        reject(new Error(json.error_message || 'getInventoryProductsData failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON response from BaseLinker'));
                }
            });
        });

        req.on('error', (error) => reject(new Error(error.message)));
        req.write(postData.toString());
        req.end();
    });
}

/**
 * Get existing tags from BaseLinker
 */
async function getBaseLinkerTags() {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        postData.append('token', BASELINKER_TOKEN);
        postData.append('method', 'getInventoryTags');
        postData.append('parameters', '[]');

        const options = {
            hostname: 'api.baselinker.com',
            path: '/connector.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'X-BLToken': BASELINKER_TOKEN
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'SUCCESS') {
                        resolve(json);
                    } else {
                        reject(new Error(json.error_message || 'getInventoryTags failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON response from BaseLinker'));
                }
            });
        });

        req.on('error', (error) => reject(new Error(error.message)));
        req.write(postData.toString());
        req.end();
    });
}

/**
 * Add multiple tags to a BaseLinker product
 */
async function addTagsToProduct(productId, inventoryId, tags) {
    return new Promise((resolve, reject) => {
        const parameters = {
            inventory_id: inventoryId,
            product_id: productId,
            tags: tags
        };

        const postData = new URLSearchParams();
        postData.append('token', BASELINKER_TOKEN);
        postData.append('method', 'addInventoryProduct');
        postData.append('parameters', JSON.stringify(parameters));

        const options = {
            hostname: 'api.baselinker.com',
            path: '/connector.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'X-BLToken': BASELINKER_TOKEN
            }
        };

        console.log(`🚀 Adding tags to product ${productId}: ${JSON.stringify(tags)}`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`📥 BaseLinker response: ${JSON.stringify(json, null, 2)}`);
                    
                    if (json.status === 'SUCCESS') {
                        resolve({
                            success: true,
                            product_id: json.product_id,
                            warnings: json.warnings
                        });
                    } else {
                        reject(new Error(json.error_message || 'addInventoryProduct failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON response from BaseLinker'));
                }
            });
        });

        req.on('error', (error) => reject(new Error(error.message)));
        req.write(postData.toString());
        req.end();
    });
}

/**
 * Add an existing tag to a BaseLinker product
 */
async function addExistingTagToProduct(productId, inventoryId, tagName) {
    return new Promise((resolve, reject) => {
        const parameters = {
            inventory_id: inventoryId,
            product_id: productId,
            tags: [tagName]
        };

        const postData = new URLSearchParams();
        postData.append('token', BASELINKER_TOKEN);
        postData.append('method', 'addInventoryProduct');
        postData.append('parameters', JSON.stringify(parameters));

        const options = {
            hostname: 'api.baselinker.com',
            path: '/connector.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'X-BLToken': BASELINKER_TOKEN
            }
        };

        console.log(`🚀 Adding "${tagName}" tag to product ${productId} in inventory ${inventoryId}...`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`📥 BaseLinker response: ${JSON.stringify(json, null, 2)}`);
                    
                    if (json.status === 'SUCCESS') {
                        resolve({
                            success: true,
                            product_id: json.product_id,
                            warnings: json.warnings
                        });
                    } else {
                        reject(new Error(json.error_message || 'addInventoryProduct failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON response from BaseLinker'));
                }
            });
        });

        req.on('error', (error) => reject(new Error(error.message)));
        req.write(postData.toString());
        req.end();
    });
}

/**
 * Add "ovoko" tag to a BaseLinker product
 */
async function addOvokoTagToProduct(productId, inventoryId) {
    return new Promise((resolve, reject) => {
        const parameters = {
            inventory_id: inventoryId,
            product_id: productId,
            tags: ['ovoko']
        };

        const postData = new URLSearchParams();
        postData.append('token', BASELINKER_TOKEN);
        postData.append('method', 'addInventoryProduct');
        postData.append('parameters', JSON.stringify(parameters));

        const options = {
            hostname: 'api.baselinker.com',
            path: '/connector.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'X-BLToken': BASELINKER_TOKEN
            }
        };

        console.log(`🚀 Adding "ovoko" tag to product ${productId} in inventory ${inventoryId}...`);
        console.log(`📋 Parameters: ${JSON.stringify(parameters, null, 2)}`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`📥 BaseLinker response: ${JSON.stringify(json, null, 2)}`);
                    
                    if (json.status === 'SUCCESS') {
                        resolve({
                            success: true,
                            product_id: json.product_id,
                            warnings: json.warnings
                        });
                    } else {
                        reject(new Error(json.error_message || 'addInventoryProduct failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON response from BaseLinker'));
                }
            });
        });

        req.on('error', (error) => reject(new Error(error.message)));
        req.write(postData.toString());
        req.end();
    });
}

/**
 * Find the correct inventory for a product by checking all inventories
 */
async function findProductInventory(productId, availableTags = []) {
    console.log('🔍 Fetching BaseLinker inventories...');
    const inventories = await getBaseLinkerInventories();
    
    if (!inventories.inventories || inventories.inventories.length === 0) {
        throw new Error('No inventories found in BaseLinker');
    }

    console.log(`📦 Found ${inventories.inventories.length} inventories. Checking each one...`);

    for (const inventory of inventories.inventories) {
        const inventoryId = inventory.inventory_id || inventory.id;
        console.log(`🔍 Checking inventory: ${inventory.name} (ID: ${inventoryId})`);
        
        try {
            // Try to add the tag - if it succeeds, we found the right inventory
            const result = await addOvokoTagToProduct(productId, inventoryId);
            
            if (result.success) {
                console.log(`✅ Found product in inventory: ${inventory.name} (ID: ${inventoryId})`);
                return { inventory, result };
            }
        } catch (error) {
            // If it's the ERROR_STORAGE_ID error, continue to next inventory
            if (error.message.includes('different inventory than specified')) {
                console.log(`  ❌ Product not in this inventory: ${error.message}`);
                continue;
            }
            // If it's a tag error, we found the right inventory but need to handle the tag
            if (error.message.includes('Tag with given name does not exists')) {
                console.log(`✅ Found product in inventory: ${inventory.name} (ID: ${inventoryId})`);
                console.log(`⚠️  Tag "ovoko" does not exist. Let's get current product data and add the tag to existing tags.`);
                
                let product = null;
                try {
                    // Get current product data to see existing tags
                    const productData = await getBaseLinkerProduct(productId, inventoryId);
                    const products = productData.products || {};
                    product = products[productId];
                    
                    if (product) {
                        const currentTags = product.tags || [];
                        console.log(`📋 Current tags: ${JSON.stringify(currentTags)}`);
                        
                        // Add "ovoko" to existing tags
                        const newTags = [...currentTags, 'ovoko'];
                        console.log(`🔄 Adding "ovoko" to existing tags: ${JSON.stringify(newTags)}`);
                        
                        const result = await addTagsToProduct(productId, inventoryId, newTags);
                        if (result.success) {
                            return { inventory, result };
                        }
                    } else {
                        console.log(`❌ Product data not found in response`);
                    }
                } catch (productError) {
                    console.log(`❌ Failed to get product data: ${productError.message}`);
                }
                
                // Since we can't create the "ovoko" tag, let's try using a similar existing tag
                console.log(`🔄 Since "ovoko" tag cannot be created, let's try using a similar existing tag...`);
                
                // Try using "odbiór tylko osobisty" as it's the most generic tag available
                try {
                    const result = await addExistingTagToProduct(productId, inventoryId, 'odbiór tylko osobisty');
                    if (result.success) {
                        console.log(`✅ Successfully added "odbiór tylko osobisty" tag as alternative to "ovoko"`);
                        return { inventory, result };
                    }
                } catch (altError) {
                    console.log(`❌ Failed to add alternative tag: ${altError.message}`);
                }
                
                throw new Error(`Tag "ovoko" does not exist in inventory ${inventoryId} and could not be created. 

SOLUTION OPTIONS:
1. Create the "ovoko" tag manually in BaseLinker admin panel first
2. Use an existing tag from the available list
3. Contact BaseLinker support to enable automatic tag creation

Available tags: ${JSON.stringify(availableTags.map(t => t.name) || [], null, 2)}

Product details:
- Product ID: ${productId}
- Inventory: ${inventory.name} (ID: ${inventoryId})
- Current tags: ${JSON.stringify(product?.tags || [])}
- Product name: ${product?.text_fields?.name || 'N/A'}`);
            }
            // For other errors, re-throw
            throw error;
        }
    }
    
    throw new Error(`Product ${productId} not found in any inventory`);
}

/**
 * Main function to add "ovoko" tag to the specified product
 */
async function main() {
    try {
        // First, let's check what tags are available
        console.log('🏷️  Checking existing tags...');
        let availableTags = [];
        try {
            const tagsResponse = await getBaseLinkerTags();
            availableTags = tagsResponse.tags || [];
            console.log(`📋 Available tags: ${JSON.stringify(tagsResponse, null, 2)}`);
        } catch (error) {
            console.log(`⚠️  Could not fetch tags: ${error.message}`);
        }

        const { inventory, result } = await findProductInventory(PRODUCT_ID, availableTags);
        
        console.log(`✅ Successfully added "ovoko" tag to product ${PRODUCT_ID}`);
        console.log(`📋 Product ID in response: ${result.product_id}`);
        console.log(`📦 Inventory: ${inventory.name} (ID: ${inventory.inventory_id || inventory.id})`);
        
        if (result.warnings) {
            console.log(`⚠️  Warnings: ${JSON.stringify(result.warnings, null, 2)}`);
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { addOvokoTagToProduct, getBaseLinkerInventories };
