const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');

const ORDERS_SYNC_CONFIG = {
    interval: 10 * 60 * 1000, // 10 minutes in milliseconds
    enabled: true,
    lastSyncDate: null
};

class OrdersSyncScheduler {
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
    }

    start() {
        if (this.isRunning) {
            console.log('⚠️ Orders sync scheduler already running');
            return;
        }
        
        if (!ORDERS_SYNC_CONFIG.enabled) {
            console.log('⚠️ Orders sync scheduler is disabled in config');
            return;
        }
        
        this.isRunning = true;
        console.log('🚀 Starting Orders Sync Scheduler...');
        console.log(`⏰ Running orders sync every ${ORDERS_SYNC_CONFIG.interval / 60000} minutes`);

        // Run immediately on start
        this.runOnce();
        
        // Set up interval for subsequent runs
        this.interval = setInterval(() => this.runOnce(), ORDERS_SYNC_CONFIG.interval);
        this.updateNextRunTime();
        
        console.log('✅ Orders sync scheduler started successfully');
    }

    stop() {
        if (!this.isRunning) return;
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.isRunning = false;
        console.log('🛑 Orders sync scheduler stopped');
    }

    async runOnce() {
        try {
            console.log(`\n🔄 [${new Date().toISOString()}] Starting automatic orders sync from Ovoko to BaseLinker...`);
            
            const result = await this.syncOrdersFromOvoko();
            
            this.totalRuns += 1;
            this.lastRun = new Date();
            this.lastError = null;
            this.updateNextRunTime();
            
            console.log(`✅ Orders sync completed successfully in run #${this.totalRuns}`);
            return result;
            
        } catch (error) {
            console.error(`💥 Orders sync error in run #${this.totalRuns + 1}:`, error.message);
            
            this.totalRuns += 1;
            this.lastRun = new Date();
            this.lastError = error.message;
            this.updateNextRunTime();
            
            throw error;
        }
    }

    async syncOrdersFromOvoko() {
        try {
            // Get current date
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            
            // If we already synced today, skip
            if (ORDERS_SYNC_CONFIG.lastSyncDate === today) {
                console.log(`⏭️  Already synced orders today (${today}), skipping...`);
                return { status: 'skipped', reason: 'Already synced today' };
            }

            console.log(`🔄 Fetching orders from Ovoko V2 API for today (${today})...`);
            
            // Fetch orders from V2 API for today
            const result = await this.fetchOvokoOrdersV2(today, today);
            
            if (result.status_code === 'R200' && result.list && Array.isArray(result.list)) {
                console.log(`✅ Successfully fetched ${result.list.length} orders from V2 API`);
                
                if (result.list.length === 0) {
                    console.log(`ℹ️  No new orders found for today`);
                    ORDERS_SYNC_CONFIG.lastSyncDate = today;
                    return { status: 'success', ordersCount: 0, message: 'No new orders found' };
                }
                
                // Transform orders to internal format
                const transformedOrders = result.list.map(this.transformV2OrderToInternal);
                
                // Save to file
                const filename = `ovoko_orders_v2_${today}.json`;
                await fs.writeFile(filename, JSON.stringify(transformedOrders, null, 2), 'utf8');
                console.log(`💾 Orders saved to: ${filename}`);
                
                // Also update latest file
                await fs.writeFile('ovoko_orders_latest.json', JSON.stringify(transformedOrders, null, 2), 'utf8');
                console.log(`💾 Latest orders updated`);
                
                // Automatically sync new orders to BaseLinker
                console.log(`🔄 Starting automatic sync of ${transformedOrders.length} orders to BaseLinker...`);
                const syncResults = await this.autoSyncOrdersToBaseLinker(transformedOrders);
                console.log(`✅ Auto-sync completed: ${syncResults.synced} synced, ${syncResults.failed} failed`);
                
                // Update last sync date
                ORDERS_SYNC_CONFIG.lastSyncDate = today;
                
                return {
                    status: 'success',
                    ordersCount: transformedOrders.length,
                    filename: filename,
                    syncResults: syncResults,
                    message: `Successfully fetched ${transformedOrders.length} orders from V2 API and synced to BaseLinker`
                };
            } else {
                throw new Error(result.msg || 'Failed to fetch orders from V2 API');
            }
            
        } catch (error) {
            console.error('💥 Error in orders sync:', error.message);
            throw error;
        }
    }

    async fetchOvokoOrdersV2(fromDate, toDate) {
        return new Promise((resolve, reject) => {
                    const postData = new URLSearchParams();
        
        // Add authentication data
        postData.append('username', this.ovokoCredentials.username);
        postData.append('password', this.ovokoCredentials.password);
        postData.append('user_token', this.ovokoCredentials.userToken);

                    const options = {
            hostname: 'api.rrr.lt',
            path: `/v2/get/orders/${fromDate}/${toDate}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'User-Agent': 'Ovoko-Orders-Exporter/2.0'
            }
        };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        reject(new Error('Invalid JSON from Ovoko API'));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData.toString());
            req.end();
        });
    }

    transformV2OrderToInternal(v2Order) {
        return {
            order_id: v2Order.id,
            client_name: v2Order.client?.name || v2Order.customer?.name || '',
            client_email: v2Order.client?.email || v2Order.customer?.email || '',
            client_phone: v2Order.client?.phone || v2Order.customer?.phone || '',
            customer_email: v2Order.client?.email || v2Order.customer?.email || '',
            customer_name: v2Order.client?.name || v2Order.customer?.name || '',
            customer_comment: v2Order.comment || '',
            order_status: v2Order.status || 'NEW',
            order_date: v2Order.date || new Date().toISOString(),
            total_price_buyer: v2Order.total_price?.buyer?.amount || v2Order.total_price_buyer || '0',
            total_price_seller: v2Order.total_price?.seller?.amount || v2Order.total_price_seller || '0',
            currency: v2Order.total_price?.buyer?.currency || v2Order.currency || 'PLN',
            payment_method: v2Order.payment_method || v2Order.payment_type || 'other',
            payment_type: v2Order.payment_method || v2Order.payment_type || 'other',
            shipping_price_buyer: v2Order.shipping_price?.buyer?.amount || v2Order.shipping_price_buyer || '0',
            shipping_price_seller: v2Order.shipping_price?.seller?.amount || v2Order.shipping_price_seller || '0',
            shipping_provider: v2Order.shipping_provider || '',
            vat_rate: v2Order.vat_amount?.amount || '23',
            vat_amount: v2Order.vat_amount?.amount || '0',
            vat_type: v2Order.vat_amount?.type || '%',
            item_list: (v2Order.items || []).map(item => ({
                id: item.id,
                name: item.name,
                external_id: item.external_id,
                id_bridge: item.id_bridge,
                quantity: item.quantity || 1,
                sell_price: {
                    buyer: { amount: item.price?.buyer?.amount || item.sell_price_buyer || '0' },
                    seller: { amount: item.price?.seller?.amount || item.sell_price_seller || '0' }
                },
                sell_price_buyer: item.price?.buyer?.amount || item.sell_price_buyer || '0',
                sell_price_seller: item.price?.seller?.amount || item.sell_price_seller || '0',
                price: item.price || { buyer: { amount: item.sell_price_buyer || '0' }, seller: { amount: item.sell_price_seller || '0' } }
            }))
        };
    }

    async autoSyncOrdersToBaseLinker(orders) {
        const results = {
            synced: 0,
            failed: 0,
            details: []
        };
        
        console.log(`🔄 Starting auto-sync of ${orders.length} orders to BaseLinker...`);
        
        for (const order of orders) {
            try {
                console.log(`🔄 Syncing order ${order.order_id} to BaseLinker...`);
                
                // Check if order is already synced
                const syncStatus = await this.loadSyncStatus();
                if (syncStatus.synced_orders && syncStatus.synced_orders[order.order_id]) {
                    console.log(`⏭️  Order ${order.order_id} already synced, skipping...`);
                    results.details.push({
                        orderId: order.order_id,
                        status: 'skipped',
                        reason: 'Already synced',
                        baselinkerOrderId: syncStatus.synced_orders[order.order_id].baselinker_order_id
                    });
                    continue;
                }
                
                // Map order to BaseLinker format
                const baselinkerOrder = await this.mapOrderToBaseLinker(order);
                
                // Send to BaseLinker
                const result = await this.createOrderInBaseLinker(baselinkerOrder);
                
                if (result.success) {
                    console.log(`✅ Order ${order.order_id} synced successfully to BaseLinker with ID: ${result.order_id}`);
                    
                    // Update sync status
                    if (!syncStatus.synced_orders) syncStatus.synced_orders = {};
                    syncStatus.synced_orders[order.order_id] = {
                        baselinker_order_id: result.order_id,
                        synced_at: new Date().toISOString(),
                        order_data: {
                            customer_name: order.client_name || order.customer_name,
                            total_value: order.total_price_buyer,
                            items_count: order.item_list?.length || 0
                        }
                    };
                    
                    await fs.writeFile('sync_status.json', JSON.stringify(syncStatus, null, 2));
                    
                    results.synced++;
                    results.details.push({
                        orderId: order.order_id,
                        status: 'success',
                        baselinkerOrderId: result.order_id
                    });
                } else {
                    console.log(`❌ Failed to sync order ${order.order_id}: ${result.error}`);
                    results.failed++;
                    results.details.push({
                        orderId: order.order_id,
                        status: 'failed',
                        error: result.error
                    });
                }
                
                // Add small delay to avoid overwhelming BaseLinker API
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`💥 Error syncing order ${order.order_id}:`, error.message);
                results.failed++;
                results.details.push({
                    orderId: order.order_id,
                    status: 'error',
                    error: error.message
                });
            }
        }
        
        console.log(`✅ Auto-sync completed: ${results.synced} synced, ${results.failed} failed`);
        return results;
    }

    async loadSyncStatus() {
        try {
            const content = await fs.readFile('sync_status.json', 'utf8');
            return JSON.parse(content);
        } catch (_) {
            return { synced_products: {}, synced_orders: {} };
        }
    }

    async mapOrderToBaseLinker(order) {
        // Load BaseLinker products once to map by SKU
        let baselinkerProducts = [];
        try {
            const latest = await fs.readFile('baselinker_products_latest.json', 'utf8');
            baselinkerProducts = JSON.parse(latest);
        } catch (_) {
            try {
                const fallback = await fs.readFile('baselinker_products_2025-08-09T06-31-13-827Z.json', 'utf8');
                baselinkerProducts = JSON.parse(fallback);
            } catch (e) {
                console.log('⚠️  Could not load BaseLinker products cache, proceeding without enrichment');
            }
        }

        const productBySku = new Map();
        for (const p of baselinkerProducts) {
            if (p && p.sku) {
                productBySku.set(p.sku.toString(), p);
            }
        }

        const syncStatus = await this.loadSyncStatus();

        const products = (await Promise.all((order.item_list || []).map(async item => {
            // Determine SKU for lookup: prefer external_id, then id_bridge, finally mapping from sync status by ovoko_part_id
            let resolvedSku = null;
            if (item.external_id) {
                resolvedSku = item.external_id.toString();
            } else if (item.id_bridge) {
                resolvedSku = item.id_bridge.toString();
            } else {
                for (const [sku, status] of Object.entries(syncStatus.synced_products || {})) {
                    if (status.ovoko_part_id == item.id) {
                        resolvedSku = sku.toString();
                        break;
                    }
                }
            }

            const blProduct = resolvedSku ? productBySku.get(resolvedSku) : null;

            // Extract price from BaseLinker product if available, otherwise fall back to order item buyer price
            let priceBrutto = 0;
            if (blProduct && blProduct.prices) {
                const prices = Object.values(blProduct.prices);
                if (prices.length > 0) {
                    priceBrutto = parseFloat(prices[0] || '0');
                }
            }
            if (!priceBrutto) {
                const buyerAmount = item.sell_price?.buyer?.amount || item.sell_price_buyer;
                priceBrutto = parseFloat(buyerAmount || '0');
            }

            const productName = blProduct?.text_fields?.name || item.name || 'Unknown product';
            const sku = resolvedSku || item.id?.toString() || '';
            const quantity = parseInt(item.quantity || '1');
            const taxRate = parseFloat((order.vat_amount && order.vat_amount.amount) ? order.vat_amount.amount : '23');

            return {
                storage: 'db',
                storage_id: 0,
                product_id: blProduct?.id || 0,
                name: productName,
                sku: sku,
                price_brutto: priceBrutto,
                tax_rate: taxRate,
                quantity: quantity,
                weight: 0
            };
        }))).filter(Boolean);

        // Order-level fields mapped from Ovoko structure
        const currency = order.item_list?.[0]?.sell_price?.buyer?.currency || order.item_list?.[0]?.sell_price?.seller?.currency || 'PLN';
        const deliveryPrice = parseFloat(order.shipping_price?.buyer?.amount || order.shipping_price_buyer || '0');
        const deliveryMethod = order.item_list?.[0]?.delivery_type || (order.shipping_provider ? 'courier' : 'Standard delivery');
        const taxRateOrder = parseFloat((order.vat_amount && order.vat_amount.amount) ? order.vat_amount.amount : '23');

        return {
            order_status_id: 196601,
            date_add: Math.floor(Date.now() / 1000),
            currency: currency,
            payment_method: order.payment_method || order.payment_type || 'other',
            payment_method_cod: "0",
            paid: "0",
            user_comments: order.customer_comment || '',
            admin_comments: `Order from OVOKO - ID: ${order.order_id} - Source: ovoko`,
            extra_field_1: 'ovoko',
            email: order.client_email || order.customer_email || '',
            phone: order.client_phone || '',
            user_login: order.client_name || order.customer_name || '',
            delivery_method: deliveryMethod,
            delivery_price: deliveryPrice,
            delivery_fullname: order.client_name || order.customer_name || '',
            delivery_company: '',
            delivery_address: '',
            delivery_city: '',
            delivery_postcode: '',
            delivery_country: '',
            delivery_state: '',
            want_invoice: "0",
            products: products
        };
    }

    async createOrderInBaseLinker(orderData) {
        console.log(orderData);
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams();
            postData.append('token', this.baselinkerToken);
            postData.append('method', 'addOrder');
            postData.append('parameters', JSON.stringify(orderData));

            const options = {
                hostname: 'api.baselinker.com',
                path: '/connector.php',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData.toString()),
                    'X-BLToken': this.baselinkerToken
                }
            };

            console.log(`🚀 Sending order to BaseLinker: ${JSON.stringify(orderData, null, 2)}`);

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        console.log(`📥 BaseLinker response: ${JSON.stringify(json, null, 2)}`);
                        
                        if (json.status === 'SUCCESS') {
                            resolve({
                                success: true,
                                order_id: json.order_id
                            });
                        } else {
                            resolve({
                                success: false,
                                error: json.error_message || 'addOrder failed'
                            });
                        }
                    } catch (e) {
                        resolve({
                            success: false,
                            error: 'Invalid JSON response from BaseLinker'
                        });
                    }
                });
            });

            req.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message
                });
                req.end();
            });

            req.write(postData.toString());
            req.end();
        });
    }

    updateNextRunTime() {
        if (this.isRunning && this.interval) {
            this.nextRun = new Date(Date.now() + ORDERS_SYNC_CONFIG.interval);
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
            interval: ORDERS_SYNC_CONFIG.interval,
            intervalMinutes: ORDERS_SYNC_CONFIG.interval / 60000,
            enabled: ORDERS_SYNC_CONFIG.enabled,
            lastSyncDate: ORDERS_SYNC_CONFIG.lastSyncDate
        };
    }

    // Method to manually trigger a sync
    async triggerSync() {
        if (!this.isRunning) {
            throw new Error('Orders sync scheduler is not running');
        }
        
        console.log('🔄 Manually triggering orders sync...');
        return await this.runOnce();
    }

    // Method to update configuration
    updateConfig(newConfig) {
        if (newConfig.interval) {
            const newInterval = newConfig.interval * 60 * 1000; // Convert minutes to milliseconds
            ORDERS_SYNC_CONFIG.interval = newInterval;
            
            // Restart scheduler with new interval if running
            if (this.isRunning) {
                this.stop();
                this.start();
            }
        }
        
        if (newConfig.enabled !== undefined) {
            ORDERS_SYNC_CONFIG.enabled = newConfig.enabled;
            
            if (!ORDERS_SYNC_CONFIG.enabled && this.isRunning) {
                this.stop();
            } else if (ORDERS_SYNC_CONFIG.enabled && !this.isRunning) {
                this.start();
            }
        }
        
        console.log('✅ Orders sync configuration updated');
        return this.getStatus();
    }
}

// Create singleton instance
const ordersSyncScheduler = new OrdersSyncScheduler();

// Export both the class and the singleton instance
module.exports = { 
    OrdersSyncScheduler, 
    ordersSyncScheduler 
}; 