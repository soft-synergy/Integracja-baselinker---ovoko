#!/usr/bin/env node

console.log('🧪 QUICK TEST - System Synchronizacji Stanów Magazynowych');
console.log('=' .repeat(60));

// Import test functions
const { SyncSystemTester } = require('./test_sync_system');

// Configuration (already set up)
const CONFIG = {
    baselinkerToken: '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F',
    ovoko: {
            username: 'bavarian',
    password: '5J1iod3cY6zUCkid',
    userToken: 'dcf1fb235513c6d36b7a700defdee8ab'
    }
};

// Simple Ovoko connection test
async function testOvokoConnection() {
    const https = require('https');
    const { URLSearchParams } = require('url');
    
    return new Promise((resolve) => {
        const postData = new URLSearchParams();
        postData.append('username', CONFIG.ovoko.username);
        postData.append('password', CONFIG.ovoko.password);
        postData.append('user_token', CONFIG.ovoko.userToken);
        
        const options = {
            hostname: 'api.rrr.lt',
            path: '/crm/getCategories', // Use a simple endpoint that should work
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString())
            }
        };
        
        console.log('🔌 Testing Ovoko connection with getCategories endpoint...');
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    if (response.status_code === 'R200') {
                        console.log('✅ Ovoko connection successful!');
                        resolve(true);
                    } else {
                        console.log(`⚠️ Ovoko responded but with status: ${response.status_code}`);
                        console.log(`Message: ${response.msg || 'No message'}`);
                        resolve(false);
                    }
                } catch (error) {
                    console.log('📄 Raw response:', responseData.substring(0, 200));
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.error('❌ Ovoko connection failed:', error.message);
            resolve(false);
        });
        
        req.write(postData.toString());
        req.end();
    });
}

async function quickTest() {
    try {
        console.log('🚀 Starting quick test...\n');
        
        const tester = new SyncSystemTester(CONFIG);
        
        // Test 1: BaseLinker connection
        console.log('1️⃣  Testing BaseLinker connection...');
        const baselinkerOk = await tester.testBaseLinkerConnection();
        
        // Test 2: Ovoko connection (simplified)
        console.log('\n2️⃣  Testing Ovoko connection...');
        const ovokoOk = await testOvokoConnection();
        
        // Test 3: Quick analysis (only if both connections work)
        if (baselinkerOk && ovokoOk) {
            console.log('\n3️⃣  Testing product analysis...');
            await tester.testProductAnalysis();
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('📊 QUICK TEST RESULTS:');
        console.log('=' .repeat(60));
        console.log(`✅ BaseLinker: ${baselinkerOk ? 'OK' : 'FAILED'}`);
        console.log(`✅ Ovoko: ${ovokoOk ? 'OK' : 'FAILED'}`);
        
        if (baselinkerOk && ovokoOk) {
            console.log('\n🎉 SYSTEM READY! You can now run:');
            console.log('  node run_inventory_sync.js full    - Full synchronization');
            console.log('  node run_inventory_sync.js quick   - Quick synchronization');
            console.log('  node test_sync_system.js dryrun    - Test without deletion');
        } else {
            console.log('\n❌ SYSTEM NOT READY! Fix the connection issues first.');
            if (!ovokoOk) {
                console.log('\n💡 Ovoko connection issue - check if:');
                console.log('   - user_token is correct');
                console.log('   - endpoint /crm/getCategories exists');
                console.log('   - credentials are valid');
            }
        }
        
    } catch (error) {
        console.error('\n💥 Quick test failed:', error.message);
    }
}

// Run the test
quickTest(); 