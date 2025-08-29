const https = require('https');
const { URLSearchParams } = require('url');

// BaseLinker API configuration from your codebase
const BASELINKER_TOKEN = '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F';

/**
 * Get warehouses from BaseLinker API
 */
async function getInventoryWarehouses() {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        postData.append('token', BASELINKER_TOKEN);
        postData.append('method', 'getInventoryWarehouses');
        postData.append('parameters', '{}');

        const options = {
            hostname: 'api.baselinker.com',
            path: '/connector.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'User-Agent': 'BaseLinker-Client/1.0'
            }
        };

        console.log('🔄 Fetching warehouses from BaseLinker API...');

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('📥 BaseLinker response received');
                    
                    if (response.status === 'SUCCESS') {
                        resolve(response);
                    } else {
                        reject(new Error(`API Error: ${response.error_message || JSON.stringify(response)}`));
                    }
                } catch (error) {
                    reject(new Error(`JSON Parse Error: ${error.message}`));
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

/**
 * Find and display default warehouse information
 */
function findDefaultWarehouse(warehouses) {
    const defaultWarehouse = warehouses.find(warehouse => warehouse.is_default === true);
    
    if (defaultWarehouse) {
        console.log('\n🏢 DOMYŚLNY MAGAZYN ZNALEZIONY:');
        console.log('=====================================');
        console.log(`ID: ${defaultWarehouse.warehouse_id}`);
        console.log(`Nazwa: ${defaultWarehouse.name}`);
        console.log(`Typ: ${defaultWarehouse.warehouse_type}`);
        console.log(`Opis: ${defaultWarehouse.description}`);
        console.log(`Edycja stanów: ${defaultWarehouse.stock_edition ? 'TAK' : 'NIE'}`);
        console.log(`Domyślny: ${defaultWarehouse.is_default ? 'TAK' : 'NIE'}`);
        console.log('=====================================');
        
        return defaultWarehouse;
    } else {
        console.log('\n❌ Nie znaleziono domyślnego magazynu');
        return null;
    }
}

/**
 * Display all warehouses information
 */
function displayAllWarehouses(warehouses) {
    console.log('\n📋 WSZYSTKIE MAGAZYNY:');
    console.log('=====================================');
    
    warehouses.forEach((warehouse, index) => {
        console.log(`\n${index + 1}. Magazyn ID: ${warehouse.warehouse_id}`);
        console.log(`   Nazwa: ${warehouse.name}`);
        console.log(`   Typ: ${warehouse.warehouse_type}`);
        console.log(`   Opis: ${warehouse.description}`);
        console.log(`   Edycja stanów: ${warehouse.stock_edition ? 'TAK' : 'NIE'}`);
        console.log(`   Domyślny: ${warehouse.is_default ? 'TAK' : 'NIE'}`);
        console.log('   ---');
    });
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('🚀 Pobieranie informacji o magazynach z BaseLinker...\n');
        
        const response = await getInventoryWarehouses();
        
        if (response.warehouses && response.warehouses.length > 0) {
            console.log(`✅ Znaleziono ${response.warehouses.length} magazynów`);
            
            // Find and display default warehouse
            const defaultWarehouse = findDefaultWarehouse(response.warehouses);
            
            // Display all warehouses
            displayAllWarehouses(response.warehouses);
            
            // Save to file for reference
            const fs = require('fs');
            const filename = `warehouses_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            fs.writeFileSync(filename, JSON.stringify(response, null, 2));
            console.log(`\n💾 Dane zapisane do pliku: ${filename}`);
            
        } else {
            console.log('❌ Brak magazynów w odpowiedzi API');
        }
        
    } catch (error) {
        console.error('\n💀 Błąd podczas pobierania danych:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    getInventoryWarehouses,
    findDefaultWarehouse
};
