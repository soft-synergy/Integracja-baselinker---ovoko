const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');

class BaseLinkerClient {
    constructor(token) {
        this.token = token;
        this.apiUrl = 'https://api.baselinker.com/connector.php';
        this.requestDelay = 1000;
    }

    async makeApiRequest(method, parameters = {}) {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams();
            postData.append('token', this.token);
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
                            reject(new Error(`API Error: ${response.error_message || JSON.stringify(response)}`));
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

    async testConnection() {
        try {
            const response = await this.makeApiRequest('getInventories');
            return response;
        } catch (error) {
            throw error;
        }
    }

    async getInventories() {
        try {
            const response = await this.makeApiRequest('getInventories');
            const inventories = {};
            if (response.inventories && Array.isArray(response.inventories)) {
                response.inventories.forEach(inv => {
                    inventories[inv.inventory_id] = inv.name;
                });
            }
            return inventories;
        } catch (error) {
            throw new Error(`Error fetching inventories: ${error.message}`);
        }
    }

    async getInventoryProductsList(inventoryId) {
        try {
            const parameters = {
                inventory_id: inventoryId
            };
            const response = await this.makeApiRequest('getInventoryProductsList', parameters);
        
            if (response.products) {
                if (typeof response.products === 'object' && !Array.isArray(response.products)) {
                    return Object.entries(response.products).map(([id, product]) => ({
                        ...product,
                        id: product.id || Number(id)
                    }));
                } else if (Array.isArray(response.products)) {
                    return response.products;
                }
            }

            if (response && typeof response === 'object' && !response.status) {
                return Object.values(response);
            }

            return [];
        } catch (error) {
            throw new Error(`Error fetching inventory products: ${error.message}`);
        }
    }

    async getInventoryProductsData(products, inventoryId) {
        try {
            const parameters = {
                inventory_id: inventoryId,
                products: products
            };
            const response = await this.makeApiRequest('getInventoryProductsData', parameters);

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

    async getAllProducts() {
        console.log('Starting to fetch products from warehouse ID: 4376 only...');
        try {
            // Only use the specific warehouse ID 4376
            const inventories = { '4376': 'Warehouse 4376' };
            console.log('Target warehouse: ID 4376');

            const allProducts = [];

            for (const [inventoryId, inventoryName] of Object.entries(inventories)) {
                console.log(`\nFetching products from: ${inventoryName} (ID: ${inventoryId})`);
                try {
                    // Try paginated approach first
                    let page = 1;
                    let hasMoreProducts = true;
                    const pageSize = 1000; // Baselinker default page size
                    
                    while (hasMoreProducts) {
                        console.log(`Fetching page ${page}...`);
                        try {
                            const parameters = {
                                inventory_id: inventoryId,
                                page: page,
                                get_products: 1
                            };
                            
                            const response = await this.makeApiRequest('getInventoryProductsList', parameters);
                            console.log(response)
                            
                   
                            if (response.products && Object.keys(response.products).length > 0) {
                                const products = Object.entries(response.products).map(([id, product]) => ({
                                    ...product,
                                    id: product.id || Number(id)
                                }));
                                console.log(`Page ${page}: Found ${products.length} products, fetching full data...`);
                                
                                // Get full product data including images
                                const productIds = products.map(p => p.product_id || p.id).filter(Boolean);
                                if (productIds.length > 0) {
                                    try {
                                        const fullProductsData = await this.getInventoryProductsData(productIds, inventoryId);
                                        // Preserve IDs from the response map and add baselinker_id for consistency
                                        const fullProducts = Object.entries(fullProductsData).map(([idKey, prod]) => {
                                            const baselinkerId = prod.product_id || prod.id || Number(idKey);
                                            return {
                                                ...prod,
                                                id: prod.id || baselinkerId,
                                                baselinker_id: prod.baselinker_id || baselinkerId
                                            };
                                        });
                                        
                                        fullProducts.forEach(product => {
                                            product.inventory_id = inventoryId;
                                            product.inventory_name = inventoryName;
                                        });
                                        
                                        allProducts.push(...fullProducts);
                                        console.log(`Page ${page}: Added ${fullProducts.length} products with full data`);
                                    } catch (error) {
                                        console.log(`Failed to get full data for page ${page}: ${error.message}`);
                                        // Fallback to basic data
                                        products.forEach(product => {
                                            product.inventory_id = inventoryId;
                                            product.inventory_name = inventoryName;
                                        });
                                        allProducts.push(...products);
                                        console.log(`Page ${page}: Added ${products.length} products with basic data`);
                                    }
                                }
                                
                                // Check if we have more products
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
                            console.log(`Page ${page} failed: ${error.message}`);
                            hasMoreProducts = false;
                        }
                    }
                    
                    // If paginated approach didn't work, try direct method
                    if (allProducts.filter(p => p.inventory_id === inventoryId).length === 0) {
                        try {
                            console.log('Trying direct getInventoryProductsData...');
                            const productsResponse = await this.makeApiRequest('getInventoryProductsData', {
                                inventory_id: inventoryId
                            });

                            if (productsResponse.products && Object.keys(productsResponse.products).length > 0) {
                                const products = Object.entries(productsResponse.products).map(([id, product]) => ({
                                    ...product,
                                    id: product.id || Number(id)
                                }));
                                products.forEach(product => {
                                    product.inventory_id = inventoryId;
                                    product.inventory_name = inventoryName;
                                });
                                allProducts.push(...products);
                                console.log(`Direct method added ${products.length} products`);
                            }
                        } catch (error) {
                            console.log(`Direct method failed: ${error.message}`);
                        }
                    }
                    
                } catch (error) {
                    console.error(`Error processing inventory ${inventoryName}:`, error.message);
                }
                await new Promise(resolve => setTimeout(resolve, this.requestDelay));
            }

            console.log(`\nTotal products fetched: ${allProducts.length}`);
            return allProducts;

        } catch (error) {
            throw new Error(`Error fetching all products: ${error.message}`);
        }
    }

    async getExternalStorageProducts() {
        try {
            const response = await this.makeApiRequest('getProductsList');
            if (response.products && typeof response.products === 'object' && !Array.isArray(response.products)) {
                return Object.entries(response.products).map(([id, product]) => ({
                    ...product,
                    id: product.id || Number(id)
                }));
            }
            return response.products || [];
        } catch (error) {
            return [];
        }
    }

    async fetchAllProductsUniversal() {
        console.log('Starting product fetch from warehouse ID: 4376 only...');
        let allProducts = [];

        try {
            console.log('\n=== Fetching products from warehouse 4376 ===');
            const inventoryProducts = await this.getAllProducts();
            allProducts.push(...inventoryProducts);
            console.log(`Warehouse 4376 products found: ${inventoryProducts.length}`);
        } catch (error) {
            console.log('Failed to fetch from warehouse 4376:', error.message);
        }

        // Only fetch from warehouse 4376, skip other methods

        const uniqueProducts = allProducts.filter((product, index, self) => {
            const productId = product.product_id || product.id || product.sku;
            return productId && self.findIndex(p =>
                (p.product_id || p.id || p.sku) === productId
            ) === index;
        });

        // Add a unified Baselinker identifier to each product in the final output
        const normalizedProducts = uniqueProducts.map(product => {
            const baselinkerId = product.product_id || product.id || null;
            if (!baselinkerId) {
                return product;
            }
            const ensured = { ...product };
            if (!ensured.baselinker_id) {
                ensured.baselinker_id = baselinkerId;
            }
            if (!ensured.id) {
                ensured.id = baselinkerId;
            }
            return ensured;
        });

        console.log(`\nTotal unique products found: ${normalizedProducts.length}`);
        return normalizedProducts;
    }

    async saveProductsToFile(products, filename) {
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `baselinker_products_${timestamp}.json`;
        }

        try {
            // Final safeguard: ensure every product carries BaseLinker ID fields
            const productsToSave = products.map(product => {
                const baselinkerId = product.product_id || product.id || null;
                if (!baselinkerId) return product;
                return {
                    ...product,
                    id: product.id || baselinkerId,
                    baselinker_id: product.baselinker_id || baselinkerId
                };
            });

            const jsonData = JSON.stringify(productsToSave, null, 2);
            // Save to the specified filename
            await fs.writeFile(filename, jsonData, 'utf8');
            // Also save to baselinker_products_latest.json
            await fs.writeFile('baselinker_products_latest.json', jsonData, 'utf8');
            console.log(`\n✅ Products saved to: ${filename}`);
            console.log(`📦 Products count: ${productsToSave.length}`);
            console.log(`📝 Also saved to: baselinker_products_latest.json`);
            return filename;
        } catch (error) {
            throw new Error(`Error saving file: ${error.message}`);
        }
    }

    async fetchEverything(filename) {
        const startTime = Date.now();

        try {
            console.log('🔌 Testing API connection...');
            await this.testConnection();
            console.log('✅ Connection successful!');

            console.log('📦 Fetching all products...');
            const products = await this.fetchAllProductsUniversal();

            if (products.length > 0) {
                const savedFilename = await this.saveProductsToFile(products, filename);

                const endTime = Date.now();
                const duration = Math.round((endTime - startTime) / 1000);

                console.log(`\n🎉 SUCCESS!`);
                console.log(`⏱️  Duration: ${duration} seconds`);
                console.log(`📄 File: ${savedFilename}`);
                console.log(`📦 Products count: ${products.length}`);

                return {
                    success: true,
                    filename: savedFilename,
                    productCount: products.length,
                    duration: duration,
                    products: products
                };
            } else {
                console.log('❌ No products found with any method');
                return {
                    success: false,
                    message: 'No products found',
                    productCount: 0
                };
            }

        } catch (error) {
            console.error('💥 Fatal error:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

async function fetchAllProducts(token, filename) {
    const client = new BaseLinkerClient(token);
    return await client.fetchEverything(filename);
}

module.exports = {
    BaseLinkerClient,
    fetchAllProducts
};

if (require.main === module) {
    const BASELINKER_TOKEN = '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F';

    const client = new BaseLinkerClient(BASELINKER_TOKEN);

    client.fetchEverything()
        .then(result => {
            if (result.success) {
                console.log('\n🏆 DONE! Check your products file.');
            } else {
                console.error('💀 Failed:', result.error || result.message);
            }
        })
        .catch(error => {
            console.error('💥 Crash:', error.message);
        });
}