const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');
const readline = require('readline');

/**
 * Interactive script to import specific BaseLinker product to Ovoko
 * This script will ask for product ID and import only that product
 */

// Ovoko API credentials - CORRECT ONES!
const OVOKO_CREDENTIALS = {
    username: 'bavarian',
    password: '5J1iod3cY6zUCkid',
    user_token: 'dcf1fb235513c6d36b7a700defdee8ab',
    apiUrl: 'https://api.rrr.lt/crm/importPart'
};

// Working combination that we know works
const WORKING_COMBINATION = {
    category_id: 55,
    car_id: 291,
    quality: 1,
    status: 0
};

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function makeOvokoRequest(endpoint, data) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        
        // Add all data to POST parameters
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
                postData.append(key, data[key].toString());
            }
        });

        const options = {
            hostname: 'api.rrr.lt',
            path: `/crm/${endpoint}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'User-Agent': 'Ovoko-Importer/1.0'
            }
        };

        console.log('🚀 Making request to Ovoko API...');
        console.log('📝 Request data:', JSON.stringify(data, null, 2));

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log('📥 Raw response:', responseData);
                try {
                    const response = JSON.parse(responseData);
                    resolve(response);
                } catch (error) {
                    reject(new Error(`JSON Parse Error: ${error.message}. Raw response: ${responseData}`));
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

function prepareProductData(product) {
    // Extract price (using the first available price)
    const prices = Object.values(product.prices || {});
    const price = prices.length > 0 ? prices[0] : null;
    
    // Extract images
    const images = Object.values(product.images || {});
    const mainPhoto = images.length > 0 ? images[0] : null;
    
    // Extract manufacturer code from features
    const manufacturerCode = product.text_fields.features?.['Numer katalogowy części'] || '';
    
    // Prepare the data EXACTLY like in the PHP example from documentation
    const ovokoData = {
        // Required authentication
        username: OVOKO_CREDENTIALS.username,
        password: OVOKO_CREDENTIALS.password,
        user_token: OVOKO_CREDENTIALS.user_token,
        
        // Required fields from documentation
        category_id: WORKING_COMBINATION.category_id,
        car_id: WORKING_COMBINATION.car_id,
        quality: WORKING_COMBINATION.quality,
        status: WORKING_COMBINATION.status,
        
        // Optional codes like in PHP example
        'optional_codes[0]': product.sku,
        'optional_codes[1]': manufacturerCode,
        
        // Photo fields exactly like in PHP example
        photo: mainPhoto,
        
        // Price
        price: price,
        
        // Currency - API requires PLN
        original_currency: 'PLN',
        
        // Storage ID - this was in the PHP example!
        storage_id: 1
    };

    // Add additional photos exactly like in PHP example
    if (images.length > 0) {
        images.forEach((imageUrl, index) => {
            ovokoData[`photos[${index}]`] = imageUrl;
        });
    }

    return ovokoData;
}

async function findProductById(products, searchId) {
    // Try to find by SKU first
    let product = products.find(p => p.sku === searchId);
    if (product) {
        return { product, foundBy: 'SKU' };
    }
    
    // Try to find by inventory_id
    product = products.find(p => p.inventory_id === searchId);
    if (product) {
        return { product, foundBy: 'inventory_id' };
    }
    
    // Try to find by partial name match
    product = products.find(p => 
        p.text_fields.name.toLowerCase().includes(searchId.toLowerCase())
    );
    if (product) {
        return { product, foundBy: 'partial name' };
    }
    
    return null;
}

async function showProductInfo(product) {
    console.log('\n📋 Product Information:');
    console.log(`🆔 SKU: ${product.sku}`);
    console.log(`📦 Inventory ID: ${product.inventory_id}`);
    console.log(`🏷️  Name: ${product.text_fields.name}`);
    
    const prices = Object.values(product.prices || {});
    if (prices.length > 0) {
        console.log(`💰 Price: ${prices[0]} EUR`);
    }
    
    if (product.weight > 0) {
        console.log(`⚖️  Weight: ${product.weight}kg`);
    }
    
    const images = Object.values(product.images || {});
    console.log(`🖼️  Images: ${images.length}`);
    
    const features = product.text_fields.features || {};
    if (features['Stan']) {
        console.log(`📊 Condition: ${features['Stan']}`);
    }
    if (features['Producent części']) {
        console.log(`🏭 Manufacturer: ${features['Producent części']}`);
    }
    if (features['Kolor']) {
        console.log(`🎨 Color: ${features['Kolor']}`);
    }
}

async function importProduct(product) {
    console.log('\n🚀 Starting import...');
    
    try {
        const ovokoData = prepareProductData(product);
        const result = await makeOvokoRequest('importPart', ovokoData);
        
        if (result.status_code === 'R200') {
            console.log('\n✅ SUCCESS! Product imported successfully!');
            console.log(`🆔 Ovoko Part ID: ${result.part_id}`);
            console.log(`📝 Message: ${result.msg}`);
            if (result.shop_url) {
                console.log(`🌐 Shop URL: ${result.shop_url}`);
            }
            return true;
        } else {
            console.log('\n❌ FAILED! Import was not successful');
            console.log(`📝 Status: ${result.status_code}`);
            console.log(`📝 Message: ${result.msg}`);
            return false;
        }
        
    } catch (error) {
        console.error('\n💥 ERROR:', error.message);
        return false;
    }
}

async function main() {
    console.log('🔄 Starting Ovoko Import Tool...\n');
    
    try {
        // Read BaseLinker products
        console.log('📖 Reading BaseLinker products...');
        const data = await fs.readFile('baselinker_products_2025-08-09T06-31-13-827Z.json', 'utf8');
        const products = JSON.parse(data);
        
        if (products.length === 0) {
            console.log('❌ No products found in the file');
            return;
        }

        console.log(`✅ Found ${products.length} products in database\n`);
        
        // Ask user for product ID
        const searchId = await askQuestion('🔍 Enter BaseLinker product ID/SKU to import: ');
        
        if (!searchId.trim()) {
            console.log('❌ No ID provided');
            return;
        }
        
        // Find the product
        console.log(`\n🔍 Searching for product: ${searchId}`);
        const searchResult = await findProductById(products, searchId.trim());
        
        if (!searchResult) {
            console.log(`❌ Product with ID/SKU "${searchId}" not found`);
            console.log('\n💡 Tips:');
            console.log('- Try using the SKU (e.g., 11481380)');
            console.log('- Try using the inventory ID');
            console.log('- Try using part of the product name');
            return;
        }
        
        const { product, foundBy } = searchResult;
        console.log(`✅ Product found by: ${foundBy}`);
        
        // Show product info
        await showProductInfo(product);
        
        // Ask for confirmation
        const confirm = await askQuestion('\n❓ Do you want to import this product? (y/n): ');
        
        if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            const success = await importProduct(product);
            
            if (success) {
                console.log('\n🎉 Import completed successfully!');
            } else {
                console.log('\n💥 Import failed. Check the error messages above.');
            }
        } else {
            console.log('\n❌ Import cancelled by user');
        }
        
    } catch (error) {
        console.error('\n💥 CRITICAL ERROR:', error.message);
    } finally {
        rl.close();
    }
    
    console.log('\n🏁 Tool completed');
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { prepareProductData, makeOvokoRequest };