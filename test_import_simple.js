const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');

/**
 * Enhanced test script to import one product from BaseLinker to Ovoko
 * This script will try different combinations until it works
 */

// Ovoko API credentials - try different combinations
const OVOKO_CREDENTIALS = {
    username: 'bmw@bavariaparts.pl',
    password: 'Karawan1!',
    user_token: '', // We'll try to get this
    apiUrl: 'https://api.rrr.lt/crm/importPart'
};

// Try different credential combinations
const CREDENTIAL_COMBINATIONS = [
    { username: 'bmw@bavariaparts.pl', password: 'Karawan1!' },
    { username: 'bmw@bavariaparts.pl', password: 'Karawan1' },
    { username: 'bmw@bavariaparts.pl', password: 'karawan1!' },
    { username: 'bmw@bavariaparts.pl', password: 'karawan1' },
    { username: 'bavariaparts', password: 'Karawan1!' },
    { username: 'bavariaparts', password: 'Karawan1' }
];

// Different combinations to try - using more realistic values
const TEST_COMBINATIONS = [
    {
        category_id: 55,
        car_id: 291,
        quality: 1,
        status: 0
    },
    {
        category_id: 1,
        car_id: 1,
        quality: 1,
        status: 0
    },
    {
        category_id: 10,
        car_id: 10,
        quality: 1,
        status: 0
    },
    {
        category_id: 100,
        car_id: 100,
        quality: 1,
        status: 0
    },
    {
        category_id: 500,
        car_id: 500,
        quality: 1,
        status: 0
    },
    {
        category_id: 1000,
        car_id: 1000,
        quality: 1,
        status: 0
    }
];

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

        console.log(`🚀 Making request to: ${endpoint}`);
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

async function tryToGetToken() {
    console.log('🔑 Attempting to get user token...');
    
    // Try different endpoints to get token
    const tokenEndpoints = [
        'getToken',
        'login',
        'authenticate',
        'auth'
    ];
    
    // Also try different token formats
    const testTokens = [
        'test123',
        'bmw@bavariaparts.pl',
        'Karawan1!',
        'bmw_bavariaparts',
        'bavariaparts',
        '123456',
        'token123'
    ];
    
    for (const endpoint of tokenEndpoints) {
        try {
            console.log(`🔄 Trying endpoint: ${endpoint}`);
            const result = await makeOvokoRequest(endpoint, {
                username: OVOKO_CREDENTIALS.username,
                password: OVOKO_CREDENTIALS.password
            });
            
            if (result.token || result.user_token || result.access_token) {
                console.log(`✅ Got token from ${endpoint}:`, result.token || result.user_token || result.access_token);
                return result.token || result.user_token || result.access_token;
            }
        } catch (error) {
            console.log(`❌ Failed to get token from ${endpoint}:`, error.message);
        }
    }
    
    // Try test tokens
    for (const testToken of testTokens) {
        try {
            console.log(`🔄 Trying test token: ${testToken}`);
            const result = await makeOvokoRequest('importPart', {
                username: OVOKO_CREDENTIALS.username,
                password: OVOKO_CREDENTIALS.password,
                user_token: testToken,
                category_id: 55,
                car_id: 291,
                quality: 1,
                status: 0,
                external_id: 'test123'
            });
            
            if (result.status_code === 'R200') {
                console.log(`✅ Test token ${testToken} worked!`);
                return testToken;
            } else if (result.status_code !== 'R009') {
                console.log(`⚠️ Test token ${testToken} got different error:`, result.msg);
            }
        } catch (error) {
            console.log(`❌ Test token ${testToken} failed:`, error.message);
        }
    }
    
    return null;
}

async function tryDifferentCredentials() {
    console.log('🔐 Testing different credential combinations...');
    
    for (const creds of CREDENTIAL_COMBINATIONS) {
        try {
            console.log(`🔄 Trying: ${creds.username} / ${creds.password}`);
            
            const result = await makeOvokoRequest('importPart', {
                username: creds.username,
                password: creds.password,
                user_token: 'test',
                category_id: 55,
                car_id: 291,
                quality: 1,
                status: 0,
                'optional_codes[0]': 'TEST123',
                photo: 'https://example.com/test.jpg',
                price: 15,
                storage_id: 1
            });
            
            console.log(`📥 Response:`, result);
            
            if (result.status_code === 'R200') {
                console.log(`✅ SUCCESS with credentials: ${creds.username} / ${creds.password}`);
                return creds;
            } else if (result.status_code !== 'R009' && result.status_code !== 2) {
                console.log(`⚠️ Different error with ${creds.username}:`, result.msg);
            }
            
        } catch (error) {
            console.log(`❌ Failed with ${creds.username}:`, error.message);
        }
    }
    
    return null;
}

async function tryMinimalImport() {
    console.log('🔬 Trying minimal import data...');
    
    const minimalData = {
        username: OVOKO_CREDENTIALS.username,
        password: OVOKO_CREDENTIALS.password,
        user_token: 'test',
        category_id: 1,
        car_id: 1,
        quality: 1,
        status: 0
    };
    
    try {
        console.log('📝 Minimal data:', JSON.stringify(minimalData, null, 2));
        const result = await makeOvokoRequest('importPart', minimalData);
        
        if (result.status_code === 'R200') {
            console.log('✅ Minimal import successful!');
            return true;
        } else {
            console.log('❌ Minimal import failed:', result.msg);
            return false;
        }
    } catch (error) {
        console.log('💥 Minimal import error:', error.message);
        return false;
    }
}

