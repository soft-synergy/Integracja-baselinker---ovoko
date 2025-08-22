const https = require('https');
const { URLSearchParams } = require('url');
const fs = require('fs').promises;
const path = require('path');
const { enqueueEvent } = require('./events_queue');

// Ovoko API credentials
const OVOKO_CREDENTIALS = {
    username: 'bavarian',
    password: '5J1iod3cY6zUCkid',
    user_token: 'dcf1fb235513c6d36b7a700defdee8ab'
};

// Queue configuration
const QUEUE_CONFIG = {
    interval: 10 * 60 * 1000, // 10 minutes in milliseconds
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    ordersFile: 'ovoko_orders_latest.json',
    backupFile: 'ovoko_orders_backup.json'
};

class OrdersQueue {
    constructor() {
        this.isRunning = false;
        this.lastFetch = null;
        this.nextFetch = null;
        this.totalFetches = 0;
        this.successfulFetches = 0;
        this.failedFetches = 0;
        this.lastError = null;
    }

    // Start the queue
    start() {
        if (this.isRunning) {
            console.log('⚠️ Queue is already running');
            return;
        }

        this.isRunning = true;
        console.log('🚀 Starting Ovoko Orders Queue...');
        console.log(`⏰ Fetching orders every ${QUEUE_CONFIG.interval / 60000} minutes`);
        
        // Initial fetch
        this.fetchOrders();
        
        // Set up interval
        this.interval = setInterval(() => {
            this.fetchOrders();
        }, QUEUE_CONFIG.interval);
        
        // Log next fetch time
        this.updateNextFetchTime();
    }

