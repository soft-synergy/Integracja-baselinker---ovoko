const https = require('https');
const { URLSearchParams } = require('url');

/**
 * Simple script to test what actually works with Ovoko API
 */

// Ovoko API credentials
const OVOKO_CREDENTIALS = {
    username: 'bavarian',
    password: '5J1iod3cY6zUCkid',
    user_token: 'dcf1fb235513c6d36b7a700defdee8ab'
};

async function testEndpoint(endpoint, data = {}) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        
        // Add authentication data
        postData.append('username', OVOKO_CREDENTIALS.username);
        postData.append('password', OVOKO_CREDENTIALS.password);
        postData.append('user_token', OVOKO_CREDENTIALS.user_token);
        
        // Add additional data
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
                'Content-Length': Buffer.byteLength(postData.toString())
            }
        };

        console.log(`\n🔄 Testing: ${endpoint}`);
        if (Object.keys(data).length > 0) {
            console.log('📝 Data:', JSON.stringify(data, null, 2));
        }

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log(`📥 Status: ${res.statusCode}`);
                try {
                    const response = JSON.parse(responseData);
                    console.log(`📋 Response:`, response);
                    
                    if (response.status_code === 'R200') {
                        console.log(`✅ SUCCESS: ${endpoint}`);
                    } else {
                        console.log(`❌ FAILED: ${response.msg || response.status_code}`);
                    }
                    
                    resolve(response);
                } catch (error) {
                    console.log(`📄 Raw response:`, responseData.substring(0, 200) + '...');
                    resolve({ raw_response: responseData, parse_error: true });
                }
            });
        });

        req.on('error', (error) => {
            console.log(`💥 ERROR: ${error.message}`);
            reject(error);
        });

        req.write(postData.toString());
        req.end();
    });
}

async function main() {
    console.log('🧪 Testing Ovoko API endpoints...\n');
    
    // Test basic functionality first
    console.log('🔍 Testing basic API functionality...');
    
    // Test if we can import a part (we know this works)
    await testEndpoint('importPart', {
        category_id: 55,
        car_id: 291,
        quality: 1,
        status: 0,
        'optional_codes[0]': 'TEST123',
        photo: 'https://example.com/test.jpg',
        price: 15,
        storage_id: 1
    });
    
    // Test some basic endpoints
    const basicEndpoints = [
        'getCars',
        'getParts',
        'getCategories',
        'getManufacturers'
    ];
    
    for (const endpoint of basicEndpoints) {
        try {
            await testEndpoint(endpoint);
        } catch (error) {
            console.log(`💥 ${endpoint} failed:`, error.message);
        }
        
        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🏁 Basic testing completed');
}

if (require.main === module) {
    main();
} 