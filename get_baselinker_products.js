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
                    return Object.values(response.products);
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
        console.log('Starting to fetch all products...');
        try {
            let inventories = {};
            try {
                inventories = await this.getInventories();
                console.log('Available inventories:', Object.keys(inventories).length);
                Object.entries(inventories).forEach(([id, name]) => {
                    console.log(`  - Inventory ID: ${id}, Name: ${name}`);
                });
            } catch (error) {
                console.log('Could not fetch inventories, trying default approach...');
                inventories = { '': 'Default Inventory' };
            }

            const allProducts = [];

            for (const [inventoryId, inventoryName] of Object.entries(inventories)) {
                console.log(`\nFetching products from: ${inventoryName} (ID: ${inventoryId})`);
                try {
                    try {
                        console.log('Trying direct getInventoryProductsData...');
                        const productsResponse = await this.makeApiRequest('getInventoryProductsData', {
                            inventory_id: inventoryId
                        });

                        if (productsResponse.products && Object.keys(productsResponse.products).length > 0) {
                            const products = Object.values(productsResponse.products);
                            products.forEach(product => {
                                product.inventory_id = inventoryId;
                                product.inventory_name = inventoryName;
                            });
                            allProducts.push(...products);
                            console.log(`Direct method added ${products.length} products`);
                            continue;
                        }
                    } catch (error) {
                        console.log(`Direct method failed: ${error.message}`);
                    }

                    try {
                        console.log('Trying list approach...');
                        const productsList = await this.getInventoryProductsList(inventoryId);
                        console.log(`ProductsList type:`, typeof productsList, `length:`, productsList ? productsList.length : 'null');

                        if (productsList && productsList.length > 0) {
                            const batchSize = 100;
                            for (let i = 0; i < productsList.length; i += batchSize) {
                                const batch = productsList.slice(i, i + batchSize);
                                const productIds = batch.map(p => p.product_id || p.id).filter(Boolean);
                                if (productIds.length > 0) {
                                    console.log(`Fetching batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(productsList.length/batchSize)} (${productIds.length} products)`);
                                    try {
                                        const productsData = await this.getInventoryProductsData(productIds, inventoryId);
                                        const products = Object.values(productsData);
                                        products.forEach(product => {
                                            product.inventory_id = inventoryId;
                                            product.inventory_name = inventoryName;
                                        });
                                        allProducts.push(...products);
                                        console.log(`Added ${products.length} products to collection`);
                                    } catch (error) {
                                        console.error(`Error fetching batch data:`, error.message);
                                    }
                                    await new Promise(resolve => setTimeout(resolve, this.requestDelay));
                                }
                            }
                        }
                    } catch (error) {
                        console.log(`List approach failed: ${error.message}`);
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
                return Object.values(response.products);
            }
            return response.products || [];
        } catch (error) {
            return [];
        }
    }

    async fetchAllProductsUniversal() {
        console.log('Starting universal product fetch...');
        let allProducts = [];

        try {
            console.log('\n=== Trying Method 1: Inventory Products ===');
            const inventoryProducts = await this.getAllProducts();
            allProducts.push(...inventoryProducts);
            console.log(`Method 1 found: ${inventoryProducts.length} products`);
        } catch (error) {
            console.log('Method 1 failed:', error.message);
        }

        try {
            console.log('\n=== Trying Method 2: External Storage ===');
            const externalProducts = await this.getExternalStorageProducts();
            allProducts.push(...externalProducts);
            console.log(`Method 2 found: ${externalProducts.length} products`);
        } catch (error) {
            console.log('Method 2 failed:', error.message);
        }

        const apiMethods = [
            'getProducts',
            'getProductsData',
            'getCatalogProducts',
            'getInventoryProductsData'
        ];

        for (const method of apiMethods) {
            try {
                console.log(`\n=== Trying Method: ${method} ===`);
                const response = await this.makeApiRequest(method, {});
                if (response && response.products) {
                    let products = [];
                    if (Array.isArray(response.products)) {
                        products = response.products;
                    } else if (typeof response.products === 'object') {
                        products = Object.values(response.products);
                    }
                    allProducts.push(...products);
                    console.log(`${method} found: ${products.length} products`);
                } else if (response && typeof response === 'object' && !response.status) {
                    let products = [];
                    if (Array.isArray(response)) {
                        products = response;
                    } else if (typeof response === 'object') {
                        products = Object.values(response);
                    }
                    allProducts.push(...products);
                    console.log(`${method} found: ${products.length} products (direct response)`);
                }
            } catch (error) {
                console.log(`${method} failed:`, error.message);
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const uniqueProducts = allProducts.filter((product, index, self) => {
            const productId = product.product_id || product.id || product.sku;
            return productId && self.findIndex(p =>
                (p.product_id || p.id || p.sku) === productId
            ) === index;
        });

        console.log(`\nTotal unique products found: ${uniqueProducts.length}`);
        return uniqueProducts;
    }

    async saveProductsToFile(products, filename) {
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `baselinker_products_${timestamp}.json`;
        }

        try {
            const jsonData = JSON.stringify(products, null, 2);
            await fs.writeFile(filename, jsonData, 'utf8');
            console.log(`\n✅ Products saved to: ${filename}`);
            console.log(`📦 Products count: ${products.length}`);
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