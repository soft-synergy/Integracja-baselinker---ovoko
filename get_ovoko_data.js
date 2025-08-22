const https = require('https');
const { URLSearchParams } = require('url');

class OvokoAPIHelper {
    constructor() {
        this.username = 'bavarian';
        this.password = '5J1iod3cY6zUCkid';
        this.baseUrl = 'https://api.rrr.lt/crm';
    }

    async makeApiRequest(endpoint, data = {}) {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams();
            postData.append('username', this.username);
            postData.append('password', this.password);
            postData.append('user_token', 'dcf1fb235513c6d36b7a700defdee8ab');
            
            // Add additional data
            Object.keys(data).forEach(key => {
                postData.append(key, data[key]);
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

            console.log(`Making request to: ${endpoint}`);

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        console.log(`Response from ${endpoint}:`, JSON.stringify(response, null, 2));
                        resolve(response);
                    } catch (error) {
                        console.error(`Raw response from ${endpoint}:`, responseData);
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

    async getToken() {
        try {
            console.log('Getting user token...');
            // This endpoint might not exist - you may need to check Ovoko documentation
            const response = await this.makeApiRequest('getToken');
            return response;
        } catch (error) {
            console.error('Error getting token:', error.message);
            return null;
        }
    }

    async getCategories() {
        try {
            console.log('Getting categories...');
            const response = await this.makeApiRequest('getCategories');
            return response;
        } catch (error) {
            console.error('Error getting categories:', error.message);
            return null;
        }
    }

    async getCars() {
        try {
            console.log('Getting cars...');
            const response = await this.makeApiRequest('getCars');
            return response;
        } catch (error) {
            console.error('Error getting cars:', error.message);
            return null;
        }
    }

    async getQualityStatuses() {
        try {
            console.log('Getting quality statuses...');
            const response = await this.makeApiRequest('getQualityStatuses');
            return response;
        } catch (error) {
            console.error('Error getting quality statuses:', error.message);
            return null;
        }
    }

    async getPartStatuses() {
        try {
            console.log('Getting part statuses...');
            const response = await this.makeApiRequest('getPartStatuses');
            return response;
        } catch (error) {
            console.error('Error getting part statuses:', error.message);
            return null;
        }
    }
}

async function main() {
    const helper = new OvokoAPIHelper();
    
    console.log('=== Ovoko API Data Retrieval ===\n');
    
    try {
        // Try to get all necessary data
        console.log('1. Attempting to get user token...');
        await helper.getToken();
        
        console.log('\n2. Attempting to get categories...');
        await helper.getCategories();
        
        console.log('\n3. Attempting to get cars...');
        await helper.getCars();
        
        console.log('\n4. Attempting to get quality statuses...');
        await helper.getQualityStatuses();
        
        console.log('\n5. Attempting to get part statuses...');
        await helper.getPartStatuses();
        
    } catch (error) {
        console.error('Main error:', error.message);
    }
    
    console.log('\n=== Instructions ===');
    console.log('1. Check the responses above to find:');
    console.log('   - Your user_token');
    console.log('   - Correct category_id for car parts (look for door/body parts category)');
    console.log('   - Correct car_id for BMW vehicles');
    console.log('   - Quality status ID for "used" parts');
    console.log('   - Status ID for "available" parts');
    console.log('2. Update these values in import_to_ovoko.js');
    console.log('3. Uncomment the import line in the main() function');
    console.log('4. Run the import script');
}

if (require.main === module) {
    main();
}

module.exports = { OvokoAPIHelper };