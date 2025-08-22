const https = require('https');
const { URLSearchParams } = require('url');

/**
 * Test script to check if specific part IDs exist in Ovoko
 */

class OvokoPartTester {
    constructor() {
        this.username = 'bavarian';
        this.password = '5J1iod3cY6zUCkid';
        this.userToken = 'dcf1fb235513c6d36b7a700defdee8ab';
        this.apiUrl = 'https://api.rrr.lt/crm/deletePart';
    }

    async testPartId(partId) {
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

            console.log(`🔍 Testing part ID: ${partId}`);

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        console.log(`📥 Response for part ${partId}:`, JSON.stringify(response, null, 2));
                        
                        if (response.status_code === 'R200') {
                            console.log(`✅ Part ${partId} exists and can be deleted`);
                            resolve({ exists: true, response });
                        } else if (response.status_code === 'R400' && response.msg && response.msg.includes('part_id not found')) {
                            console.log(`❌ Part ${partId} does not exist in Ovoko`);
                            resolve({ exists: false, response });
                        } else {
                            console.log(`⚠️  Part ${partId} - unexpected response`);
                            resolve({ exists: false, response });
                        }
                    } catch (error) {
                        console.error(`💥 JSON parse error for part ${partId}:`, error.message);
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

    async testMultipleParts(partIds) {
        console.log(`🧪 Testing ${partIds.length} part IDs in Ovoko...\n`);
        
        const results = {};
        
        for (const partId of partIds) {
            try {
                const result = await this.testPartId(partId);
                results[partId] = result;
                
                // Add delay between requests
                if (partIds.indexOf(partId) < partIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (error) {
                console.error(`💥 Error testing part ${partId}:`, error.message);
                results[partId] = { error: error.message };
            }
        }

        console.log('\n📊 SUMMARY:');
        console.log('=' .repeat(50));
        
        const existing = Object.values(results).filter(r => r.exists).length;
        const notExisting = Object.values(results).filter(r => !r.exists && !r.error).length;
        const errors = Object.values(results).filter(r => r.error).length;
        
        console.log(`✅ Existing parts: ${existing}`);
        console.log(`❌ Non-existing parts: ${notExisting}`);
        console.log(`💥 Errors: ${errors}`);
        
        return results;
    }
}

// Main execution
async function main() {
    const tester = new OvokoPartTester();
    
    // Test the specific part IDs that failed
    const failedPartIds = [16728, 16732];
    
    try {
        const results = await tester.testMultipleParts(failedPartIds);
        
        console.log('\n🔍 DETAILED RESULTS:');
        console.log('=' .repeat(50));
        
        for (const [partId, result] of Object.entries(results)) {
            if (result.error) {
                console.log(`Part ${partId}: ❌ ERROR - ${result.error}`);
            } else if (result.exists) {
                console.log(`Part ${partId}: ✅ EXISTS`);
            } else {
                console.log(`Part ${partId}: ❌ NOT FOUND`);
            }
        }
        
    } catch (error) {
        console.error('💥 Main error:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { OvokoPartTester }; 