const https = require('https');
const { URLSearchParams } = require('url');

async function testDeletePart() {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        
        // Add authentication WITH user_token
        postData.append('username', 'bavarian');
        postData.append('password', '5J1iod3cY6zUCkid');
        postData.append('user_token', 'dcf1fb235513c6d36b7a700defdee8ab');
        postData.append('part_id', '16734');

        const options = {
            hostname: 'api.rrr.lt',
            path: '/crm/deletePart',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString())
            }
        };

        console.log('🗑️  Testing deletePart WITHOUT user_token...');
        console.log('📤 Sending data:', postData.toString());

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log(`📥 Response status: ${res.statusCode}`);
                console.log(`📥 Raw response: ${responseData}`);
                
                try {
                    const response = JSON.parse(responseData);
                    console.log(`📥 Parsed response:`, JSON.stringify(response, null, 2));
                    
                    if (response.status_code === 'R200') {
                        console.log('✅ SUCCESS! Product deleted!');
                        resolve(response);
                    } else {
                        console.log('❌ FAILED!');
                        reject(new Error(`Ovoko API Error: ${response.msg || JSON.stringify(response)}`));
                    }
                } catch (error) {
                    console.error('JSON Parse Error:', error.message);
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

// Main execution
async function main() {
    try {
        console.log('🧪 TESTING DELETE PART WITHOUT USER_TOKEN');
        console.log('=' .repeat(50));
        
        const result = await testDeletePart();
        console.log('\n✅ DELETION SUCCESSFUL!');
        console.log('📊 Result:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('💥 Deletion failed:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    main();
} 