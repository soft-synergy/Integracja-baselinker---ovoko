const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');

/**
 * Script to clean ovoko_products_latest.json by removing products that no longer exist in Ovoko
 */

class OvokoProductsCleaner {
    constructor() {
        this.username = 'bavarian';
        this.password = '5J1iod3cY6zUCkid';
        this.userToken = 'dcf1fb235513c6d36b7a700defdee8ab';
        this.apiUrl = 'https://api.rrr.lt/crm/deletePart';
        this.requestDelay = 1000;
    }

    async checkPartExists(partId) {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams();
            postData.append('username', this.username);
            postData.append('password', this.password);
            postData.append('user_token', this.userToken);
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

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (response.status_code === 'R200') {
                            resolve({ exists: true, response });
                        } else if (response.status_code === 'R400' && response.msg && response.msg.includes('part_id not found')) {
                            resolve({ exists: false, response });
                        } else {
                            resolve({ exists: false, response });
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

    async cleanOvokoProducts() {
        try {
            console.log('🧹 Starting cleanup of ovoko_products_latest.json...');
            
            // Load current ovoko products
            const ovokoData = await fs.readFile('ovoko_products_latest.json', 'utf8');
            const ovokoProducts = JSON.parse(ovokoData);
            
            console.log(`📦 Loaded ${ovokoProducts.length} products from ovoko_products_latest.json`);
            
            const results = {
                existing: [],
                removed: [],
                errors: []
            };

            // Check each product
            for (let i = 0; i < ovokoProducts.length; i++) {
                const product = ovokoProducts[i];
                const partId = product.part_id || product.id;
                
                if (!partId) {
                    console.log(`⚠️  Product ${product.sku} has no part_id, removing...`);
                    results.removed.push({
                        ...product,
                        reason: 'No part_id'
                    });
                    continue;
                }

                console.log(`\n${i + 1}/${ovokoProducts.length}: Checking ${product.sku} (Part ID: ${partId})`);
                
                try {
                    const checkResult = await this.checkPartExists(partId);
                    
                    if (checkResult.exists) {
                        console.log(`✅ Part ${partId} exists in Ovoko`);
                        results.existing.push(product);
                    } else {
                        console.log(`❌ Part ${partId} does not exist in Ovoko, removing...`);
                        results.removed.push({
                            ...product,
                            reason: 'Part not found in Ovoko'
                        });
                    }
                    
                } catch (error) {
                    console.error(`💥 Error checking part ${partId}:`, error.message);
                    results.errors.push({
                        ...product,
                        error: error.message
                    });
                }

                // Add delay between requests
                if (i < ovokoProducts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.requestDelay));
                }
            }

            // Save cleaned products
            await fs.writeFile('ovoko_products_latest.json', JSON.stringify(results.existing, null, 2), 'utf8');
            
            // Save backup of removed products
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const removedFilename = `ovoko_products_removed_${timestamp}.json`;
            await fs.writeFile(removedFilename, JSON.stringify(results.removed, null, 2), 'utf8');

            console.log('\n📊 CLEANUP RESULTS:');
            console.log('=' .repeat(50));
            console.log(`✅ Existing products: ${results.existing.length}`);
            console.log(`🗑️  Removed products: ${results.removed.length}`);
            console.log(`💥 Errors: ${results.errors.length}`);
            
            if (results.removed.length > 0) {
                console.log('\n🗑️  REMOVED PRODUCTS:');
                results.removed.forEach((p, i) => {
                    console.log(`  ${i + 1}. ${p.sku} - ${p.name} (Part ID: ${p.part_id}) - ${p.reason}`);
                });
                console.log(`\n💾 Removed products saved to: ${removedFilename}`);
            }

            console.log(`\n💾 Cleaned ovoko_products_latest.json saved with ${results.existing.length} products`);
            
            return results;
            
        } catch (error) {
            throw new Error(`Cleanup failed: ${error.message}`);
        }
    }
}

// Main execution
async function main() {
    const cleaner = new OvokoProductsCleaner();
    
    try {
        const results = await cleaner.cleanOvokoProducts();
        
        console.log('\n🎉 Cleanup completed successfully!');
        console.log(`📦 Final product count: ${results.existing.length}`);
        
    } catch (error) {
        console.error('\n💥 Cleanup failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { OvokoProductsCleaner }; 