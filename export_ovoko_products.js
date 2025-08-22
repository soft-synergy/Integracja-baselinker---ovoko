const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');

class OvokoProductExporter {
    constructor(credentials) {
        this.credentials = credentials;
        this.apiUrl = 'https://api.rrr.lt/crm';
        this.requestDelay = 1000; // Delay between requests to avoid rate limiting
    }

    async makeApiRequest(endpoint, parameters = {}) {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams();
            
            // Add authentication
            postData.append('username', this.credentials.username);
            postData.append('password', this.credentials.password);
            postData.append('user_token', this.credentials.userToken);
            
            // Add other parameters
            Object.keys(parameters).forEach(key => {
                if (parameters[key] !== null && parameters[key] !== undefined) {
                    postData.append(key, parameters[key].toString());
                }
            });

            const options = {
                hostname: 'api.rrr.lt',
                path: `/crm/${endpoint}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData.toString())
                }
            };

            console.log(`Making request to Ovoko API endpoint: ${endpoint}`);
            console.log('Parameters:', JSON.stringify(parameters, null, 2));

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (response.status_code === 'R200') {
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

    async exportAllProducts() {
        try {
            console.log('🚀 Starting export of all products from Ovoko...');
            
            const allProducts = [];
            let page = 1;
            let hasMoreProducts = true;
            const pageSize = 100; // Adjust based on Ovoko API limits
            
            while (hasMoreProducts) {
                console.log(`\n📄 Exporting page ${page}...`);
                
                try {
                    const parameters = {
                        page: page,
                        limit: pageSize,
                        // You can add filters here if needed
                        // category_id: 55,
                        // car_id: 291,
                        // status: 0
                    };
                    
                    const response = await this.makeApiRequest('getPartsV2', parameters);
                    
                    if (response.parts && Array.isArray(response.parts)) {
                        const products = response.parts;
                        console.log(`  Page ${page}: Found ${products.length} products`);
                        
                        // Add page info to each product
                        products.forEach(product => {
                            product.export_page = page;
                            product.export_timestamp = new Date().toISOString();
                        });
                        
                        allProducts.push(...products);
                        
                        // Check if we have more products
                        if (products.length < pageSize) {
                            hasMoreProducts = false;
                            console.log(`  Page ${page}: Less than ${pageSize} products, this is the last page`);
                        } else {
                            page++;
                            // Add delay to avoid rate limiting
                            await new Promise(resolve => setTimeout(resolve, this.requestDelay));
                        }
                    } else {
                        console.log(`  Page ${page}: No products found or invalid response format`);
                        hasMoreProducts = false;
                    }
                    
                } catch (error) {
                    console.error(`  Page ${page} failed:`, error.message);
                    hasMoreProducts = false;
                }
            }
            
            console.log(`\n📊 Total products exported: ${allProducts.length}`);
            
            // Save to file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `ovoko_products_${timestamp}.json`;
            
            await fs.writeFile(filename, JSON.stringify(allProducts, null, 2), 'utf8');
            console.log(`💾 Products saved to: ${filename}`);
            
            // Also save as latest for easy access
            await fs.writeFile('ovoko_products_latest.json', JSON.stringify(allProducts, null, 2), 'utf8');
            console.log(`💾 Latest products saved to: ovoko_products_latest.json`);
            
            return {
                success: true,
                filename: filename,
                productCount: allProducts.length,
                products: allProducts
            };
            
        } catch (error) {
            throw new Error(`Export failed: ${error.message}`);
        }
    }

    async exportProductsByFilter(filters = {}) {
        try {
            console.log('🔍 Exporting products with filters...');
            console.log('Filters:', JSON.stringify(filters, null, 2));
            
            const parameters = {
                page: 1,
                limit: 1000, // Get more products in one request for filtered results
                ...filters
            };
            
                                const response = await this.makeApiRequest('getPartsV2', parameters);
            
            if (response.parts && Array.isArray(response.parts)) {
                const products = response.parts;
                console.log(`📊 Found ${products.length} products matching filters`);
                
                // Add export info
                products.forEach(product => {
                    product.export_filters = filters;
                    product.export_timestamp = new Date().toISOString();
                });
                
                // Save to file
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filterString = Object.entries(filters).map(([k, v]) => `${k}_${v}`).join('_');
                const filename = `ovoko_products_filtered_${filterString}_${timestamp}.json`;
                
                await fs.writeFile(filename, JSON.stringify(products, null, 2), 'utf8');
                console.log(`💾 Filtered products saved to: ${filename}`);
                
                return {
                    success: true,
                    filename: filename,
                    productCount: products.length,
                    filters: filters,
                    products: products
                };
            } else {
                console.log('❌ No products found or invalid response format');
                return {
                    success: false,
                    message: 'No products found',
                    filters: filters
                };
            }
            
        } catch (error) {
            throw new Error(`Filtered export failed: ${error.message}`);
        }
    }
}

// Configuration
const CONFIG = {
    username: 'bavarian',
    password: '5J1iod3cY6zUCkid',
    userToken: 'dcf1fb235513c6d36b7a700defdee8ab'
};

// Main execution
async function main() {
    const exporter = new OvokoProductExporter(CONFIG);
    
    try {
        // Export all products
        console.log('\n=== EXPORTING ALL PRODUCTS ===');
        const allProductsResult = await exporter.exportAllProducts();
        
        if (allProductsResult.success) {
            console.log('\n✅ All products exported successfully!');
            
            // Example of filtered export
            console.log('\n=== EXPORTING FILTERED PRODUCTS (EXAMPLE) ===');
            const filteredResult = await exporter.exportProductsByFilter({
                category_id: 55, // BMW parts category
                status: 0        // Available status
            });
            
            if (filteredResult.success) {
                console.log('✅ Filtered products exported successfully!');
            }
        }
        
    } catch (error) {
        console.error('💥 Export failed:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { OvokoProductExporter }; 