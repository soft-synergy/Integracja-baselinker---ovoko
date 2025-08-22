const https = require('https');
const { URLSearchParams } = require('url');

// Test Ovoko API directly
async function testOvokoAPI() {
    console.log('🧪 Testing Ovoko API directly...');
    
    const postData = new URLSearchParams();
    postData.append('username', 'bavarian');
    postData.append('password', '5J1iod3cY6zUCkid');
    postData.append('user_token', 'dcf1fb235513c6d36b7a700defdee8ab');

    const options = {
        hostname: 'api.rrr.lt',
        path: '/get/orders/2024-01-01/2025-12-31',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData.toString())
        }
    };

    const req = https.request(options, (res) => {
        let responseData = '';

        res.on('data', (chunk) => {
            responseData += chunk;
        });

        res.on('end', () => {
            console.log('📥 Response status:', res.statusCode);
            try {
                const response = JSON.parse(responseData);
                console.log('📋 Response:', response);
                
                if (response.status_code === 'R200' && response.list) {
                    console.log(`✅ Found ${response.list.length} orders`);
                } else {
                    console.log('❌ No orders or error:', response.msg);
                }
            } catch (error) {
                console.log('📄 Raw response:', responseData);
            }
        });
    });

    req.on('error', (error) => {
        console.error('💥 Error:', error.message);
    });

    req.write(postData.toString());
    req.end();
}

// Test local server
async function testLocalServer() {
    console.log('\n🧪 Testing local server...');
    
    try {
        // Test login
        console.log('🔐 Testing login...');
        const loginResponse = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password' })
        });
        
        const loginData = await loginResponse.json();
        console.log('📋 Login response:', loginData);
        
        if (loginData.success) {
            // Test products endpoint
            console.log('\n📦 Testing products endpoint...');
            const productsResponse = await fetch('http://localhost:3000/api/baselinker-products');
            const productsData = await productsResponse.json();
            console.log('📋 Products response status:', productsResponse.status);
            console.log('📋 Products data:', productsData);
        }
        
    } catch (error) {
        console.error('💥 Error testing local server:', error.message);
    }
}

// Run tests
async function main() {
    await testOvokoAPI();
    await testLocalServer();
}

if (require.main === module) {
    main();
} 