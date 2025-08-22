const https = require('https');
const { URLSearchParams } = require('url');
const fs = require('fs').promises;

/**
 * Script to fetch orders from Ovoko API using the correct endpoint
 * Based on documentation: https://api.rrr.lt/get/orders/{from_date}/{to_date}
 */

// Ovoko API credentials
const OVOKO_CREDENTIALS = {
    username: 'bavarian',
    password: '5J1iod3cY6zUCkid',
    user_token: 'dcf1fb235513c6d36b7a700defdee8ab'
};

async function makeOvokoRequest(fromDate, toDate) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        
        // Add authentication data
        postData.append('username', OVOKO_CREDENTIALS.username);
        postData.append('password', OVOKO_CREDENTIALS.password);
        postData.append('user_token', OVOKO_CREDENTIALS.user_token);

        const options = {
            hostname: 'api.rrr.lt',
            path: `/get/orders/${fromDate}/${toDate}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'User-Agent': 'Ovoko-Orders-Exporter/1.0'
            }
        };

        console.log(`🚀 Making request to: /get/orders/${fromDate}/${toDate}`);
        console.log('📝 Request data:', JSON.stringify({
            username: OVOKO_CREDENTIALS.username,
            password: '***',
            user_token: '***'
        }, null, 2));

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

async function fetchOrdersForDateRange(fromDate, toDate) {
    console.log(`\n📅 Fetching orders from ${fromDate} to ${toDate}...`);
    
    try {
        const result = await makeOvokoRequest(fromDate, toDate);
        
        if (result.status_code === 'R200') {
            console.log('✅ Successfully fetched orders');
            
            if (result.list && Array.isArray(result.list)) {
                console.log(`📦 Found ${result.list.length} orders`);
                return result.list;
            } else {
                console.log('⚠️ No orders list in response');
                console.log('📋 Response structure:', Object.keys(result));
                return [];
            }
        } else {
            console.log(`❌ Failed to fetch orders: ${result.msg || result.status_code}`);
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

async function getDateRanges() {
    const today = new Date();
    const ranges = [];
    
    // Last 7 days
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    ranges.push({
        name: 'Last 7 days',
        from: lastWeek.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
    });
    
    // Last 30 days
    const lastMonth = new Date(today);
    lastMonth.setDate(today.getDate() - 30);
    ranges.push({
        name: 'Last 30 days',
        from: lastMonth.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
    });
    
    // Last 90 days
    const lastQuarter = new Date(today);
    lastQuarter.setDate(today.getDate() - 90);
    ranges.push({
        name: 'Last 90 days',
        from: lastQuarter.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
    });
    
    // Last year
    const lastYear = new Date(today);
    lastYear.setFullYear(today.getFullYear() - 1);
    ranges.push({
        name: 'Last year',
        from: lastYear.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0]
    });
    
    return ranges;
}

async function main() {
    console.log('🔄 Starting Ovoko Orders Exporter (Correct Endpoint)...\n');
    
    try {
        // Get different date ranges to try
        const dateRanges = await getDateRanges();
        
        let allOrders = [];
        let successfulRanges = 0;
        
        for (const range of dateRanges) {
            console.log(`\n📅 Trying date range: ${range.name} (${range.from} to ${range.to})`);
            
            const orders = await fetchOrdersForDateRange(range.from, range.to);
            
            if (orders && Array.isArray(orders)) {
                console.log(`✅ Successfully fetched ${orders.length} orders for ${range.name}`);
                allOrders = allOrders.concat(orders);
                successfulRanges++;
                
                // Show sample order structure for first successful range
                if (successfulRanges === 1 && orders.length > 0) {
                    console.log(`\n📋 Sample order structure:`);
                    console.log(JSON.stringify(orders[0], null, 2));
                }
            } else {
                console.log(`❌ Failed to fetch orders for ${range.name}`);
            }
            
            // Wait between requests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (allOrders.length > 0) {
            console.log(`\n📊 Summary:`);
            console.log(`- Total orders found: ${allOrders.length}`);
            console.log(`- Successful date ranges: ${successfulRanges}/${dateRanges.length}`);
            
            // Remove duplicates based on order_id
            const uniqueOrders = allOrders.filter((order, index, self) => 
                index === self.findIndex(o => o.order_id === order.order_id)
            );
            
            if (uniqueOrders.length !== allOrders.length) {
                console.log(`- Duplicate orders removed: ${allOrders.length - uniqueOrders.length}`);
                console.log(`- Final unique orders: ${uniqueOrders.length}`);
            }
            
            // Save to file
            const filename = await saveOrdersToFile(uniqueOrders, 'ovoko_orders');
            
            if (filename) {
                console.log('\n🎉 Successfully exported all orders!');
                console.log(`📁 File: ${filename}`);
                console.log(`📊 Total unique orders: ${uniqueOrders.length}`);
            }
        } else {
            console.log('\n⚠️ No orders found in any date range');
            console.log('\n💡 Possible reasons:');
            console.log('- No orders exist in the system');
            console.log('- Date format issue');
            console.log('- Authentication problem');
            console.log('- API endpoint changed');
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
    fetchOrdersForDateRange, 
    saveOrdersToFile 
}; 