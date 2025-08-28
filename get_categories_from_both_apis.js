const https = require('https');
const { URLSearchParams } = require('url');
const fs = require('fs').promises;

// BaseLinker API configuration
const BASELINKER_CONFIG = {
    token: '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F',
    baseUrl: 'https://api.baselinker.com/connector.php'
};

// Ovoko API configuration
const OVOKO_CONFIG = {
    username: 'bavarian',
    password: '5J1iod3cY6zUCkid',
    user_token: 'dcf1fb235513c6d36b7a700defdee8ab',
    baseUrl: 'https://api.rrr.lt'
};

/**
 * Make HTTP POST request
 */
function makeRequest(url, data, headers = {}) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        
        // Add data to postData
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
                postData.append(key, data[key].toString());
            }
        });

        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve(parsed);
                } catch (error) {
                    resolve({ raw_response: responseData, parse_error: error.message });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData.toString());
        req.end();
    });
}

/**
 * Get categories from BaseLinker API
 */
async function getBaseLinkerCategories() {
    console.log('🔄 Fetching categories from BaseLinker API...');
    
    try {
        const data = {
            token: BASELINKER_CONFIG.token,
            method: 'getInventoryCategories',
            parameters: JSON.stringify({})
        };

        const response = await makeRequest(BASELINKER_CONFIG.baseUrl, data);
        
        if (response.status === 'SUCCESS') {
            console.log(`✅ BaseLinker: Retrieved ${response.categories?.length || 0} categories`);
            return {
                source: 'BaseLinker',
                timestamp: new Date().toISOString(),
                status: 'success',
                data: response
            };
        } else {
            console.log(`❌ BaseLinker: API error - ${response.error_message || 'Unknown error'}`);
            return {
                source: 'BaseLinker',
                timestamp: new Date().toISOString(),
                status: 'error',
                error: response.error_message || 'Unknown error',
                error_code: response.error_code
            };
        }
    } catch (error) {
        console.log(`💥 BaseLinker: Request failed - ${error.message}`);
        return {
            source: 'BaseLinker',
            timestamp: new Date().toISOString(),
            status: 'error',
            error: error.message
        };
    }
}

/**
 * Get categories from Ovoko API
 */
async function getOvokoCategories() {
    console.log('🔄 Fetching categories from Ovoko API...');
    
    try {
        const data = {
            username: OVOKO_CONFIG.username,
            password: OVOKO_CONFIG.password,
            user_token: OVOKO_CONFIG.user_token
        };

        const response = await makeRequest(`${OVOKO_CONFIG.baseUrl}/get/categories`, data);
        
        if (response.status_code === 'R200' || response.list) {
            console.log(`✅ Ovoko: Retrieved ${response.list?.length || 0} categories`);
            return {
                source: 'Ovoko',
                timestamp: new Date().toISOString(),
                status: 'success',
                data: response
            };
        } else {
            console.log(`❌ Ovoko: API error - ${response.msg || 'Unknown error'}`);
            return {
                source: 'Ovoko',
                timestamp: new Date().toISOString(),
                status: 'error',
                error: response.msg || 'Unknown error',
                status_code: response.status_code
            };
        }
    } catch (error) {
        console.log(`💥 Ovoko: Request failed - ${error.message}`);
        return {
            source: 'Ovoko',
            timestamp: new Date().toISOString(),
            status: 'error',
            error: error.message
        };
    }
}

/**
 * Save data to JSON file
 */
async function saveToJson(data, filename) {
    try {
        await fs.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
        console.log(`💾 Saved to ${filename}`);
    } catch (error) {
        console.error(`❌ Failed to save ${filename}:`, error.message);
    }
}

/**
 * Main function
 */
async function main() {
    console.log('🚀 Starting category retrieval from both APIs...\n');
    
    try {
        // Get categories from both APIs
        const [baselinkerResult, ovokoResult] = await Promise.all([
            getBaseLinkerCategories(),
            getOvokoCategories()
        ]);
        
        console.log('\n📊 Results Summary:');
        console.log(`BaseLinker: ${baselinkerResult.status === 'success' ? '✅ Success' : '❌ Failed'}`);
        console.log(`Ovoko: ${ovokoResult.status === 'success' ? '✅ Success' : '❌ Failed'}`);
        
        // Save individual results
        await saveToJson(baselinkerResult, 'baselinker_categories.json');
        await saveToJson(ovokoResult, 'ovoko_categories.json');
        
        // Save combined results
        const combinedResult = {
            timestamp: new Date().toISOString(),
            summary: {
                baselinker: baselinkerResult.status,
                ovoko: ovokoResult.status
            },
            baselinker: baselinkerResult,
            ovoko: ovokoResult
        };
        
        await saveToJson(combinedResult, 'combined_categories.json');
        
        console.log('\n🎉 Category retrieval completed!');
        console.log('📁 Files created:');
        console.log('  - baselinker_categories.json');
        console.log('  - ovoko_categories.json');
        console.log('  - combined_categories.json');
        
    } catch (error) {
        console.error('\n💥 Fatal error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    getBaseLinkerCategories,
    getOvokoCategories,
    saveToJson
};