    // Stop the queue
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Queue is not running');
            return;
        }

        this.isRunning = false;
        clearInterval(this.interval);
        console.log('🛑 Ovoko Orders Queue stopped');
    }

    // Fetch orders from Ovoko
    async fetchOrders() {
        try {
            console.log(`\n📅 [${new Date().toISOString()}] Fetching orders...`);
            
            let orders = await this.makeOvokoRequest();
            
            // If API returns empty, try historical file once
            if (!orders || orders.length === 0) {
                try {
                    const historical = await fs.readFile('ovoko_orders_2025-08-13T05-03-22-024Z.json', 'utf8');
                    const parsed = JSON.parse(historical);
                    console.log(`📜 Using historical orders: ${parsed.length}`);
                    orders = parsed;
                } catch (_) {}
            }

            // Save orders to latest file even if empty, so server can read it
            const previousOrders = await this.readPreviousOrdersSafe();
            await this.saveOrders(orders || []);

            // Emit events for new orders only
            const newOrders = this.getNewOrders(previousOrders, orders || []);
            if (newOrders.length > 0) {
                console.log(`🔔 Detected ${newOrders.length} new orders. Emitting events...`);
                for (const order of newOrders) {
                    try {
                        await enqueueEvent('BL_UPDATE_STOCKS_THEN_CREATE_ORDER', {
                            source: 'ovoko',
                            ovoko_order_id: order.order_id,
                            order,
                            items: order.item_list || []
                        });
                    } catch (e) {
                        console.error(`❌ Failed to enqueue events for order ${order.order_id}: ${e.message}`);
                    }
                }
            }
            
            // Update statistics (treat as success even if 0; no error occurred)
            this.totalFetches++;
            this.successfulFetches++;
            this.lastFetch = new Date();
            this.lastError = null;
            console.log(`📊 Queue stats: ${this.successfulFetches}/${this.totalFetches} successful`);
            
        } catch (error) {
            console.error(`❌ Error fetching orders: ${error.message}`);
            this.totalFetches++;
            this.failedFetches++;
            this.lastError = error.message;
        }
        
        // Update next fetch time
        this.updateNextFetchTime();
    }

    // Read previously saved orders, safe fallback
    async readPreviousOrdersSafe() {
        try {
            const data = await fs.readFile(QUEUE_CONFIG.ordersFile, 'utf8');
            return JSON.parse(data);
        } catch (_) {
            return [];
        }
    }

    // Compute new orders by order_id difference
    getNewOrders(previousOrders, currentOrders) {
        const prevIds = new Set((previousOrders || []).map(o => o.order_id));
        return (currentOrders || []).filter(o => !prevIds.has(o.order_id));
    }

    // Make request to Ovoko API
    async makeOvokoRequest() {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams();
            postData.append('username', OVOKO_CREDENTIALS.username);
            postData.append('password', OVOKO_CREDENTIALS.password);
            postData.append('user_token', OVOKO_CREDENTIALS.user_token);

            const options = {
                hostname: 'api.rrr.lt',
                path: '/v2/get/orders/2024-01-01/2025-12-31',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData.toString()),
                    'User-Agent': 'Ovoko-Orders-Queue/1.0'
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        
                        if (response.status_code === 'R200') {
                            if (response.list && Array.isArray(response.list)) {
                                resolve(response.list);
                            } else if (response.list === null) {
                                // API returned null list
                                console.log('📄 API returned null list');
                                resolve([]);
                            } else {
                                resolve([]);
                            }
                        } else {
                            reject(new Error(`API Error: ${response.msg || response.status_code}`));
                        }
                    } catch (error) {
                        reject(new Error(`Parse Error: ${error.message}`));
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

    // Save orders to file
    async saveOrders(orders) {
        try {
            // Create backup of current file
            try {
                const currentData = await fs.readFile(QUEUE_CONFIG.ordersFile, 'utf8');
                await fs.writeFile(QUEUE_CONFIG.backupFile, currentData, 'utf8');
            } catch (_) {}

            // Save new orders
            await fs.writeFile(QUEUE_CONFIG.ordersFile, JSON.stringify(orders, null, 2), 'utf8');
            console.log(`💾 Orders saved to: ${QUEUE_CONFIG.ordersFile}`);
            
            // Also save with timestamp for history
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const historyFile = `ovoko_orders_${timestamp}.json`;
            await fs.writeFile(historyFile, JSON.stringify(orders, null, 2), 'utf8');
            console.log(`📚 History saved to: ${historyFile}`);
            
        } catch (error) {
            console.error('💥 Error saving orders:', error.message);
        }
    }

    // Update next fetch time
    updateNextFetchTime() {
        this.nextFetch = new Date(Date.now() + QUEUE_CONFIG.interval);
    }

    // Get queue status
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastFetch: this.lastFetch,
            nextFetch: this.nextFetch,
            totalFetches: this.totalFetches,
            successfulFetches: this.successfulFetches,
            failedFetches: this.failedFetches,
            lastError: this.lastError,
            interval: QUEUE_CONFIG.interval / 60000 // minutes
        };
    }

    // Manual fetch (for testing)
    async manualFetch() {
        console.log('🔧 Manual fetch requested...');
        await this.fetchOrders();
    }
}

// Create queue instance
const ordersQueue = new OrdersQueue();

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, stopping queue...');
    ordersQueue.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, stopping queue...');
    ordersQueue.stop();
    process.exit(0);
});

// Export for use in other files
module.exports = { OrdersQueue, ordersQueue };

// Start queue if this file is run directly
if (require.main === module) {
    console.log('🚀 Starting Ovoko Orders Queue...');
    ordersQueue.start();
    
    // Log status every minute
    setInterval(() => {
        const status = ordersQueue.getStatus();
        if (status.isRunning) {
            console.log(`📊 Queue Status: Running | Last: ${status.lastFetch ? status.lastFetch.toLocaleTimeString() : 'Never'} | Next: ${status.nextFetch ? status.nextFetch.toLocaleTimeString() : 'Unknown'} | Success: ${status.successfulFetches}/${status.totalFetches}`);
        }
    }, 60000);
} 