const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');

const EVENTS_FILE = 'events_queue.json';
const BASELINKER_TOKEN = process.env.BASELINKER_TOKEN || '';

// Load sync status
async function loadSyncStatus() {
    try {
        const content = await fs.readFile('sync_status.json', 'utf8');
        return JSON.parse(content);
    } catch (_) {
        return { synced_products: {}, synced_orders: {} };
    }
}

function blRequest(method, parameters = {}) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        postData.append('token', BASELINKER_TOKEN);
        postData.append('method', method);
        postData.append('parameters', JSON.stringify(parameters));

        const options = {
            hostname: 'api.baselinker.com',
            path: '/connector.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'X-BLToken': BASELINKER_TOKEN
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
                    reject(new Error('Invalid JSON from BaseLinker'));
                }
            });
        });

        req.on('error', reject);
        req.write(postData.toString());
        req.end();
    });
}

async function readEvents() {
    try {
        const content = await fs.readFile(EVENTS_FILE, 'utf8');
        return JSON.parse(content);
    } catch (_) {
        return [];
    }
}

async function writeEvents(events) {
    await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf8');
}

function mapOvokoOrderToBL(order) {
    const products = (order.item_list || []).map(item => {
        const sku = item.external_id || item.id_bridge || item.id || '';
        return {
            name: item.name,
            product_id: sku,
            sku: sku,
            price_brutto: parseFloat(item.sell_price || item.price || '0'),
            quantity: 1,
            tax_rate: parseFloat(order.vat_rate || '23')
        };
    });

    return {
        email: order.client_email || '',
        phone: order.client_phone || '',
        user_login: order.client_name || '',
        currency: order.currency || 'PLN',
        payment_method: order.payment_method || 'other',
        delivery_price: parseFloat(order.shipping_price || '0'),
        admin_comments: `Order from OVOKO - ID: ${order.order_id} - Source: ovoko`,
        extra_field_1: 'ovoko',
        products: products
    };
}

async function handleCreateOrder(event) {
    const order = event.payload.order;
    const params = mapOvokoOrderToBL(order);
    // Many BL accounts require address fields in setOrderFields; using addOrder may differ.
    const response = await blRequest('addOrder', params);
    if (response.status === 'SUCCESS') {
        return { success: true, order_id: response.order_id };
    }
    throw new Error(response.error_message || 'addOrder failed');
}

async function handleUpdateStocks(event) {
    const items = event.payload.items || [];
    if (items.length === 0) return { success: true };
    
    // Load sync status to find BaseLinker SKUs
    const syncStatus = await loadSyncStatus();
    const products = {};
    
    items.forEach(it => {
        let baselinkerSku = null;
        
        // Look for this product in synced products by ovoko_part_id
        for (const [sku, status] of Object.entries(syncStatus.synced_products)) {
            if (status.ovoko_part_id == it.id || status.ovoko_part_id == it.id_bridge) {
                baselinkerSku = sku;
                break;
            }
        }
        
        // Use BaseLinker SKU if found, otherwise fallback to OVOKO ID
        const sku = baselinkerSku || it.external_id || it.id_bridge || it.id;
        if (sku) {
            products[sku] = { sku, quantity: 0 }; // decrease to 0 or adjust logic as needed
        }
    });
    
    const response = await blRequest('updateInventoryProductsStock', { products });
    if (response.status === 'SUCCESS') return { success: true };
    throw new Error(response.error_message || 'updateInventoryProductsStock failed');
}

