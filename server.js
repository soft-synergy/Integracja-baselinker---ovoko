const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { URLSearchParams } = require('url');

// Import orders queue
const { ordersQueue } = require('./orders_queue');
const { productsQueue } = require('./products_queue');
const { checkProductChanges, updateProductChanges } = require('./check_product_changes');
const { enqueueEvent } = require('./events_queue');
const { smartSyncScheduler } = require('./smart_sync_scheduler');
const { ordersSyncScheduler } = require('./orders_sync_scheduler');

// Import category mapping
const { mapCategoryToOvoko } = require('./create_level3_mapping');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'ovoko-baselinker-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Ovoko API credentials
const OVOKO_CREDENTIALS = {
    username: 'bavarian',
    password: '5J1iod3cY6zUCkid',
    user_token: 'dcf1fb235513c6d36b7a700defdee8ab'
};

// BaseLinker API token
const BASELINKER_TOKEN = '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F';

// Working combination for import
const WORKING_COMBINATION = {
    category_id: 55,
    car_id: 291,
    quality: 1,
    status: 0
};

// Simple user database
const users = [
    {
        username: 'admin',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        role: 'admin'
    }
];

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});


// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { username: user.username, role: user.role };
        res.json({ success: true, user: req.session.user });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Get BaseLinker products with pagination