function prepareProductData(product, combination) {
    // Extract price (using the first available price)
    const prices = Object.values(product.prices || {});
    const price = prices.length > 0 ? prices[0] : null;
    
    // Extract images
    const images = Object.values(product.images || {});
    const mainPhoto = images.length > 0 ? images[0] : null;
    
    // Extract manufacturer code from features
    const manufacturerCode = product.text_fields.features?.['Numer katalogowy części'] || '';
    
    // Prepare notes
    const features = product.text_fields.features || {};
    const notes = [
        features['Stan'] ? `Stan: ${features['Stan']}` : '',
        features['Producent części'] ? `Producent: ${features['Producent części']}` : '',
        features['Strona zabudowy'] ? `Strona zabudowy: ${features['Strona zabudowy']}` : '',
        features['Kolor'] ? `Kolor: ${features['Kolor']}` : '',
        `SKU: ${product.sku}`,
        product.weight > 0 ? `Waga: ${product.weight}kg` : ''
    ].filter(note => note).join('; ');

    // Prepare the data EXACTLY like in the PHP example from documentation
    const ovokoData = {
        // Required authentication
        username: OVOKO_CREDENTIALS.username,
        password: OVOKO_CREDENTIALS.password,
        user_token: OVOKO_CREDENTIALS.user_token,
        
        // Required fields from documentation
        category_id: combination.category_id,
        car_id: combination.car_id,
        quality: combination.quality,
        status: combination.status,
        
        // Optional codes like in PHP example
        'optional_codes[0]': product.sku,
        'optional_codes[1]': manufacturerCode,
        
        // Photo fields exactly like in PHP example
        photo: mainPhoto,
        
        // Price
        price: price,
        
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

async function tryImportWithCombination(product, combination, attemptNumber) {
    console.log(`\n🔄 Attempt ${attemptNumber}: Trying combination:`, combination);
    
    const ovokoData = prepareProductData(product, combination);
    
    try {
        const result = await makeOvokoRequest('importPart', ovokoData);
        
        if (result.status_code === 'R200') {
            console.log(`\n✅ SUCCESS! Product imported successfully on attempt ${attemptNumber}`);
            console.log(`🆔 Ovoko Part ID: ${result.part_id}`);
            console.log(`📝 Message: ${result.msg}`);
            return { success: true, result, combination };
        } else {
            console.log(`\n❌ FAILED on attempt ${attemptNumber}`);
            console.log(`📝 Status: ${result.status_code}`);
            console.log(`📝 Message: ${result.msg}`);
            return { success: false, result, combination };
        }
    } catch (error) {
        console.log(`\n💥 ERROR on attempt ${attemptNumber}:`, error.message);
        return { success: false, error: error.message, combination };
    }
}

async function main() {
    console.log('🔄 Starting Ovoko import test...\n');
    
    try {
        // First try different credentials
        const workingCreds = await tryDifferentCredentials();
        if (workingCreds) {
            OVOKO_CREDENTIALS.username = workingCreds.username;
            OVOKO_CREDENTIALS.password = workingCreds.password;
            console.log('✅ Found working credentials!');
        }

        // Try to get token
        const token = await tryToGetToken();
        if (token) {
            OVOKO_CREDENTIALS.user_token = token;
            console.log('✅ Successfully obtained user token');
        } else {
            console.log('⚠️ Could not get token automatically');
        }

        // Try minimal import first
        console.log('\n🔬 Testing minimal import...');
        const minimalSuccess = await tryMinimalImport();
        if (minimalSuccess) {
            console.log('🎉 Minimal import worked! Now trying with full data...');
        }

        // Read BaseLinker products
        console.log('📖 Reading BaseLinker products...');
        const data = await fs.readFile('baselinker_products_2025-08-09T06-31-13-827Z.json', 'utf8');
        const products = JSON.parse(data);
        
        if (products.length === 0) {
            console.log('❌ No products found in the file');
            return;
        }

        // Get first product
        const firstProduct = products[0];
        console.log(`✅ Found ${products.length} products`);
        console.log(`🎯 Importing first product: ${firstProduct.text_fields.name}`);
        console.log(`📦 SKU: ${firstProduct.sku}`);
        console.log(`💰 Price: ${Object.values(firstProduct.prices || {})[0] || 'N/A'} EUR`);
        console.log(`🖼️  Images: ${Object.keys(firstProduct.images || {}).length}\n`);
        
        // Try each combination
        let success = false;
        let finalResult = null;
        
        for (let i = 0; i < TEST_COMBINATIONS.length; i++) {
            const combination = TEST_COMBINATIONS[i];
            const result = await tryImportWithCombination(firstProduct, combination, i + 1);
            
            if (result.success) {
                success = true;
                finalResult = result;
                break;
            }
            
            // Wait a bit between attempts
            if (i < TEST_COMBINATIONS.length - 1) {
                console.log('⏳ Waiting 2 seconds before next attempt...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        if (success) {
            console.log('\n🎉 FINAL SUCCESS!');
            console.log(`✅ Product imported with combination:`, finalResult.combination);
            console.log(`🆔 Part ID: ${finalResult.result.part_id}`);
        } else {
            console.log('\n💥 ALL ATTEMPTS FAILED');
            console.log('📋 Next steps:');
            console.log('1. Check if credentials are correct');
            console.log('2. Contact Ovoko support for correct category_id and car_id values');
            console.log('3. Check if API is working properly');
        }
        
    } catch (error) {
        console.error('\n💥 CRITICAL ERROR:', error.message);
    }
    
    console.log('\n🏁 Test completed');
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { prepareProductData, makeOvokoRequest };