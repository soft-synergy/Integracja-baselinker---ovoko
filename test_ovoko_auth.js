const https = require('https');
const { URLSearchParams } = require('url');

class OvokoAuthTester {
    constructor(credentials) {
        this.credentials = credentials;
    }

    async testEndpoint(endpoint, parameters = {}) {
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

            console.log(`🔌 Testing endpoint: /crm/${endpoint}`);
            console.log('Parameters:', JSON.stringify(parameters, null, 2));

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        console.log(`📥 Response status: ${response.status_code || 'unknown'}`);
                        console.log(`📥 Response message: ${response.msg || 'no message'}`);
                        
                        if (response.status_code === 'R200') {
                            console.log('✅ SUCCESS!');
                            resolve(response);
                        } else {
                            console.log('❌ FAILED!');
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
}

// Configuration
const CONFIG = {
    username: 'bavarian',
    password: '5J1iod3cY6zUCkid',
    userToken: 'dcf1fb235513c6d36b7a700defdee8ab'
};

// Main execution
async function main() {
    const tester = new OvokoAuthTester(CONFIG);
    
    console.log('🧪 TESTING OVOKO API AUTHENTICATION');
    console.log('=' .repeat(50));
    
    const endpoints = [
        { name: 'getCategories', params: {} },
        { name: 'getParts', params: { page: 1, limit: 10 } },
        { name: 'deletePart', params: { part_id: 16734 } }
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`\n🔍 Testing ${endpoint.name}...`);
            console.log('-'.repeat(30));
            
            const result = await tester.testEndpoint(endpoint.name, endpoint.params);
            console.log(`✅ ${endpoint.name} works!`);
            
        } catch (error) {
            console.log(`❌ ${endpoint.name} failed: ${error.message}`);
        }
    }
    
    console.log('\n📊 AUTHENTICATION TEST COMPLETED');
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { OvokoAuthTester }; 