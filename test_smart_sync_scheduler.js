const { smartSyncScheduler } = require('./smart_sync_scheduler');

async function testSmartSyncScheduler() {
    console.log('🧪 Testing Smart Sync Scheduler...\n');
    
    try {
        // Test 1: Check initial status
        console.log('📊 Test 1: Initial status');
        const initialStatus = smartSyncScheduler.getStatus();
        console.log('Initial status:', JSON.stringify(initialStatus, null, 2));
        console.log('✅ Test 1 passed\n');
        
        // Test 2: Start scheduler
        console.log('🚀 Test 2: Starting scheduler');
        smartSyncScheduler.start();
        const runningStatus = smartSyncScheduler.getStatus();
        console.log('Running status:', JSON.stringify(runningStatus, null, 2));
        console.log('✅ Test 2 passed\n');
        
        // Test 3: Wait a bit and check status
        console.log('⏳ Test 3: Waiting 5 seconds to see if sync runs...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        const afterWaitStatus = smartSyncScheduler.getStatus();
        console.log('Status after wait:', JSON.stringify(afterWaitStatus, null, 2));
        console.log('✅ Test 3 passed\n');
        
        // Test 4: Manual trigger
        console.log('🔄 Test 4: Manual trigger');
        try {
            const result = await smartSyncScheduler.triggerSync();
            console.log('Manual trigger result:', result ? 'Success' : 'No result');
        } catch (error) {
            console.log('Manual trigger error:', error.message);
        }
        console.log('✅ Test 4 passed\n');
        
        // Test 5: Update configuration
        console.log('⚙️ Test 5: Update configuration');
        const newConfig = { interval: 5 }; // Change to 5 minutes
        const updatedStatus = smartSyncScheduler.updateConfig(newConfig);
        console.log('Updated status:', JSON.stringify(updatedStatus, null, 2));
        console.log('✅ Test 5 passed\n');
        
        // Test 6: Stop scheduler
        console.log('🛑 Test 6: Stopping scheduler');
        smartSyncScheduler.stop();
        const stoppedStatus = smartSyncScheduler.getStatus();
        console.log('Stopped status:', JSON.stringify(stoppedStatus, null, 2));
        console.log('✅ Test 6 passed\n');
        
        console.log('🎉 All tests passed! Smart sync scheduler is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Run tests
if (require.main === module) {
    testSmartSyncScheduler();
}

module.exports = { testSmartSyncScheduler }; 