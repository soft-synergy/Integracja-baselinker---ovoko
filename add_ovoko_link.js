const https = require('https');
const { URLSearchParams } = require('url');

// Reuse the same token as other BaseLinker scripts in this repo
const BASELINKER_TOKEN = '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F';

// Default product id from the request
const DEFAULT_PRODUCT_ID = '1102037252';

function makeApiRequest(method, parameters = {}) {
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
                'X-BLToken': BASELINKER_TOKEN,
                'User-Agent': 'Ovoko-Linker/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => (data += chunk));
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'SUCCESS') return resolve(json);
                    return reject(new Error(json.error_message || `BaseLinker error for ${method}`));
                } catch (e) {
                    return reject(new Error(`Invalid JSON from BaseLinker for ${method}`));
                }
            });
        });

        req.on('error', (err) => reject(new Error(err.message)));
        req.write(postData.toString());
        req.end();
    });
}

async function getInventories() {
    const res = await makeApiRequest('getInventories', []);
    return res.inventories || [];
}

async function getInventoryProductsData(inventoryId, productIds) {
    const res = await makeApiRequest('getInventoryProductsData', {
        inventory_id: inventoryId,
        products: Array.isArray(productIds) ? productIds : [productIds]
    });
    return res.products || {};
}

async function getStoragesList() {
    // Returns external storages (shops/warehouses) like shop_XXXX or warehouse_XXXX
    const res = await makeApiRequest('getStoragesList', {});
    // Normalize to a map: key -> { id, name, type }
    const list = res.storages || res.storages_list || [];
    return Array.isArray(list) ? list : Object.values(list || {});
}

function findOvokoStorageKey(storages) {
    if (!Array.isArray(storages)) return null;
    // Try to find a storage whose name contains "ovoko" (case-insensitive)
    const match = storages.find(s =>
        typeof s.name === 'string' && s.name.toLowerCase().includes('ovoko')
    );
    if (!match) return null;
    const type = match.type || match.storage_type || 'shop';
    const id = match.id || match.storage_id || match.shop_id || match.warehouse_id;
    if (!id) return null;
    return `${type}_${id}`; // e.g., shop_2445
}

async function tryAddOvokoLinkToProduct(productId, inventoryId, storageKey) {
    // Fetch current product to retain existing links
    const productsMap = await getInventoryProductsData(inventoryId, productId);
    const product = productsMap[productId] || Object.values(productsMap)[0] || {};
    const existingLinks = product.links && typeof product.links === 'object' ? product.links : {};

    const newLinks = { ...existingLinks };
    newLinks[storageKey] = { product_id: 'OVOKO' };

    const parameters = {
        inventory_id: inventoryId,
        product_id: productId,
        links: newLinks
    };

    const res = await makeApiRequest('addInventoryProduct', parameters);
    return res;
}

async function findCorrectInventoryForProduct(productId) {
    const inventories = await getInventories();
    for (const inv of inventories) {
        const invId = inv.inventory_id || inv.id;
        try {
            const products = await getInventoryProductsData(invId, productId);
            const exists = products && (products[productId] || Object.values(products)[0]);
            if (exists) return invId;
        } catch (_) {
            // Ignore and continue
        }
    }
    throw new Error(`Product ${productId} not found in any BaseLinker inventory`);
}

async function addOvokoLink(productId = DEFAULT_PRODUCT_ID, explicitStorageKey = null) {
    const inventoryId = await findCorrectInventoryForProduct(productId);
    let storageKey = explicitStorageKey;
    if (!storageKey) {
        const storages = await getStoragesList();
        storageKey = findOvokoStorageKey(storages);
    }
    if (!storageKey) {
        // Helpful diagnostic: list storages to help operator pick the right one
        const allStorages = await getStoragesList();
        const printable = (allStorages || []).map(s => ({
            id: s.id || s.storage_id || s.shop_id || s.warehouse_id,
            type: s.type || s.storage_type,
            name: s.name
        }));
        throw new Error(`Could not find OVOKO external storage (shop_/warehouse_). Available storages: ${JSON.stringify(printable)}`);
    }
    const result = await tryAddOvokoLinkToProduct(productId, inventoryId, storageKey);
    return { success: result.status === 'SUCCESS', inventory_id: inventoryId, storage_key: storageKey, result };
}

if (require.main === module) {
    const productId = process.argv[2] || DEFAULT_PRODUCT_ID;
    const storageKey = process.argv[3] || null; // optional override like "shop_2445"
    addOvokoLink(productId, storageKey)
        .then((res) => {
            console.log('✅ OVOKO link added');
            console.log(JSON.stringify(res, null, 2));
        })
        .catch((err) => {
            console.error('❌ Failed to add OVOKO link:', err.message);
            process.exit(1);
        });
}

module.exports = { addOvokoLink };


