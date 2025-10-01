const { SmartInventorySynchronizer } = require('./smart_inventory_sync');

const SMART_SYNC_CONFIG = {
    interval: 10 * 60 * 1000, // 10 minutes in milliseconds
    enabled: true
};

class SmartSyncScheduler {
    constructor() {
        this.isRunning = false;
        this.lastRun = null;
        this.nextRun = null;
        this.totalRuns = 0;
        this.lastError = null;
        this.interval = null;
        
        // Configuration
        this.baselinkerToken = '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F';
        this.ovokoCredentials = {
            username: 'bavarian',
            password: '5J1iod3cY6zUCkid',
            userToken: 'dcf1fb235513c6d36b7a700defdee8ab'
        };
        
        // Initialize synchronizer - default to ALL warehouses like CLI "wszystkie"
        this.synchronizer = new SmartInventorySynchronizer(
            this.baselinkerToken,
            this.ovokoCredentials,
            { syncAllWarehouses: true }
        );
    }

    start() {
        if (this.isRunning) {
            console.log('⚠️ Smart sync scheduler already running');
            return;
        }
        
        if (!SMART_SYNC_CONFIG.enabled) {
            console.log('⚠️ Smart sync scheduler is disabled in config');
            return;
        }
        
        this.isRunning = true;
        console.log('🚀 Starting Smart Sync Scheduler...');
        console.log(`⏰ Running smart sync every ${SMART_SYNC_CONFIG.interval / 60000} minutes`);

        // Run immediately on start
        this.runOnce();
        
        // Set up interval for subsequent runs
        this.interval = setInterval(() => this.runOnce(), SMART_SYNC_CONFIG.interval);
        this.updateNextRunTime();
        
        console.log('✅ Smart sync scheduler started successfully');
    }

    stop() {
        if (!this.isRunning) return;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.isRunning = false;
        console.log('🛑 Smart sync scheduler stopped');
    }

    async runOnce() {
        try {
            console.log(`\n🔄 [${new Date().toISOString()}] Starting smart inventory sync...`);
            
            const result = await this.synchronizer.runSmartSync();
            
            this.totalRuns += 1;
            this.lastRun = new Date();
            this.lastError = null;
            this.updateNextRunTime();
            
            console.log(`✅ Smart sync completed successfully in run #${this.totalRuns}`);
            return result;
            
        } catch (error) {
            console.error(`💥 Smart sync error in run #${this.totalRuns + 1}:`, error.message);
            
            this.totalRuns += 1;
            this.lastRun = new Date();
            this.lastError = error.message;
            this.updateNextRunTime();
            
            throw error;
        }
    }

    updateNextRunTime() {
        if (this.isRunning && this.interval) {
            this.nextRun = new Date(Date.now() + SMART_SYNC_CONFIG.interval);
        } else {
            this.nextRun = null;
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            nextRun: this.nextRun,
            totalRuns: this.totalRuns,
            lastError: this.lastError,
            interval: SMART_SYNC_CONFIG.interval,
            intervalMinutes: SMART_SYNC_CONFIG.interval / 60000,
            enabled: SMART_SYNC_CONFIG.enabled
        };
    }

    // Method to manually trigger a sync
    async triggerSync() {
        if (!this.isRunning) {
            throw new Error('Smart sync scheduler is not running');
        }
        
        console.log('🔄 Manually triggering smart sync...');
        return await this.runOnce();
    }
    


    // Method to update configuration
    updateConfig(newConfig) {
        if (newConfig.interval) {
            const newInterval = newConfig.interval * 60 * 1000; // Convert minutes to milliseconds
            SMART_SYNC_CONFIG.interval = newInterval;
            
            // Restart scheduler with new interval if running
            if (this.isRunning) {
                this.stop();
                this.start();
            }
        }
        
        if (newConfig.enabled !== undefined) {
            SMART_SYNC_CONFIG.enabled = newConfig.enabled;
            
            if (!SMART_SYNC_CONFIG.enabled && this.isRunning) {
                this.stop();
            } else if (SMART_SYNC_CONFIG.enabled && !this.isRunning) {
                this.start();
            }
        }
        
        console.log('✅ Smart sync configuration updated');
        return this.getStatus();
    }
}

// Create singleton instance
const smartSyncScheduler = new SmartSyncScheduler();

// Export both the class and the singleton instance
module.exports = { 
    SmartSyncScheduler, 
    smartSyncScheduler 
}; 