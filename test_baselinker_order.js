const https = require('https');

// Test order data that matches the BaseLinker API requirements
const testOrderData = {
    order_status_id: 196601,
    date_add: Math.floor(Date.now() / 1000),
    currency: "PLN",
    payment_method: "other",
    payment_method_cod: "0",
    paid: "0",
    user_comments: "Test order from OVOKO",
    admin_comments: "Test order - ID: test-123 - Source: ovoko",
    extra_field_1: "ovoko",
    email: "test@example.com",
    phone: "123456789",
    user_login: "testuser",
    delivery_method: "Standard delivery",
    delivery_price: "10.00",
    delivery_fullname: "John Doe",
    delivery_company: "Test Company",
    delivery_address: "Test Street 123",
    delivery_city: "Test City",
    delivery_postcode: "00-000",
    delivery_country_code: "PL",
    delivery_state: "",
    want_invoice: "0",
    products: [
        {
            storage: "db",
            storage_id: 0,
            product_id: "test-product-1",
            name: "Test Product",
            sku: "TEST-SKU-001",
            price_brutto: 25.00,
            tax_rate: 23,
            quantity: 1,
            weight: 0.5
        }
    ]
};

// BaseLinker API call function (copied from server.js)
async function createOrderInBaseLinker(orderData) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        postData.append('token', process.env.BASELINKER_TOKEN || 'your-token-here');
        postData.append('method', 'addOrder');
        postData.append('parameters', JSON.stringify(orderData));

        const options = {
            hostname: 'api.baselinker.com',
            path: '/connector.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'X-BLToken': process.env.BASELINKER_TOKEN || 'your-token-here'
            }
        };

        console.log(`🚀 Sending test order to BaseLinker: ${JSON.stringify(orderData, null, 2)}`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`📥 BaseLinker response: ${JSON.stringify(json, null, 2)}`);
                    
                    if (json.status === 'SUCCESS') {
                        console.log(`✅ SUCCESS! Order created with ID: ${json.order_id}`);
                        resolve({
                            success: true,
                            order_id: json.order_id
                        });
                    } else {
                        console.log(`❌ ERROR: ${json.error_message} (Code: ${json.error_code})`);
                        resolve({
                            success: false,
                            error: json.error_message || 'addOrder failed'
                        });
                    }
                } catch (e) {
                    console.log(`❌ ERROR: Invalid JSON response from BaseLinker`);
                    resolve({
                        success: false,
                        error: 'Invalid JSON response from BaseLinker'
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.log(`❌ ERROR: ${error.message}`);
            resolve({
                success: false,
                error: error.message
            });
        });

        req.write(postData.toString());
        req.end();
    });
}

// Run the test
async function runTest() {
    console.log('🧪 Testing BaseLinker order creation...');
    console.log('Make sure you have BASELINKER_TOKEN environment variable set!');
    
    const result = await createOrderInBaseLinker(testOrderData);
    
    if (result.success) {
        console.log('🎉 Test PASSED! Order created successfully.');
    } else {
        console.log('💥 Test FAILED! Error:', result.error);
    }
}

runTest().catch(console.error); 