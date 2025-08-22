const fs = require('fs').promises;
const https = require('https');

// OVOKO credentials
const OVOKO_CREDENTIALS = {
    username: 'bmw@bavariaparts.pl',
    password: 'Bavaria2024!',
    user_token: 'your-token-here' // You need to get this from OVOKO
};

// BaseLinker token
const BASELINKER_TOKEN = process.env.BASELINKER_TOKEN || 'your-token-here';

async function importSpecificProduct() {
    console.log('🚀 Importing specific product from BaseLinker to OVOKO...\n');
    
    try {
        // Load BaseLinker products
        const baselinkerProducts = JSON.parse(await fs.readFile('baselinker_products_latest.json', 'utf8'));
        
        // Find the specific product (SKU: 10914341)
        const product = baselinkerProducts.find(p => p.sku === '10914341');
        
        if (!product) {
            console.log('❌ Product with SKU 10914341 not found in BaseLinker!');
            return;
        }
        
        console.log(`📦 Found product: ${product.text_fields.name}`);
        console.log(`- SKU: ${product.sku}`);
        console.log(`- Price: ${Object.values(product.prices)[0]} PLN`);
        console.log(`- Stock: ${Object.values(product.stock)[0]}`);
        console.log('');
        
        // Prepare product data for OVOKO
        const postData = new URLSearchParams();
        postData.append('username', OVOKO_CREDENTIALS.username);
        postData.append('password', OVOKO_CREDENTIALS.password);
        postData.append('user_token', OVOKO_CREDENTIALS.user_token);
        postData.append('category_id', '55'); // BMW category
        postData.append('car_id', '291'); // BMW car
        postData.append('quality', '1'); // Used
        postData.append('status', '0'); // Active
        postData.append('external_id', product.sku);
        postData.append('price', Object.values(product.prices)[0]);
        postData.append('original_currency', 'PLN');
        
        // Add photos if available
        if (product.images && Object.keys(product.images).length > 0) {
            const firstImage = Object.values(product.images)[0];
            postData.append('photo', firstImage);
            
            // Add all images to photos array
            Object.values(product.images).forEach((image, index) => {
                postData.append(`photos[${index}]`, image);
            });
        }
        
        // Add optional codes
        if (product.text_fields.features && product.text_fields.features['Numer katalogowy części']) {
            postData.append('optional_codes[0]', product.text_fields.features['Numer katalogowy części']);
        }
        
        console.log('📤 Sending to OVOKO API...');
        console.log('Data being sent:');
        console.log('- external_id:', product.sku);
        console.log('- price:', Object.values(product.prices)[0]);
        console.log('- photos:', Object.keys(product.images).length);
        console.log('');
        
        const options = {
            hostname: 'api.rrr.lt',
            path: '/crm/importPart',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString())
            }
        };
        
        const result = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        resolve(response);
                    } catch (error) {
                        reject(new Error('Invalid response format'));
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.write(postData.toString());
            req.end();
        });
        
        console.log('📥 OVOKO Response:', JSON.stringify(result, null, 2));
        
        if (result.status_code === 'R200') {
            console.log(`✅ Product imported successfully!`);
            console.log(`- OVOKO Part ID: ${result.part_id}`);
            
            // Update sync status
            const syncStatus = JSON.parse(await fs.readFile('sync_status.json', 'utf8'));
            syncStatus.synced_products[product.sku] = {
                ovoko_part_id: result.part_id,
                synced_at: new Date().toISOString(),
                product_name: product.text_fields.name
            };
            await fs.writeFile('sync_status.json', JSON.stringify(syncStatus, null, 2));
            
            console.log(`✅ Sync status updated!`);
            console.log(`Now you can test the order mapping again.`);
            
        } else {
            console.log(`❌ Import failed: ${result.msg}`);
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
    }
}

// Run the import
importSpecificProduct().catch(console.error); 