async function handleOvokoProductUpdate(event) {
    const { product, ovoko_part_id, changes } = event.payload;
    
    console.log(`🔄 Updating product ${product.sku} in Ovoko (Part ID: ${ovoko_part_id})`);
    console.log(`📊 Changes detected:`, changes);
    
    // Prepare update data for Ovoko API
    const postData = new URLSearchParams();
    postData.append('username', process.env.OVOKO_USERNAME || '');
    postData.append('password', process.env.OVOKO_PASSWORD || '');
    postData.append('user_token', process.env.OVOKO_USER_TOKEN || '');
    postData.append('part_id', ovoko_part_id);
    
    // Update price if changed
    if (changes.price) {
        const prices = Object.values(product.prices || {});
        if (prices.length > 0) {
            postData.append('price', prices[0]);
        }
    }
    
    // Update photos if changed
    if (changes.images && product.images && Object.keys(product.images).length > 0) {
        const firstImage = Object.values(product.images)[0];
        postData.append('photo', firstImage);
        
        // Add all images to photos array
        Object.values(product.images).forEach((image, index) => {
            postData.append(`photos[${index}]`, image);
        });
    }
    
    // Update optional codes if changed
    if (changes.features && product.text_fields.features && product.text_fields.features['Numer katalogowy części']) {
        postData.append('optional_codes[0]', product.text_fields.features['Numer katalogowy części']);
    }
    
    const options = {
        hostname: 'api.rrr.lt',
        path: '/crm/updatePart',
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
    
    if (result.status_code === 'R200') {
        console.log(`✅ Product ${product.sku} updated successfully in Ovoko`);
        return { success: true };
    } else {
        throw new Error(result.msg || 'Update failed');
    }
}

// Load BaseLinker products snapshot from file and build a map SKU -> { product_id, storage_ids[] }
async function loadBaselinkerProductsMap() {
    let content;
    try {
        content = await fs.readFile('baselinker_products_latest.json', 'utf8');
    } catch (e) {
        throw new Error('baselinker_products_latest.json not found. Run get_baselinker_products.js or smart_inventory_sync.js first.');
    }
    let products;
    try {
        products = JSON.parse(content);
    } catch (e) {
        throw new Error('Invalid JSON in baselinker_products_latest.json');
    }
    const map = {};
    for (const product of products) {
        const sku = product.sku;
        const productId = String(product.product_id || product.id || '');
        if (!sku || !productId) continue;
        const storageIds = [];
        if (product.stock && typeof product.stock === 'object') {
            for (const key of Object.keys(product.stock)) {
                if (key.startsWith('bl_')) storageIds.push(key);
            }
        }
        map[sku] = { product_id: productId, storage_ids: storageIds.length > 0 ? storageIds : ['bl_1'] };
    }
    return map;
}

// Resolve product references for order items using local snapshot
async function resolveProductRefsForItems(items) {
    const skuToProduct = await loadBaselinkerProductsMap();
    const refs = [];
    for (const it of (items || [])) {
        const candidateSku = String(it.external_id || it.id_bridge || it.id || '');
        const found = candidateSku ? skuToProduct[candidateSku] : null;
        if (!found) {
            throw new Error(`Missing BaseLinker product for item ${it.name || ''} (candidate SKU: ${candidateSku})`);
        }
        refs.push({ product_id: found.product_id, storage_ids: found.storage_ids });
    }
    return refs;
}

// Update stock first; only create order if stock update succeeds
async function handleUpdateStocksThenCreateOrder(event) {
    const order = event.payload.order;
    const items = event.payload.items || order?.item_list || [];
    if (!order) throw new Error('Missing order payload');

    // 1) Resolve product_ids and storage_ids from local snapshot
    const productRefs = await resolveProductRefsForItems(items);

    // 2) Group by storage_id and update quantities to 0
    const storageToProducts = {};
    for (const ref of productRefs) {
        for (const storageId of ref.storage_ids) {
            if (!storageToProducts[storageId]) storageToProducts[storageId] = [];
            storageToProducts[storageId].push([ref.product_id, 0, 0]);
        }
    }

    for (const [storageId, products] of Object.entries(storageToProducts)) {
        const updResp = await blRequest('updateProductsQuantity', { storage_id: storageId, products });
        if (updResp.status !== 'SUCCESS') {
            throw new Error(updResp.error_message || `updateProductsQuantity failed for ${storageId}`);
        }
    }

    // 3) Create order in BaseLinker
    const params = mapOvokoOrderToBL(order);
    const createResp = await blRequest('addOrder', params);
    if (createResp.status === 'SUCCESS') {
        return { success: true, order_id: createResp.order_id };
    }
    throw new Error(createResp.error_message || 'addOrder failed');
}

async function processOnce() {
    if (!BASELINKER_TOKEN) {
        console.error('Missing BASELINKER_TOKEN');
        return;
    }
    const events = await readEvents();
    let changed = false;

    for (const event of events) {
        if (event.status !== 'pending') continue;
        try {
            event.attempts += 1;
            if (event.type === 'BL_CREATE_ORDER') {
                await handleCreateOrder(event);
            } else if (event.type === 'BL_UPDATE_STOCKS') {
                await handleUpdateStocks(event);
            } else if (event.type === 'BL_UPDATE_STOCKS_THEN_CREATE_ORDER') {
                await handleUpdateStocksThenCreateOrder(event);
            } else if (event.type === 'OVOKO_UPDATE_PRODUCT') {
                await handleOvokoProductUpdate(event);
            }
            event.status = 'done';
            event.done_at = new Date().toISOString();
            changed = true;
        } catch (e) {
            event.status = event.attempts >= 3 ? 'failed' : 'pending';
            event.last_error = e.message;
            changed = true;
        }
    }

    if (changed) await writeEvents(events);
}

if (require.main === module) {
    (async () => {
        await processOnce();
        process.exit(0);
    })();
}

module.exports = { processOnce };


