const https = require('https');
const { URLSearchParams } = require('url');

class OvokoProductDeleter {
    constructor(credentials) {
        this.credentials = credentials;
        this.apiUrl = 'https://api.rrr.lt/crm';
        this.requestDelay = 1000;
    }

    async deletePart(partId) {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams();
            
            // Add authentication
            postData.append('username', this.credentials.username);
            postData.append('password', this.credentials.password);
            postData.append('user_token', this.credentials.userToken);
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

            console.log(`🗑️  Deleting part ID: ${partId} from Ovoko...`);

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (response.status_code === 'R200') {
                            console.log(`✅ Successfully deleted part ID: ${partId}`);
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
}

// Configuration
const CONFIG = {
    username: 'bmw@bavariaparts.pl',
    password: 'Karawan1!',
    userToken: 'dcf1fb235513c6d36b7a700defdee8ab'
};

// Main execution
async function main() {
    const deleter = new OvokoProductDeleter(CONFIG);
    
    try {
        // Delete the specific product that should be out of stock
        const partIdToDelete = 16734; // ovoko_part_id for SKU 10914274
        
        console.log('🚀 Starting deletion of out-of-stock product...');
        console.log('📦 Product: DRZWI LEWE PRZEDNIE BMW E90 E91 381 LE MANS');
        console.log('🔢 SKU: 10914274');
        console.log('🆔 Ovoko Part ID: 16734');
        console.log('=' .repeat(60));
        
        const result = await deleter.deletePart(partIdToDelete);
        
        console.log('\n✅ DELETION COMPLETED SUCCESSFULLY!');
        console.log('📊 Result:', JSON.stringify(result, null, 2));
        
    } catch (error) {
        console.error('💥 Deletion failed:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { OvokoProductDeleter }; 