app.get('/api/baselinker-products', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 150;
        const search = req.query.search || '';
        const filterStatus = req.query.filterStatus || 'all';
        const filterWarehouse = req.query.filterWarehouse || 'all';
        
        let products = [];
        try {
            const latest = await fs.readFile('baselinker_products_latest.json', 'utf8');
            products = JSON.parse(latest);
        } catch (_) {
            const fallback = await fs.readFile('baselinker_products_2025-08-09T06-31-13-827Z.json', 'utf8');
            products = JSON.parse(fallback);
        }
        
        // Load saved sync status only (do not infer from orders)
        const syncStatus = await loadSyncStatus();
        
        const productsWithSyncStatus = products.map(product => {
            const savedStatus = syncStatus.synced_products[product.sku];
            
            // Extract stock information
            let stock = 0;
            let isOutOfStock = false;
            
            if (product.stock && typeof product.stock === 'object') {
                // New format: stock: { "bl_4376": 1 }
                stock = Object.values(product.stock).reduce((sum, val) => sum + (val || 0), 0);
            } else {
                // Old format: stock: 5
                stock = product.stock || 0;
            }
            
            isOutOfStock = stock === 0;
            
            return {
                ...product,
                isSynced: Boolean(savedStatus),
                ovokoPartId: savedStatus ? savedStatus.ovoko_part_id : null,
                syncedAt: savedStatus ? savedStatus.synced_at : null,
                currentStock: stock,
                isOutOfStock: isOutOfStock
            };
        });
        
        // Apply filters
        let filteredProducts = productsWithSyncStatus;
        
        console.log(`🔍 Initial products count: ${filteredProducts.length}`);
        console.log(`🔍 Filters: search="${search}", status="${filterStatus}", warehouse="${filterWarehouse}"`);
        
        // Search filter
        if (search) {
            const beforeSearch = filteredProducts.length;
            filteredProducts = filteredProducts.filter(product => 
                product.text_fields?.name?.toLowerCase().includes(search.toLowerCase()) ||
                product.name?.toLowerCase().includes(search.toLowerCase()) ||
                product.sku?.toLowerCase().includes(search.toLowerCase())
            );
            console.log(`🔍 Search filter applied: "${search}", products after filter: ${filteredProducts.length} (was: ${beforeSearch})`);
        }
        
        // Status filter
        if (filterStatus !== 'all') {
            const beforeStatus = filteredProducts.length;
            filteredProducts = filteredProducts.filter(product => {
                if (filterStatus === 'synced') return product.isSynced;
                if (filterStatus === 'unsynced') return !product.isSynced;
                return true;
            });
            console.log(`🔍 Status filter applied: "${filterStatus}", products after filter: ${filteredProducts.length} (was: ${beforeStatus})`);
        }
        
        // Warehouse filter
        if (filterWarehouse !== 'all') {
            const beforeWarehouse = filteredProducts.length;
            filteredProducts = filteredProducts.filter(product => {
                if (product.stock && typeof product.stock === 'object') {
                    // Check if product has stock in the specified warehouse AND stock > 0
                    const warehouseStock = product.stock[filterWarehouse];
                    const hasStock = warehouseStock !== undefined && warehouseStock > 0;
                    
                    // Debug log for first few products
                    if (beforeWarehouse - filteredProducts.length < 5) {
                        console.log(`  🔍 Product ${product.sku}: stock=${JSON.stringify(product.stock)}, warehouse ${filterWarehouse}=${warehouseStock}, hasStock=${hasStock}`);
                    }
                    
                    return hasStock;
                }
                return false;
            });
            
            console.log(`🔍 Warehouse filter applied: "${filterWarehouse}", products after filter: ${filteredProducts.length} (was: ${beforeWarehouse})`);
        }
        
        // Calculate pagination
        const totalProducts = filteredProducts.length;
        const totalPages = Math.ceil(totalProducts / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
        
        res.json({
            products: paginatedProducts,
            pagination: {
                page,
                limit,
                totalProducts,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear sync statuses
app.post('/api/clear-sync', requireAuth, async (req, res) => {
    try {
        const cleared = { last_updated: new Date().toISOString(), synced_products: {} };
        await fs.writeFile('sync_status.json', JSON.stringify(cleared, null, 2), 'utf8');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get queue status
app.get('/api/queue-status', requireAuth, (req, res) => {
    res.json({
        ordersQueue: ordersQueue.getStatus(),
        productsQueue: productsQueue.getStatus()
    });
});

// Manual helper to enqueue BaseLinker tasks for a given Ovoko order id
app.post('/api/enqueue-order-tasks', requireAuth, async (req, res) => {
    try {
        const { ovoko_order_id } = req.body;
        if (!ovoko_order_id) return res.status(400).json({ error: 'ovoko_order_id required' });

        // Find order from latest file
        const data = await fs.readFile('ovoko_orders_latest.json', 'utf8');
        const orders = JSON.parse(data);
        const order = orders.find(o => String(o.order_id) === String(ovoko_order_id));
        if (!order) return res.status(404).json({ error: 'Order not found' });

        await enqueueEvent('BL_UPDATE_STOCKS_THEN_CREATE_ORDER', { source: 'ovoko', ovoko_order_id, order, items: order.item_list || [] });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Control queue
app.post('/api/queue-control', requireAuth, (req, res) => {
    const { action, target } = req.body; // target: 'orders' | 'products'
    const q = target === 'products' ? productsQueue : ordersQueue;
    
    switch (action) {
        case 'start':
            q.start();
            res.json({ success: true, message: 'Queue started' });
            break;
        case 'stop':
            q.stop();
            res.json({ success: true, message: 'Queue stopped' });
            break;
        case 'manual-fetch':
            if (target === 'products') {
                productsQueue.runOnce();
            } else {
                ordersQueue.manualFetch();
            }
            res.json({ success: true, message: 'Manual fetch initiated' });
            break;
        default:
            res.status(400).json({ error: 'Invalid action' });
    }
});

// List Smart Sync reports
app.get('/api/smart-sync-reports', requireAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const type = (req.query.type || 'all').toLowerCase(); // 'all' | 'report' | 'error'

        const dirEntries = await fs.readdir(__dirname);
        const reportFiles = dirEntries.filter((name) => {
            const isReport = name.startsWith('smart_sync_report_') && name.endsWith('.json');
            const isError = name.startsWith('smart_sync_error_') && name.endsWith('.json');
            if (type === 'report') return isReport;
            if (type === 'error') return isError;
            return isReport || isError;
        });

        const items = [];
        for (const filename of reportFiles) {
            try {
                const fullPath = path.join(__dirname, filename);
                const raw = await fs.readFile(fullPath, 'utf8');
                const json = JSON.parse(raw);
                const isError = filename.startsWith('smart_sync_error_');
                const item = {
                    filename,
                    type: isError ? 'error' : 'report',
                    timestamp: json.timestamp || null,
                };

                if (isError) {
                    item.error = json.error || 'Unknown error';
                } else {
                    item.duration = json.duration || null;
                    item.summary = json.summary || {};
                }

                items.push(item);
            } catch (_) {
                // Skip unreadable/invalid file
            }
        }

        // Sort by timestamp desc (fallback to filename)
        items.sort((a, b) => {
            const at = a.timestamp ? Date.parse(a.timestamp) : 0;
            const bt = b.timestamp ? Date.parse(b.timestamp) : 0;
            if (bt !== at) return bt - at;
            return b.filename.localeCompare(a.filename);
        });

        const total = items.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const startIndex = (page - 1) * limit;
        const paginated = items.slice(startIndex, startIndex + limit);

        res.json({
            reports: paginated,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a specific Smart Sync report JSON
app.get('/api/smart-sync-reports/:filename', requireAuth, async (req, res) => {
    try {
        const { filename } = req.params;
        const safePattern = /^smart_sync_(report|error)_[A-Za-z0-9\-]+\.json$/;
        if (!safePattern.test(filename)) {
            return res.status(400).json({ error: 'Invalid filename' });
        }
        const fullPath = path.join(__dirname, filename);
        const content = await fs.readFile(fullPath, 'utf8');
        const json = JSON.parse(content);
        res.json(json);
    } catch (error) {
        res.status(404).json({ error: 'Report not found' });
    }
});

// Get Ovoko orders
app.get('/api/ovoko-orders', requireAuth, async (req, res) => {
    try {
        const orders = await getOvokoOrders();
        res.json(orders || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/import-product', requireAuth, async (req, res) => {
    try {
        const { product } = req.body;

        if (!product) {
            return res.status(400).json({ error: 'Product data required' });
        }

        console.log(`🚀 Importing product: ${product.sku} - ${product.text_fields.name}`);

        // 1. Get all car models for BMW (brand_id = 6)
        const getCarModels = () => {
            return new Promise((resolve, reject) => {
                const postData = new URLSearchParams();
                postData.append('username', OVOKO_CREDENTIALS.username);
                postData.append('password', OVOKO_CREDENTIALS.password);
                postData.append('user_token', OVOKO_CREDENTIALS.user_token);

                const options = {
                    hostname: 'api.rrr.lt',
                    path: '/get/car_models/1', // 6 = BMW
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(postData.toString())
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
                            resolve(response);
                        } catch (error) {
                            reject(new Error('Invalid response format from car models API'));
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(error);
                });

                req.write(postData.toString());
                req.end();
            });
        };

        // 2. Get all cars from last 10 years
        const getCars = (dateFrom, dateTo) => {
            return new Promise((resolve, reject) => {
                const postData = new URLSearchParams();
                postData.append('username', OVOKO_CREDENTIALS.username);
                postData.append('password', OVOKO_CREDENTIALS.password);
                postData.append('user_token', OVOKO_CREDENTIALS.user_token);

                const options = {
                    hostname: 'api.rrr.lt',
                    path: `/get/cars/${dateFrom}/${dateTo}`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(postData.toString())
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
                            resolve(response);
                        } catch (error) {
                            reject(new Error('Invalid response format from cars API'));
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(error);
                });

                req.write(postData.toString());
                req.end();
            });
        };

        // 3. Import a new car if needed
        // NIE DODAWAJ OBRAZKÓW jak dodajesz nowy samochód!
        const importCar = (carModelId, carYear, product) => {
            return new Promise((resolve, reject) => {
                const postData = new URLSearchParams();
                postData.append('username', OVOKO_CREDENTIALS.username);
                postData.append('password', OVOKO_CREDENTIALS.password);
                postData.append('user_token', OVOKO_CREDENTIALS.user_token);
                postData.append('car_model', carModelId);
                postData.append('car_years', carYear);
                postData.append('status', '1'); // status id assigned to car, 1 = active/available?

                // NIE DODAWAJ OBRAZKÓW!

                // Optionally add external_id
                if (product && product.sku) {
                    postData.append('external_id', product.sku);
                }

                // Optionally add car color if available
                if (product && product.text_fields && product.text_fields.features && product.text_fields.features['Kolor']) {
                    postData.append('car_color', product.text_fields.features['Kolor']);
                }

                // Optionally add car_body_number if available
                if (product && product.text_fields && product.text_fields.features && product.text_fields.features['VIN']) {
                    postData.append('car_body_number', product.text_fields.features['VIN']);
                }

                const options = {
                    hostname: 'api.rrr.lt',
                    path: '/crm/importCar',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(postData.toString())
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
                            resolve(response);
                        } catch (error) {
                            reject(new Error('Invalid response format from importCar API'));
                        }
                    });
                });

                req.on('error', (error) => {
                    reject(error);
                });

                req.write(postData.toString());
                req.end();
            });
        };

        // 4. Find the best model by matching BMW model codes and names
        function extractBmwModelInfo(name) {
            if (!name) return { segments: [], modelCode: null };
            
            const nameUpper = name.toUpperCase();
            
            // Extract model code (E60, F10, G30, etc.)
            const modelCodeMatch = nameUpper.match(/\b([EFG]\d{2,3})\b/);
            const modelCode = modelCodeMatch ? modelCodeMatch[1] : null;
            
            // Extract segments after BMW
            const bmwMatch = nameUpper.match(/BMW\s+([^\s]+)(?:\s+([^\s]+))?/);
            const segments = bmwMatch ? [bmwMatch[1], bmwMatch[2]].filter(Boolean) : [];
            
            // Also look for series numbers (1, 2, 3, 4, 5, 6, 7, 8, X1, X3, X5, etc.)
            const seriesMatch = nameUpper.match(/\b([1-8]|X[1-7]|Z[1-8]|I[1-8])\b/);
            const series = seriesMatch ? seriesMatch[1] : null;
            
            return {
                segments,
                modelCode,
                series,
                fullName: name
            };
        }

        // 5. Main logic
        // Get car models for BMW
        const carModelsResponse = await getCarModels();
        if (!carModelsResponse || carModelsResponse.status_code !== 'R200' || !Array.isArray(carModelsResponse.list)) {
            return res.status(500).json({ error: 'Could not fetch BMW car models' });
        }

        // Consider models from last 20 years (more reasonable for BMW parts)
        const currentYear = new Date().getFullYear();
        const twentyYearsAgo = currentYear - 20;
        const modelsLast20Years = carModelsResponse.list.filter(model => {
            // If year_end is empty, treat as current
            const yearStart = parseInt(model.year_start, 10) || 0;
            const yearEnd = model.year_end ? parseInt(model.year_end, 10) : currentYear;
            return yearEnd >= twentyYearsAgo;
        });

        if (!modelsLast20Years.length) {
            return res.status(500).json({ error: 'No BMW models from last 20 years found' });
        }

        console.log(`🔍 Found ${modelsLast20Years.length} BMW models from last 20 years`);

        // Find the best model by matching BMW model codes and series
        const bmwInfo = extractBmwModelInfo(product.text_fields.name);
        let bestModel = null;
        let bestScore = -1;
        let bestMatchReason = '';

        console.log(`🔍 Extracted BMW info from "${product.text_fields.name}":`, bmwInfo);

        for (const model of modelsLast20Years) {
            const modelName = (model.name || '').toUpperCase();
            let score = 0;
            let matchReason = '';

            // 1. Perfect model code match (highest priority)
            if (bmwInfo.modelCode && modelName.includes(bmwInfo.modelCode)) {
                score += 100;
                matchReason += `Model code ${bmwInfo.modelCode} matched; `;
            }

            // 2. Series number match
            if (bmwInfo.series && modelName.includes(bmwInfo.series)) {
                score += 50;
                matchReason += `Series ${bmwInfo.series} matched; `;
            }

            // 3. Segment matches (lower priority)
            for (const seg of bmwInfo.segments) {
                if (modelName.includes(seg.toUpperCase())) {
                    score += 10;
                    matchReason += `Segment "${seg}" matched; `;
                }
            }

            // 4. Bonus for exact model code match in isolation
            if (bmwInfo.modelCode && modelName.split(/\s+/).includes(bmwInfo.modelCode)) {
                score += 25;
                matchReason += `Exact model code match; `;
            }

            // 5. Penalty for M models when not explicitly mentioned
            if (modelName.includes('M') && !product.text_fields.name.toUpperCase().includes('M')) {
                score -= 20;
                matchReason += `Penalty for M model; `;
            }

            if (score > bestScore) {
                bestScore = score;
                bestModel = model;
                bestMatchReason = matchReason;
            }
        }

        // Fallback: if no match, pick the most generic 5 series model
        if (!bestModel && modelsLast20Years.length > 0) {
            // Try to find a 5 series model first
            const fiveSeriesModel = modelsLast20Years.find(model => 
                model.name && model.name.includes('5') && !model.name.includes('M')
            );
            bestModel = fiveSeriesModel || modelsLast20Years[0];
            bestMatchReason = 'Fallback to generic model';
        }

        if (!bestModel) {
            return res.status(400).json({ error: 'Could not match product to any BMW model' });
        }

        console.log(`🔍 Matched BMW model: ${bestModel.name} (id: ${bestModel.id}, score: ${bestScore})`);
        console.log(`🔍 Match reason: ${bestMatchReason}`);

        // Get all cars from last 20 years
        const dateFrom = new Date(currentYear - 20, 0, 1).toISOString().split('T')[0];
        const dateTo = new Date().toISOString().split('T')[0];
        const carsResponse = await getCars(dateFrom, dateTo);

        let carId = null;
        let importedCar = false;

        if (carsResponse.status_code === 'R200' && Array.isArray(carsResponse.list) && carsResponse.list.length > 0) {
            // Find first car with model == bestModel.id
            const foundCar = carsResponse.list.find(car => {
                // car.model may be string or number
                return car.model && String(car.model) === String(bestModel.id);
            });
            if (foundCar) {
                carId = foundCar.id;
                console.log(`✅ Found car with model id ${bestModel.id}: car id = ${carId}`);
            } else {
                // No car with this model, so create/import a new car
                console.log(`🚗 No car with model id ${bestModel.id}, importing new car...`);
                // Try to get year from product, fallback to currentYear
                let carYear = currentYear.toString();
                if (product && product.text_fields && product.text_fields.features && product.text_fields.features['Rok produkcji']) {
                    carYear = String(product.text_fields.features['Rok produkcji']).substring(0, 4);
                }
                // NIE DODAWAJ OBRAZKÓW!
                const importCarResp = await importCar(bestModel.id, carYear, product);
                if (importCarResp && importCarResp.status_code === 'R200' && importCarResp.car_id) {
                    carId = importCarResp.car_id;
                    importedCar = true;
                    console.log(`✅ Imported new car: car id = ${carId}`);
                } else {
                    // fallback: use first car
                    carId = carsResponse.list[0].id;
                    console.log(`⚠️ Could not import car, using first car id: ${carId}`);
                }
            }
        } else {
            // No cars found in API, so create/import a new car
            console.log(`🚗 No cars found in API, importing new car...`);
            // Try to get year from product, fallback to currentYear
            let carYear = currentYear.toString();
            if (product && product.text_fields && product.text_fields.features && product.text_fields.features['Rok produkcji']) {
                carYear = String(product.text_fields.features['Rok produkcji']).substring(0, 4);
            }
            // NIE DODAWAJ OBRAZKÓW!
            const importCarResp = await importCar(bestModel.id, carYear, product);
            if (importCarResp && importCarResp.status_code === 'R200' && importCarResp.car_id) {
                carId = importCarResp.car_id;
                importedCar = true;
                console.log(`✅ Imported new car: car id = ${carId}`);
            } else {
                // fallback: use default car_id 291
                carId = 291;
                console.log(`⚠️ Could not import car, using default car_id: ${carId}`);
            }
        }

        // Get Ovoko category from BaseLinker category mapping
        const ovokoCategory = await getOvokoCategoryFromBaseLinker(product.category_id);
        console.log(`🔍 Category mapping: BaseLinker ${product.category_id} → Ovoko ${ovokoCategory.ovoko_id} (${ovokoCategory.ovoko_pl}) - Confidence: ${ovokoCategory.confidence}`);

        // Prepare product data for Ovoko
        const postData = new URLSearchParams();
        postData.append('username', OVOKO_CREDENTIALS.username);
        postData.append('password', OVOKO_CREDENTIALS.password);
        postData.append('user_token', OVOKO_CREDENTIALS.user_token);
        postData.append('category_id', ovokoCategory.ovoko_id);
        postData.append('car_id', carId.toString());
        postData.append('quality', '1');
        postData.append('status', '0');
        postData.append('external_id', product.sku);
        postData.append('price', product.prices['2613'] || '0');
        postData.append('original_currency', 'PLN');

        // Add photos if available
        if (product.images && Object.keys(product.images).length > 0) {
            const firstImage = Object.values(product.images)[0];
            postData.append('photo', firstImage);

            // Add all images to photos array
            Object.values(product.images).forEach((image, index) => {
                postData.append(`photos[${index}]`, image);
            });
        }

        // Add optional codes
        if (product.text_fields.features && product.text_fields.features['Numer katalogowy części']) {
            postData.append('optional_codes[0]', product.text_fields.features['Numer katalogowy części']);
        }

        const options = {
            hostname: 'api.rrr.lt',
            path: '/crm/importPart',
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
            console.log(`✅ Product imported successfully: ${result.part_id} to car: ${carId}`);

            // Save sync status
            const syncStatus = await loadSyncStatus();
            syncStatus.synced_products[product.sku] = {
                ovoko_part_id: result.part_id,
                ovoko_car_id: carId,
                ovoko_category_id: ovokoCategory.ovoko_id,
                ovoko_category_name: ovokoCategory.ovoko_pl,
                baselinker_category_id: product.category_id,
                mapping_confidence: ovokoCategory.confidence,
                bmw_model: bestModel.name,
                synced_at: new Date().toISOString(),
                product_name: product.text_fields.name
            };
            await saveSyncStatus(syncStatus);

            res.json({
                success: true,
                part_id: result.part_id,
                car_id: carId,
                bmw_model: bestModel.name,
                ovoko_category: {
                    id: ovokoCategory.ovoko_id,
                    name: ovokoCategory.ovoko_pl,
                    confidence: ovokoCategory.confidence
                },
                message: importedCar
                    ? 'Product imported successfully (new car created)'
                    : 'Product imported successfully'
            });
        } else {
            console.log(`❌ Import failed: ${result.msg}`);
            res.json({
                success: false,
                error: result.msg || 'Import failed'
            });
        }

    } catch (error) {
        console.error('💥 Import error:', error.message);
        
        // Log category mapping error if it's related to mapping
        if (error.message.includes('category') || error.message.includes('mapping')) {
            console.error('🔍 Category mapping error details:', {
                product_sku: product?.sku,
                baselinker_category_id: product?.category_id,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update product in Ovoko
app.post('/api/update-product', requireAuth, async (req, res) => {
    try {
        const { product } = req.body;
        
        if (!product) {
            return res.status(400).json({ error: 'Product data required' });
        }
        
        console.log(`🔄 Updating product: ${product.sku} - ${product.text_fields.name}`);
        
        // Get the part_id from sync status
        const syncStatus = await loadSyncStatus();
        const savedStatus = syncStatus.synced_products[product.sku];
        
        if (!savedStatus || !savedStatus.ovoko_part_id) {
            return res.status(400).json({ error: 'Product not synced to Ovoko yet. Sync first.' });
        }
        
        const partId = savedStatus.ovoko_part_id;
        
        // Prepare update data for Ovoko API
        const postData = new URLSearchParams();
        postData.append('username', OVOKO_CREDENTIALS.username);
        postData.append('password', OVOKO_CREDENTIALS.password);
        postData.append('user_token', OVOKO_CREDENTIALS.user_token);
        postData.append('part_id', partId);
        
        // Update price
        const prices = Object.values(product.prices || {});
        if (prices.length > 0) {
            postData.append('price', prices[0]);
        }
        
        // Update photos if available
        if (product.images && Object.keys(product.images).length > 0) {
            const firstImage = Object.values(product.images)[0];
            postData.append('photo', firstImage);
            
            // Add all images to photos array
            Object.values(product.images).forEach((image, index) => {
                postData.append(`photos[${index}]`, image);
            });
        }
        
        // Update optional codes
        if (product.text_fields.features && product.text_fields.features['Numer katalogowy części']) {
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
            console.log(`✅ Product updated successfully: ${product.sku}`);
            
            // Update sync timestamp
            syncStatus.synced_products[product.sku].synced_at = new Date().toISOString();
            await saveSyncStatus(syncStatus);
            
            res.json({ 
                success: true, 
                message: 'Product updated successfully in Ovoko'
            });
        } else {
            console.log(`❌ Update failed: ${result.msg}`);
            res.json({ 
                success: false, 
                error: result.msg || 'Update failed'
            });
        }
        
    } catch (error) {
        console.error('💥 Update error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Check for product changes and enqueue updates
app.post('/api/check-product-changes', requireAuth, async (req, res) => {
    try {
        console.log('🔍 Manual product change check requested...');
        const result = await checkProductChanges();
        
        if (result.error) {
            res.status(500).json({ 
                success: false, 
                error: result.error 
            });
        } else {
            res.json({ 
                success: true, 
                changesFound: result.changesFound,
                totalProducts: result.totalProducts,
                updatedCount: result.updatedCount,
                message: result.message
            });
        }
        
    } catch (error) {
        console.error('💥 Error checking product changes:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Update product versions in sync status (for new syncs)
app.post('/api/update-product-versions', requireAuth, async (req, res) => {
    try {
        console.log('📝 Manual product version update requested...');
        const updated = await updateProductVersions();
        
        res.json({ 
            success: true, 
            updated,
            message: `Updated ${updated} product versions`
        });
        
    } catch (error) {
        console.error('💥 Error updating product versions:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Helper function to map BaseLinker category to Ovoko category
async function getOvokoCategoryFromBaseLinker(baselinkerCategoryId) {
    try {
        // Load the correct mapping (top-tier categories only)
        const fs = require('fs');
        const mappingData = fs.readFileSync('ovoko_mapping_correct.json', 'utf8');
        const mapping = JSON.parse(mappingData);
        
        // Find the category mapping
        const categoryMapping = mapping.categories[baselinkerCategoryId];
        if (categoryMapping && categoryMapping.ovoko_mapping) {
            // Map to level 3 categories based on the top-tier mapping
            const topTierId = categoryMapping.ovoko_mapping.ovoko_id;
            
            // Map top-tier categories to specific level 3 categories (only tested working ones)
            const level3Mapping = {
                "1": "754",   // Układ hamulcowy -> Brake discs (tarcze hamulcowe) ✅
                "250": "606", // Silnik i osprzęt -> Engine block ✅
                "134": "136", // Oświetlenie -> Headlight/headlamp ✅
                "98": "101",  // Wycieraczki i spryskiwacze -> Windshield wiper blade ✅
                "197": "754", // Klimatyzacja -> Brake discs (fallback) ❌
                "281": "754", // Układ kierowniczy -> Brake discs (fallback) ❌
                "330": "754", // Układ zawieszenia -> Brake discs (fallback) ❌
                "382": "754", // Układ napędowy -> Brake discs (fallback) ❌
                "416": "754", // Układ elektryczny -> Brake discs (fallback) ❌
                "463": "754", // Układ paliwowy -> Brake discs (fallback) ❌
                "498": "754", // Układ wydechowy -> Brake discs (fallback) ❌
                "541": "754", // Układ chłodzenia -> Brake discs (fallback) ❌
                "579": "754", // Układ hamulcowy -> Brake discs (fallback) ❌
                "624": "754", // Układ bezpieczeństwa -> Brake discs (fallback) ❌
                "806": "754", // Układ komfortu -> Brake discs (fallback) ❌
                "999": "754", // Układ informacyjny -> Brake discs (fallback) ❌
                "1168": "754", // Układ multimedialny -> Brake discs (fallback) ❌
                "1189": "754", // Układ nawigacyjny -> Brake discs (fallback) ❌
                "1249": "754"  // Inne części -> Brake discs (fallback) ❌
            };
            
            const level3Id = level3Mapping[topTierId] || "754"; // Default to brake discs
            
            return {
                ovoko_id: level3Id,
                ovoko_name: categoryMapping.ovoko_mapping.ovoko_name,
                ovoko_pl: categoryMapping.ovoko_mapping.ovoko_pl,
                confidence: categoryMapping.ovoko_mapping.confidence + "_level3",
                matched_keyword: categoryMapping.ovoko_mapping.matched_keyword
            };
        }
        
        // Fallback to brake discs category if not found
        return {
            ovoko_id: "754", // Brake discs (tarcze hamulcowe)
            ovoko_name: "Brak mapowania",
            ovoko_pl: "Tarcze hamulcowe",
            confidence: "fallback",
            matched_keyword: "brak mapowania"
        };
    } catch (error) {
        console.log('⚠️ Could not load category mapping, using default:', error.message);
        // Fallback to default category
        return {
            ovoko_id: "754", // Brake discs as default
            ovoko_name: "Error loading mapping",
            ovoko_pl: "Tarcze hamulcowe",
            confidence: "error",
            matched_keyword: "błąd ładowania mapowania"
        };
    }
}

// Helper function to load sync status
async function loadSyncStatus() {
    try {
        const data = await fs.readFile('sync_status.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('📄 No sync status file found, creating new one...');
        return {
            last_updated: new Date().toISOString(),
            synced_products: {},
            synced_orders: {} // Added for new syncs
        };
    }
}

// Helper function to save sync status
async function saveSyncStatus(syncStatus) {
    try {
        syncStatus.last_updated = new Date().toISOString();
        await fs.writeFile('sync_status.json', JSON.stringify(syncStatus, null, 2), 'utf8');
        console.log('💾 Sync status saved');
    } catch (error) {
        console.error('❌ Error saving sync status:', error.message);
    }
}

// Helper function to get Ovoko orders
async function getOvokoOrders() {
    try {
        // First try to get orders from the queue's latest file
        try {
            const data = await fs.readFile('ovoko_orders_latest.json', 'utf8');
            const orders = JSON.parse(data);
            console.log(`📦 Loaded ${orders.length} orders from queue file`);
            return orders;
        } catch (error) {
            console.log('📄 Queue file not found, trying backup...');
            
            // Try backup file
            try {
                const data = await fs.readFile('ovoko_orders_backup.json', 'utf8');
                const orders = JSON.parse(data);
                console.log(`📦 Loaded ${orders.length} orders from backup file`);
                return orders;
            } catch (backupError) {
                console.log('📄 Backup file not found, trying old file...');
                
                // Try old file as last resort
                try {
                    const data = await fs.readFile('ovoko_orders_2025-08-13T05-03-22-024Z.json', 'utf8');
                    const orders = JSON.parse(data);
                    console.log(`📦 Loaded ${orders.length} orders from old file`);
                    return orders;
                } catch (oldFileError) {
                    console.log('❌ No orders files found');
                    return [];
                }
            }
        }
    } catch (error) {
        console.error('❌ Error loading orders:', error.message);
        return [];
    }
}

// New function to fetch orders from Ovoko API V2
async function fetchOvokoOrdersV2(fromDate, toDate) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        
        // Add authentication data
        postData.append('username', OVOKO_CREDENTIALS.username);
        postData.append('password', OVOKO_CREDENTIALS.password);
        postData.append('user_token', OVOKO_CREDENTIALS.user_token);

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

        console.log(`🚀 Making V2 API request to: /v2/get/orders/${fromDate}/${toDate}`);

        const req = https.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log(`📥 V2 API Response status: ${res.statusCode}`);
                try {
                    const response = JSON.parse(responseData);
                    resolve(response);
                } catch (error) {
                    console.log('📄 Raw V2 API response (not JSON):', responseData.substring(0, 200) + '...');
                    reject(new Error('Invalid JSON response from V2 API'));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`V2 API Request Error: ${error.message}`));
        });

        req.write(postData.toString());
        req.end();
    });
}

// Helper function to import product to Ovoko
async function importProductToOvoko(product) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        
        // Add authentication
        postData.append('username', OVOKO_CREDENTIALS.username);
        postData.append('password', OVOKO_CREDENTIALS.password);
        postData.append('user_token', OVOKO_CREDENTIALS.user_token);
        
        // Add required fields
        postData.append('category_id', WORKING_COMBINATION.category_id);
        postData.append('car_id', WORKING_COMBINATION.car_id);
        postData.append('quality', WORKING_COMBINATION.quality);
        postData.append('status', WORKING_COMBINATION.status);
        
        // Add product data
        postData.append('optional_codes[0]', product.sku);
        if (product.text_fields?.features?.['Numer katalogowy części']) {
            postData.append('optional_codes[1]', product.text_fields.features['Numer katalogowy części']);
        }
        
        // Add price
        const prices = Object.values(product.prices || {});
        if (prices.length > 0) {
            postData.append('price', prices[0]);
        }
        
        // Add photos
        const images = Object.values(product.images || {});
        if (images.length > 0) {
            postData.append('photo', images[0]);
            images.forEach((imageUrl, index) => {
                postData.append(`photos[${index}]`, imageUrl);
            });
        }
        
        // Add other fields
        postData.append('original_currency', 'PLN');
        postData.append('storage_id', '1');
        postData.append('external_id', product.sku);

        const options = {
            hostname: 'api.rrr.lt',
            path: '/crm/importPart',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString())
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
                        resolve({
                            success: true,
                            part_id: response.part_id,
                            message: response.msg
                        });
                    } else {
                        resolve({
                            success: false,
                            error: response.msg || 'Import failed'
                        });
                    }
                } catch (error) {
                    resolve({
                        success: false,
                        error: 'Invalid response from API'
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message
            });
        });

        req.write(postData.toString());
        req.end();
    });
}

// Helper function to transform V2 API response to internal format
function transformV2OrderToInternal(v2Order) {
    return {
        order_id: v2Order.order_id,
        order_source: v2Order.order_source,
        customer_name: v2Order.client_name,
        customer_email: v2Order.client_email,
        customer_phone: v2Order.client_phone,
        customer_address: v2Order.client_address,
        customer_address_street: v2Order.client_address_street,
        customer_address_city: v2Order.client_address_city,
        customer_address_country: v2Order.client_address_country,
        customer_address_zip_code: v2Order.client_address_zip_code,
        company_title: v2Order.company_title,
        company_code: v2Order.company_code,
        company_phone: v2Order.company_phone,
        company_vat_code: v2Order.company_vat_code,
        company_address: v2Order.company_address,
        order_date: v2Order.order_date,
        payment_type: v2Order.payment_type,
        payment_method: v2Order.payment_method,
        order_status: v2Order.order_status,
        seller: v2Order.seller,
        delivery_type: v2Order.delivery_type,
        shipping_provider: v2Order.shipping_provider,
        invoice_number: v2Order.invoice_number,
        view_order_url: v2Order.view_order,
        // Transform item list
        item_list: v2Order.item_list?.map(item => ({
            id: item.id,
            id_bridge: item.id_bridge,
            car_id: item.car_id,
            name: item.name,
            external_id: item.external_id,
            delivery_type: item.delivery_type,
            shipping_provider: item.shipping_provider,
            // Price information
            price: item.sell_price?.buyer?.amount || '0',
            currency: item.sell_price?.buyer?.currency || 'EUR',
            sell_price_seller: item.sell_price?.seller?.amount || '0',
            sell_price_buyer: item.sell_price?.buyer?.amount || '0'
        })) || [],
        // Price totals
        part_total_price_seller: v2Order.part_total_price?.seller?.amount || '0',
        part_total_price_buyer: v2Order.part_total_price?.buyer?.amount || '0',
        shipping_price_seller: v2Order.shipping_price?.seller?.amount || '0',
        shipping_price_buyer: v2Order.shipping_price?.buyer?.amount || '0',
        total_price_seller: v2Order.total_price?.seller?.amount || '0',
        total_price_buyer: v2Order.total_price?.buyer?.amount || '0',
        vat_amount: v2Order.vat_amount?.amount || '0',
        vat_type: v2Order.vat_amount?.type || '%'
    };
}

// New endpoint to fetch orders from V2 API
app.post('/api/fetch-ovoko-orders-v2', requireAuth, async (req, res) => {
    try {
        const { fromDate, toDate } = req.body;
        
        if (!fromDate || !toDate) {
            return res.status(400).json({ 
                error: 'fromDate and toDate are required (format: YYYY-MM-DD)' 
            });
        }

        console.log(`🔄 Fetching orders from V2 API: ${fromDate} to ${toDate}`);
        
        const result = await fetchOvokoOrdersV2(fromDate, toDate);
        
        if (result.status_code === 'R200') {
            if (result.list && Array.isArray(result.list)) {
                console.log(`✅ Successfully fetched ${result.list.length} orders from V2 API`);
                
                // Transform orders to internal format
                const transformedOrders = result.list.map(transformV2OrderToInternal);
                
                // Save to file
                const filename = `ovoko_orders_v2_${new Date().toISOString().split('T')[0]}.json`;
                await fs.writeFile(filename, JSON.stringify(transformedOrders, null, 2), 'utf8');
                console.log(`💾 Orders saved to: ${filename}`);
                
                // Also update latest file
                await fs.writeFile('ovoko_orders_latest.json', JSON.stringify(transformedOrders, null, 2), 'utf8');
                console.log(`💾 Latest orders updated`);
                
                // Automatically sync new orders to BaseLinker
                console.log(`🔄 Starting automatic sync of ${transformedOrders.length} orders to BaseLinker...`);
                const syncResults = await autoSyncOrdersToBaseLinker(transformedOrders);
                console.log(`✅ Auto-sync completed: ${syncResults.synced} synced, ${syncResults.failed} failed`);
                
                res.json({ 
                    success: true, 
                    ordersCount: transformedOrders.length,
                    filename: filename,
                    message: `Successfully fetched ${transformedOrders.length} orders from V2 API and started auto-sync to BaseLinker`,
                    syncResults: syncResults
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    error: 'No orders list in V2 API response' 
                });
            }
        } else {
            res.status(500).json({ 
                success: false, 
                error: result.msg || 'Failed to fetch orders from V2 API' 
            });
        }
        
    } catch (error) {
        console.error('💥 Error fetching orders from V2 API:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// New endpoint to sync order with BaseLinker
app.post('/api/sync-order-to-baselinker', requireAuth, async (req, res) => {
    try {
        const { orderId } = req.body;
        
        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        console.log(`🔄 Syncing order ${orderId} to BaseLinker...`);
        
        // Check if order is already synced
        const syncStatus = await loadSyncStatus();
        if (syncStatus.synced_orders && syncStatus.synced_orders[orderId]) {
            return res.status(400).json({ 
                error: 'Order already synced to BaseLinker',
                baselinkerOrderId: syncStatus.synced_orders[orderId].baselinker_order_id,
                syncedAt: syncStatus.synced_orders[orderId].synced_at
            });
        }

        // Load orders to find the specific order
        const orders = await getOvokoOrders();
        const order = orders.find(o => o.order_id === orderId);
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Map order to BaseLinker format
        const baselinkerOrder = await mapOrderToBaseLinker(order);
        
        // Send to BaseLinker
        const result = await createOrderInBaseLinker(baselinkerOrder);
        
        
        if (result.success) {

            console.log(`✅ Order ${orderId} synced to BaseLinker successfully`);
            
            // Update sync status
            if (!syncStatus.synced_orders) {
                syncStatus.synced_orders = {};
            }
            
            syncStatus.synced_orders[orderId] = {
                baselinker_order_id: result.order_id,
                synced_at: new Date().toISOString(),
                order_data: {
                    customer_name: order.customer_name,
                    total_value: order.total_price_buyer,
                    items_count: order.item_list?.length || 0
                }
            };
            
            await saveSyncStatus(syncStatus);
            
            // Add to activity log
            addActivityLog(`Order ${orderId} synced to BaseLinker`, 'success', {
                orderId: orderId,
                baselinkerOrderId: result.order_id,
                customerName: order.customer_name,
                totalValue: order.total_price_buyer
            });
            
            res.json({ 
                success: true, 
                message: 'Order synced to BaseLinker successfully',
                baselinkerOrderId: result.order_id
            });
        } else {
            throw new Error(result.error || 'Failed to sync order to BaseLinker');
        }
        
    } catch (error) {
        console.error('💥 Error syncing order to BaseLinker:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// New endpoint to check order sync status
app.get('/api/order-sync-status/:orderId', requireAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const syncStatus = await loadSyncStatus();
        const orderSyncInfo = syncStatus.synced_orders?.[orderId];
        
        if (orderSyncInfo) {
            res.json({ 
                synced: true, 
                baselinkerOrderId: orderSyncInfo.baselinker_order_id,
                syncedAt: orderSyncInfo.synced_at,
                orderData: orderSyncInfo.order_data
            });
        } else {
            res.json({ synced: false });
        }
        
    } catch (error) {
        console.error('💥 Error checking order sync status:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// New endpoint to check category mapping for a product
app.get('/api/category-mapping/:categoryId', requireAuth, (req, res) => {
    try {
        const { categoryId } = req.params;
        const ovokoCategory = getOvokoCategoryFromBaseLinker(categoryId);
        
        res.json({
            baselinker_category_id: categoryId,
            ovoko_mapping: ovokoCategory
        });
    } catch (error) {
        console.error('💥 Error checking category mapping:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// New endpoint to get all category mappings
app.get('/api/category-mappings', requireAuth, async (req, res) => {
    try {
        const fs = require('fs');
        const mappingData = fs.readFileSync('ovoko_mapping_level3.json', 'utf8');
        const mapping = JSON.parse(mappingData);
        
        // Get summary statistics
        const stats = {
            total_categories: mapping.total_categories,
            ovoko_level3_categories: mapping.ovoko_level3_categories,
            mapping_rules: Object.keys(mapping.mapping_rules || {}).length,
            created_at: mapping.created_at,
            version: mapping.version
        };
        
        // Get sample of mappings (first 10 for preview)
        const sampleMappings = Object.entries(mapping.categories).slice(0, 10).map(([id, data]) => ({
            baselinker_category_id: id,
            baselinker_name: data.baselinker.name,
            ovoko_category_id: data.ovoko_mapping.ovoko_id,
            ovoko_category_name: data.ovoko_mapping.ovoko_pl,
            confidence: data.ovoko_mapping.confidence
        }));
        
        res.json({
            success: true,
            statistics: stats,
            sample_mappings: sampleMappings,
            message: `Loaded ${mapping.total_categories} category mappings`
        });
        
    } catch (error) {
        console.error('💥 Error loading category mappings:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// New endpoint to get all synced orders
app.get('/api/synced-orders', requireAuth, async (req, res) => {
    try {
        const syncStatus = await loadSyncStatus();
        const syncedOrders = syncStatus.synced_orders || {};
        
        res.json({ 
            syncedOrders: Object.keys(syncedOrders).map(orderId => ({
                orderId: orderId,
                ...syncedOrders[orderId]
            }))
        });
        
    } catch (error) {
        console.error('💥 Error getting synced orders:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// New endpoint to get BaseLinker order statuses
app.get('/api/baselinker-order-statuses', requireAuth, async (req, res) => {
    try {
        console.log('🔄 Fetching BaseLinker order statuses...');
        
        const result = await getBaseLinkerOrderStatuses();
        
        if (result.success) {
            console.log(`✅ Successfully fetched ${result.statuses.length} order statuses from BaseLinker`);
            res.json({ 
                success: true, 
                statuses: result.statuses,
                message: `Successfully fetched ${result.statuses.length} order statuses`
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: result.error || 'Failed to fetch order statuses' 
            });
        }
        
    } catch (error) {
        console.error('💥 Error fetching BaseLinker order statuses:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Helper function to get BaseLinker order statuses
async function getBaseLinkerOrderStatuses() {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        postData.append('token', BASELINKER_TOKEN);
        postData.append('method', 'getOrderStatusList');
        postData.append('parameters', '[]');

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

        console.log(`🚀 Making request to BaseLinker: getOrderStatusList`);

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
                            statuses: json.statuses || []
                        });
                    } else {
                        resolve({
                            success: false,
                            error: json.error_message || 'getOrderStatusList failed'
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
        });

        req.write(postData.toString());
        req.end();
    });
}

// Helper function to automatically sync multiple orders to BaseLinker
async function autoSyncOrdersToBaseLinker(orders) {
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
            const syncStatus = await loadSyncStatus();
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
            const baselinkerOrder = await mapOrderToBaseLinker(order);
            
            // Send to BaseLinker
            const result = await createOrderInBaseLinker(baselinkerOrder);
            
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

// Helper function to map Ovoko order to BaseLinker format
async function mapOrderToBaseLinker(order) {
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

    const syncStatus = await loadSyncStatus();

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
            product_id: blProduct.id,
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
        phone: order.client_phone || order.customer_phone || '',
        user_login: order.client_name || order.customer_name || '',
        delivery_method: deliveryMethod || 'Standard delivery',
        delivery_price: deliveryPrice,
        delivery_fullname: order.client_name || order.customer_name || '',
        delivery_company: order.company_title || '',
        delivery_address: order.client_address_street || order.client_address || order.customer_address_street || order.customer_address || '',
        delivery_city: order.client_address_city || order.customer_address_city || '',
        delivery_postcode: order.client_address_zip_code || order.customer_address_zip_code || '',
        delivery_country_code: order.client_address_country || order.customer_address_country || 'PL',
        delivery_state: '',
        want_invoice: "0",
        products: products
    };
}

// Helper function to create order in BaseLinker
async function createOrderInBaseLinker(orderData) {
    console.log(orderData);
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        postData.append('token', BASELINKER_TOKEN);
        postData.append('method', 'addOrder');
        postData.append('parameters', JSON.stringify(orderData));

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
        });

        req.write(postData.toString());
        req.end();
    });
}

// Activity Log Storage (in-memory for now, can be replaced with database)
let activityLogs = [];

// Add activity log entry
function addActivityLog(message, level = 'info', details = null, userId = null, ip = null) {
    const log = {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        message,
        level,
        details,
        userId,
        ip,
        userAgent: null
    };
    
    activityLogs.unshift(log);
    
    // Keep only last 10000 logs
    if (activityLogs.length > 10000) {
        activityLogs = activityLogs.slice(0, 10000);
    }
    
    console.log(`[${log.level.toUpperCase()}] ${log.message}`, details || '');
}

// Activity Log API endpoints
app.get('/api/logs', requireAuth, (req, res) => {
    try {
        let filteredLogs = [...activityLogs];
        
        // Apply filters
        if (req.query.level) {
            filteredLogs = filteredLogs.filter(log => log.level === req.query.level);
        }
        if (req.query.search) {
            const search = req.query.search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(search) ||
                (log.details && JSON.stringify(log.details).toLowerCase().includes(search))
            );
        }
        if (req.query.dateFrom) {
            const dateFrom = new Date(req.query.dateFrom);
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= dateFrom);
        }
        if (req.query.dateTo) {
            const dateTo = new Date(req.query.dateTo);
            filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= dateTo);
        }
        if (req.query.userId) {
            filteredLogs = filteredLogs.filter(log => log.userId === req.query.userId);
        }
        
        res.json({ logs: filteredLogs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load logs' });
    }
});

app.post('/api/logs', (req, res) => {
    try {
        const { message, level, details, userId } = req.body;
        const ip = req.ip || req.connection.remoteAddress;
        
        addActivityLog(message, level, details, userId, ip);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add log' });
    }
});

app.delete('/api/logs', requireAuth, (req, res) => {
    try {
        activityLogs = [];
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

app.get('/api/logs/export', requireAuth, (req, res) => {
    try {
        const format = req.query.format || 'json';
        
        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="activity-logs.json"');
            res.json({ logs: activityLogs });
        } else if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="activity-logs.csv"');
            
            const csv = [
                ['Timestamp', 'Level', 'Message', 'User ID', 'IP', 'Details'],
                ...activityLogs.map(log => [
                    log.timestamp,
                    log.level,
                    log.message,
                    log.userId || '',
                    log.ip || '',
                    log.details ? JSON.stringify(log.details) : ''
                ])
            ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
            
            res.send(csv);
        } else {
            res.status(400).json({ error: 'Unsupported format' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to export logs' });
    }
});

// Authentication status endpoint
app.get('/api/auth/status', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: 'Not authenticated' });
    }
});

// Smart sync scheduler status endpoint
app.get('/api/smart-sync/status', requireAuth, (req, res) => {
    try {
        const status = smartSyncScheduler.getStatus();
        res.json(status);
    } catch (error) {
        console.error('Smart sync status endpoint error:', error);
        res.status(500).json({ error: 'Failed to get smart sync status' });
    }
});

// Smart sync scheduler control endpoint
app.post('/api/smart-sync/control', requireAuth, async (req, res) => {
    try {
        const { action, config } = req.body;
        
        switch (action) {
            case 'start':
                smartSyncScheduler.start();
                res.json({ success: true, message: 'Smart sync scheduler started', status: smartSyncScheduler.getStatus() });
                break;
            case 'stop':
                smartSyncScheduler.stop();
                res.json({ success: true, message: 'Smart sync scheduler stopped', status: smartSyncScheduler.getStatus() });
                break;
            case 'trigger':
                const result = await smartSyncScheduler.triggerSync();
                res.json({ success: true, message: 'Smart sync triggered manually', result, status: smartSyncScheduler.getStatus() });
                break;
            case 'update-config':
                if (config) {
                    const updatedStatus = smartSyncScheduler.updateConfig(config);
                    res.json({ success: true, message: 'Configuration updated', status: updatedStatus });
                } else {
                    res.status(400).json({ error: 'Configuration object required' });
                }
                break;
            default:
                res.status(400).json({ error: 'Invalid action. Use: start, stop, trigger, or update-config' });
        }
    } catch (error) {
        console.error('Smart sync control endpoint error:', error);
        res.status(500).json({ error: 'Failed to control smart sync scheduler' });
    }
});

// Orders sync scheduler status endpoint
app.get('/api/orders-sync/status', requireAuth, (req, res) => {
    try {
        const status = ordersSyncScheduler.getStatus();
        res.json(status);
    } catch (error) {
        console.error('Orders sync status endpoint error:', error);
        res.status(500).json({ error: 'Failed to get orders sync status' });
    }
});

// Orders sync scheduler control endpoint
app.post('/api/orders-sync/control', requireAuth, async (req, res) => {
    try {
        const { action, config } = req.body;
        
        switch (action) {
            case 'start':
                ordersSyncScheduler.start();
                res.json({ success: true, message: 'Orders sync scheduler started', status: ordersSyncScheduler.getStatus() });
                break;
            case 'stop':
                ordersSyncScheduler.stop();
                res.json({ success: true, message: 'Orders sync scheduler stopped', status: ordersSyncScheduler.getStatus() });
                break;
            case 'trigger':
                const result = await ordersSyncScheduler.triggerSync();
                res.json({ success: true, message: 'Orders sync triggered manually', result, status: ordersSyncScheduler.getStatus() });
                break;
            case 'update-config':
                if (config) {
                    const updatedStatus = ordersSyncScheduler.updateConfig(config);
                    res.json({ success: true, message: 'Configuration updated', status: updatedStatus });
                } else {
                    res.status(400).json({ error: 'Configuration object required' });
                }
                break;
            default:
                res.status(400).json({ error: 'Invalid action. Use: start, stop, trigger, or update-config' });
        }
    } catch (error) {
        console.error('Orders sync control endpoint error:', error);
        res.status(500).json({ error: 'Failed to control orders sync scheduler' });
    }
});

// Overview endpoint
app.get('/api/overview', requireAuth, async (req, res) => {
    try {
        // Get basic stats
        const stats = {
            totalProducts: 0,
            totalOrders: 0,
            syncStatus: 'idle',
            lastSync: null,
            pendingChanges: 0,
            errors: 0
        };
        
        // Load products count from latest file
        try {
            const productsData = await fs.readFile('baselinker_products_latest.json', 'utf8');
            const products = JSON.parse(productsData);
            stats.totalProducts = products.length;
        } catch (error) {
            console.log('Could not load products file:', error.message);
        }
        
        // Load orders count from latest file
        try {
            const ordersData = await fs.readFile('ovoko_orders_latest.json', 'utf8');
            const orders = JSON.parse(ordersData);
            stats.totalOrders = orders.length;
        } catch (error) {
            console.log('Could not load orders file:', error.message);
        }
        
        // Count error logs
        stats.errors = activityLogs.filter(log => log.level === 'error').length;
        
        // Get last sync from logs
        const lastSyncLog = activityLogs.find(log => 
            log.message.includes('sync') && log.level === 'success'
        );
        if (lastSyncLog) {
            stats.lastSync = lastSyncLog.timestamp;
        }
        
        // Determine sync status based on queue status
        const ordersQueueStatus = ordersQueue.getStatus();
        const productsQueueStatus = productsQueue.getStatus();
        const smartSyncStatus = smartSyncScheduler.getStatus();
        const ordersSyncStatus = ordersSyncScheduler.getStatus();
        
        if (ordersQueueStatus.isRunning || productsQueueStatus.isRunning || smartSyncStatus.isRunning || ordersSyncStatus.isRunning) {
            stats.syncStatus = 'syncing';
        } else if (stats.errors > 0) {
            stats.syncStatus = 'error';
        } else if (stats.lastSync) {
            stats.syncStatus = 'completed';
        }
        
        // Add smart sync information
        stats.smartSync = {
            isRunning: smartSyncStatus.isRunning,
            lastRun: smartSyncStatus.lastRun,
            nextRun: smartSyncStatus.nextRun,
            totalRuns: smartSyncStatus.totalRuns,
            intervalMinutes: smartSyncStatus.intervalMinutes,
            enabled: smartSyncStatus.enabled
        };
        
        // Add orders sync information
        stats.ordersSync = {
            isRunning: ordersSyncStatus.isRunning,
            lastRun: ordersSyncStatus.lastRun,
            nextRun: ordersSyncStatus.nextRun,
            totalRuns: ordersSyncStatus.totalRuns,
            intervalMinutes: ordersSyncStatus.intervalMinutes,
            enabled: ordersSyncStatus.enabled,
            lastSyncDate: ordersSyncStatus.lastSyncDate
        };
        
        // Count pending changes (products with recent modifications)
        try {
            const productsData = await fs.readFile('baselinker_products_latest.json', 'utf8');
            const products = JSON.parse(productsData);
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            stats.pendingChanges = products.filter(product => {
                // Check if product has been modified recently
                // This is a simplified check - you might want to add a last_modified field
                return product.text_fields && product.text_fields.name;
            }).length;
        } catch (error) {
            console.log('Could not calculate pending changes:', error.message);
        }
        
        // Add category mapping statistics
        try {
            const mappingData = await fs.readFile('ovoko_mapping_level3.json', 'utf8');
            const mapping = JSON.parse(mappingData);
            stats.categoryMapping = {
                total_categories: mapping.total_categories || 0,
                ovoko_level3_categories: mapping.ovoko_level3_categories || 0,
                mapping_file: 'ovoko_mapping_level3.json',
                last_updated: mapping.created_at
            };
        } catch (error) {
            console.log('Could not load category mapping stats:', error.message);
            stats.categoryMapping = {
                error: 'Could not load mapping statistics'
            };
        }
        
        res.json(stats);
    } catch (error) {
        console.error('Overview endpoint error:', error);
        res.status(500).json({ error: 'Failed to load overview data' });
    }
});

// Documentation route
app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

// Catch-all route for SPA - must be last
app.get('*', (req, res) => {
    // Don't serve SPA for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // Serve the main HTML file for all other routes
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Dashboard: http://localhost:${PORT}/dashboard`);
    
    // Start the smart sync scheduler automatically
    console.log('🔄 Starting smart sync scheduler...');
    smartSyncScheduler.start();
    
    // Start the orders sync scheduler automatically
    console.log('🔄 Starting orders sync scheduler...');
    ordersSyncScheduler.start();
    
    // Add initial log
    addActivityLog('Server started', 'info', { port: PORT });
});