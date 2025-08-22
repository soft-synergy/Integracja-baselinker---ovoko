const https = require('https');
const { URLSearchParams } = require('url');
const fs = require('fs').promises;

/**
 * Script to fetch all orders from Ovoko API
 * Based on RRR.lt API documentation: https://api.rrr.lt/docs/
 */

// Ovoko API credentials
const OVOKO_CREDENTIALS = {
    username: 'bavarian',
    password: '5J1iod3cY6zUCkid',
    user_token: 'dcf1fb235513c6d36b7a700defdee8ab',
    baseUrl: 'https://api.rrr.lt'
};

// Available order export endpoints based on documentation
const ORDER_ENDPOINTS = [
    'getOrders',           // Basic orders export
    'getOrdersV2',         // Orders v2 (newer version)
    'getMultiCurrencyOrder', // Multi currency order
    'getMultiCurrencyOrders', // Multi currency orders
    'Orders',              // Alternative naming
    'OrdersV2',            // Alternative naming
    'orders',              // Lowercase
    'orders_v2',           // Underscore format
    'exportOrders',        // Export prefix
    'exportOrdersV2',      // Export prefix v2
    'listOrders',          // List prefix
    'listOrdersV2'         // List prefix v2
];

async function makeOvokoRequest(endpoint, data = {}) {
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
            path: endpoint.startsWith('/') ? endpoint : `/crm/${endpoint}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'User-Agent': 'Ovoko-Orders-Exporter/1.0'
            }
        };

        console.log(`🚀 Making request to: ${endpoint}`);
        if (Object.keys(data).length > 0) {
            console.log('📝 Additional data:', JSON.stringify(data, null, 2));
        }

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log(`📥 Response status: ${res.statusCode}`);
                try {
                    const response = JSON.parse(responseData);
                    resolve(response);
                } catch (error) {
                    console.log('📄 Raw response (not JSON):', responseData.substring(0, 200) + '...');
                    resolve({ raw_response: responseData, status_code: 'PARSE_ERROR' });
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

async function testAllOrderEndpoints() {
    console.log('🔍 Testing all available order export endpoints...\n');
    
    const results = {};
    
    for (const endpoint of ORDER_ENDPOINTS) {
        try {
            console.log(`\n🔄 Testing endpoint: ${endpoint}`);
            const result = await makeOvokoRequest(endpoint);
            
            results[endpoint] = {
                success: result.status_code === 'R200',
                status_code: result.status_code,
                message: result.msg || 'No message',
                data: result
            };
            
            if (result.status_code === 'R200') {
                console.log(`✅ ${endpoint} - SUCCESS`);
                if (result.orders && Array.isArray(result.orders)) {
                    console.log(`📦 Found ${result.orders.length} orders`);
                }
            } else {
                console.log(`❌ ${endpoint} - FAILED: ${result.msg || result.status_code}`);
            }
            
        } catch (error) {
            console.log(`💥 ${endpoint} - ERROR: ${error.message}`);
            results[endpoint] = {
                success: false,
                error: error.message
            };
        }
        
        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
}

async function fetchOrdersV2(fromDate, toDate) {
    console.log(`\n📥 Fetching orders using V2 API from ${fromDate} to ${toDate}`);
    
    try {
        const endpoint = `/v2/get/orders/${fromDate}/${toDate}`;
        const result = await makeOvokoRequest(endpoint);
        
        if (result.status_code === 'R200') {
            console.log('✅ Successfully fetched orders from V2 API');
            
            if (result.list && Array.isArray(result.list)) {
                console.log(`📦 Found ${result.list.length} orders`);
                return result.list;
            } else {
                console.log('⚠️ Unexpected data structure:', Object.keys(result));
                return result;
            }
        } else {
            console.log(`❌ Failed to fetch orders: ${result.msg || result.status_code}`);
            return null;
        }
        
    } catch (error) {
        console.error('💥 Error fetching orders from V2 API:', error.message);
        return null;
    }
}

async function fetchAllOrders(endpoint = 'getOrdersV2') {
    console.log(`\n📥 Fetching all orders using endpoint: ${endpoint}`);
    
    try {
        // First try without any filters
        const result = await makeOvokoRequest(endpoint);
        
        if (result.status_code === 'R200') {
            console.log('✅ Successfully fetched orders');
            
            // Check what data structure we got
            if (result.orders && Array.isArray(result.orders)) {
                console.log(`📦 Found ${result.orders.length} orders`);
                return result.orders;
            } else if (result.data && Array.isArray(result.data)) {
                console.log(`📦 Found ${result.data.length} orders in data field`);
                return result.data;
            } else {
                console.log('⚠️ Unexpected data structure:', Object.keys(result));
                return result;
            }
        } else {
            console.log(`❌ Failed to fetch orders: ${result.msg || result.status_code}`);
            
            // Try with different parameters
            console.log('🔄 Trying with different parameters...');
            
            const resultWithParams = await makeOvokoRequest(endpoint, {
                limit: 1000,
                offset: 0
            });
            
            if (resultWithParams.status_code === 'R200') {
                console.log('✅ Successfully fetched orders with parameters');
                return resultWithParams.orders || resultWithParams.data || resultWithParams;
            }
            
            return null;
        }
        
    } catch (error) {
        console.error('💥 Error fetching orders:', error.message);
        return null;
    }
}

async function saveOrdersToFile(orders, filename) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fullFilename = `${filename}_${timestamp}.json`;
        
        await fs.writeFile(fullFilename, JSON.stringify(orders, null, 2), 'utf8');
        console.log(`💾 Orders saved to: ${fullFilename}`);
        
        return fullFilename;
    } catch (error) {
        console.error('💥 Error saving file:', error.message);
        return null;
    }
}

async function discoverAvailableMethods() {
    console.log('🔍 Discovering available API methods...\n');
    
    // Try to get OpenAPI specification
    try {
        console.log('🔄 Trying to get OpenAPI specification...');
        const openApiResponse = await makeOvokoRequest('openapi/swagger.yaml');
        console.log('📥 OpenAPI response:', openApiResponse);
    } catch (error) {
        console.log('❌ Could not get OpenAPI spec:', error.message);
    }
    
    // Try common discovery endpoints
    const discoveryEndpoints = [
        'methods',
        'endpoints',
        'list',
        'help',
        'info',
        'status'
    ];
    
    for (const endpoint of discoveryEndpoints) {
        try {
            console.log(`🔄 Trying discovery endpoint: ${endpoint}`);
            const result = await makeOvokoRequest(endpoint);
            
            if (result.status_code === 'R200') {
                console.log(`✅ ${endpoint} - SUCCESS:`, result);
            } else {
                console.log(`❌ ${endpoint} - FAILED: ${result.msg || result.status_code}`);
            }
            
        } catch (error) {
            console.log(`💥 ${endpoint} - ERROR: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

async function tryAlternativeOrderEndpoints() {
    console.log('\n🔄 Trying alternative order endpoints...\n');
    
    // Based on documentation, try these variations
    const alternativeEndpoints = [
        'getOrder',
        'getOrderReturn',
        'getOrderReturns',
        'getShippingLabel',
        'getProofOfDelivery',
        'getLogs'
    ];
    
    for (const endpoint of alternativeEndpoints) {
        try {
            console.log(`🔄 Trying: ${endpoint}`);
            const result = await makeOvokoRequest(endpoint);
            
            if (result.status_code === 'R200') {
                console.log(`✅ ${endpoint} - SUCCESS`);
                if (result.orders || result.data) {
                    console.log(`📦 Found data:`, Object.keys(result));
                }
                return endpoint;
            } else {
                console.log(`❌ ${endpoint} - FAILED: ${result.msg || result.status_code}`);
            }
            
        } catch (error) {
            console.log(`💥 ${endpoint} - ERROR: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
}

async function tryGetAvailableData() {
    console.log('\n🔍 Trying to get available data from API...\n');
    
    // Based on documentation, try these info endpoints
    const infoEndpoints = [
        'getCarManufacturers',
        'getCarModels', 
        'getPartCategories',
        'getOrderReturnStatus',
        'getCars',
        'getCarsV2',
        'getPart',
        'getPartsV2'
    ];
    
    const results = {};
    
    for (const endpoint of infoEndpoints) {
        try {
            console.log(`🔄 Trying: ${endpoint}`);
            const result = await makeOvokoRequest(endpoint);
            
            results[endpoint] = {
                success: result.status_code === 'R200',
                status_code: result.status_code,
                message: result.msg || 'No message',
                data: result
            };
            
            if (result.status_code === 'R200') {
                console.log(`✅ ${endpoint} - SUCCESS`);
                if (result.data || result.cars || result.parts || result.manufacturers) {
                    console.log(`📦 Found data:`, Object.keys(result));
                }
            } else {
                console.log(`❌ ${endpoint} - FAILED: ${result.msg || result.status_code}`);
            }
            
        } catch (error) {
            console.log(`💥 ${endpoint} - ERROR: ${error.message}`);
            results[endpoint] = {
                success: false,
                error: error.message
            };
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
}

async function tryDirectOrderAccess() {
    console.log('\n🔄 Trying direct order access methods...\n');
    
    // Try to access orders through different paths
    const directMethods = [
        'order',
        'orders',
        'order/list',
        'orders/list',
        'order/export',
        'orders/export',
        'crm/order',
        'crm/orders'
    ];
    
    for (const method of directMethods) {
        try {
            console.log(`🔄 Trying: ${method}`);
            const result = await makeOvokoRequest(method);
            
            if (result.status_code === 'R200') {
                console.log(`✅ ${method} - SUCCESS`);
                return method;
            } else {
                console.log(`❌ ${method} - FAILED: ${result.msg || result.status_code}`);
            }
            
        } catch (error) {
            console.log(`💥 ${method} - ERROR: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return null;
}

function getDateRange(daysBack = 30) {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysBack);
    
    return {
        fromDate: fromDate.toISOString().split('T')[0], // Y-m-d format
        toDate: toDate.toISOString().split('T')[0]     // Y-m-d format
    };
}

async function main() {
    console.log('🔄 Starting Ovoko Orders Exporter...\n');
    
    try {
        // Try V2 API first
        console.log('🚀 Trying V2 API endpoint...');
        const { fromDate, toDate } = getDateRange(30); // Last 30 days
        const ordersV2 = await fetchOrdersV2(fromDate, toDate);
        
        if (ordersV2 && Array.isArray(ordersV2)) {
            console.log(`\n📊 V2 API Summary:`);
            console.log(`- Date range: ${fromDate} to ${toDate}`);
            console.log(`- Total orders: ${ordersV2.length}`);
            
            if (ordersV2.length > 0) {
                // Show sample order structure
                console.log(`\n📋 Sample order structure from V2 API:`);
                console.log(JSON.stringify(ordersV2[0], null, 2));
                
                // Save to file
                const filename = await saveOrdersToFile(ordersV2, 'ovoko_orders_v2');
                
                if (filename) {
                    console.log('\n🎉 Successfully exported orders using V2 API!');
                    console.log(`📁 File: ${filename}`);
                    console.log(`📊 Total orders: ${ordersV2.length}`);
                    return; // Exit early if V2 API works
                }
            } else {
                console.log('\n⚠️ No orders found in V2 API');
            }
        }
        
        // Fallback to old methods if V2 API fails
        console.log('\n🔄 V2 API failed, trying legacy methods...');
        
        // First try to discover available methods
        await discoverAvailableMethods();
        
        // Try to get available data (categories, cars, etc.)
        const availableData = await tryGetAvailableData();
        
        // Try direct order access
        const directOrderMethod = await tryDirectOrderAccess();
        
        if (directOrderMethod) {
            console.log(`\n✅ Found working direct method: ${directOrderMethod}`);
            
            // Fetch orders using the direct method
            const orders = await fetchAllOrders(directOrderMethod);
            
            if (orders && Array.isArray(orders)) {
                console.log(`\n📊 Summary:`);
                console.log(`- Total orders: ${orders.length}`);
                
                if (orders.length > 0) {
                    // Show sample order structure
                    console.log(`\n📋 Sample order structure:`);
                    console.log(JSON.stringify(orders[0], null, 2));
                    
                    // Save to file
                    const filename = await saveOrdersToFile(orders, 'ovoko_orders');
                    
                    if (filename) {
                        console.log('\n🎉 Successfully exported all orders!');
                        console.log(`📁 File: ${filename}`);
                        console.log(`📊 Total orders: ${orders.length}`);
                    }
                } else {
                    console.log('\n⚠️ No orders found');
                }
            } else {
                console.log('\n❌ Failed to fetch orders in expected format');
                console.log('📋 Response:', JSON.stringify(orders, null, 2));
            }
        } else {
            // Try alternative order endpoints
            const workingEndpoint = await tryAlternativeOrderEndpoints();
            
            if (workingEndpoint) {
                console.log(`\n✅ Found working endpoint: ${workingEndpoint}`);
                
                // Fetch orders using the working endpoint
                const orders = await fetchAllOrders(workingEndpoint);
                
                if (orders && Array.isArray(orders)) {
                    console.log(`\n📊 Summary:`);
                    console.log(`- Total orders: ${orders.length}`);
                    
                    if (orders.length > 0) {
                        // Show sample order structure
                        console.log(`\n📋 Sample order structure:`);
                        console.log(JSON.stringify(orders[0], null, 2));
                        
                        // Save to file
                        const filename = await saveOrdersToFile(orders, 'ovoko_orders');
                        
                        if (filename) {
                            console.log('\n🎉 Successfully exported all orders!');
                            console.log(`📁 File: ${filename}`);
                            console.log(`📊 Total orders: ${orders.length}`);
                        }
                    } else {
                        console.log('\n⚠️ No orders found');
                    }
                } else {
                    console.log('\n❌ Failed to fetch orders in expected format');
                    console.log('📋 Response:', JSON.stringify(orders, null, 2));
                }
            } else {
                // Fallback to testing all endpoints
                console.log('\n🔄 No working alternative endpoints found, testing all endpoints...');
                
                const endpointResults = await testAllOrderEndpoints();
                
                // Find the best working endpoint
                const workingEndpoints = Object.entries(endpointResults)
                    .filter(([_, result]) => result.success)
                    .map(([endpoint, _]) => endpoint);
                
                if (workingEndpoints.length === 0) {
                    console.log('\n❌ No working order export endpoints found');
                    console.log('📋 Endpoint results:', JSON.stringify(endpointResults, null, 2));
                    console.log('\n💡 Suggestions:');
                    console.log('- Check if the API endpoint names have changed');
                    console.log('- Contact Ovoko support for correct endpoint names');
                    console.log('- Check if you need additional permissions for order export');
                    console.log('- The API structure might be different than documented');
                    return;
                }
                
                console.log(`\n✅ Working endpoints: ${workingEndpoints.join(', ')}`);
                
                // Use the first working endpoint (preferably v2)
                const bestEndpoint = workingEndpoints.find(ep => ep.includes('V2')) || workingEndpoints[0];
                console.log(`🎯 Using endpoint: ${bestEndpoint}`);
                
                // Fetch all orders
                const orders = await fetchAllOrders(bestEndpoint);
                
                if (orders && Array.isArray(orders)) {
                    console.log(`\n📊 Summary:`);
                    console.log(`- Total orders: ${orders.length}`);
                    
                    if (orders.length > 0) {
                        // Show sample order structure
                        console.log(`\n📋 Sample order structure:`);
                        console.log(JSON.stringify(orders[0], null, 2));
                        
                        // Save to file
                        const filename = await saveOrdersToFile(orders, 'ovoko_orders');
                        
                        if (filename) {
                            console.log('\n🎉 Successfully exported all orders!');
                            console.log(`📁 File: ${filename}`);
                            console.log(`📊 Total orders: ${orders.length}`);
                        }
                    } else {
                        console.log('\n⚠️ No orders found');
                    }
                } else {
                    console.log('\n❌ Failed to fetch orders in expected format');
                    console.log('📋 Response:', JSON.stringify(orders, null, 2));
                }
            }
        }
        
    } catch (error) {
        console.error('\n💥 CRITICAL ERROR:', error.message);
    }
    
    console.log('\n🏁 Orders export completed');
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { 
    makeOvokoRequest, 
    testAllOrderEndpoints, 
    fetchAllOrders, 
    fetchOrdersV2,
    saveOrdersToFile 
};
