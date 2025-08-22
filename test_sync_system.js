const { InventoryStateSynchronizer } = require('./sync_inventory_states');
const { OvokoProductExporter } = require('./export_ovoko_products');

class SyncSystemTester {
    constructor(config) {
        this.config = config;
        this.synchronizer = new InventoryStateSynchronizer(config.baselinkerToken, config.ovoko);
        this.exporter = new OvokoProductExporter(config.ovoko);
    }

    async testBaseLinkerConnection() {
        console.log('🔌 Testing BaseLinker connection...');
        try {
            const response = await this.synchronizer.makeBaseLinkerRequest('getInventories');
            console.log('✅ BaseLinker connection successful!');
            console.log(`📦 Found ${response.inventories?.length || 0} inventories`);
            return true;
        } catch (error) {
            console.error('❌ BaseLinker connection failed:', error.message);
            return false;
        }
    }

    async testOvokoConnection() {
        console.log('🔌 Testing Ovoko connection...');
        try {
            // Try to get a small number of products to test connection
            const response = await this.exporter.makeApiRequest({
                page: 1,
                limit: 1
            });
            console.log('✅ Ovoko connection successful!');
            return true;
        } catch (error) {
            console.error('❌ Ovoko connection failed:', error.message);
            return false;
        }
    }

    async testInventoryStatesFetch() {
        console.log('📦 Testing inventory states fetch...');
        try {
            const states = await this.synchronizer.getCurrentInventoryStates();
            console.log('✅ Inventory states fetch successful!');
            console.log(`📊 Found ${Object.keys(states).length} products with inventory states`);
            
            // Show sample of states
            const sampleKeys = Object.keys(states).slice(0, 5);
            console.log('📋 Sample products:');
            sampleKeys.forEach(sku => {
                const state = states[sku];
                console.log(`  ${sku}: Stock ${state.stock} in ${state.inventory_name}`);
            });
            
            return true;
        } catch (error) {
            console.error('❌ Inventory states fetch failed:', error.message);
            return false;
        }
    }

    async testOvokoProductsLoad() {
        console.log('📤 Testing Ovoko products load...');
        try {
            const products = await this.synchronizer.loadOvokoProducts();
            console.log('✅ Ovoko products load successful!');
            console.log(`📦 Loaded ${products.length} products`);
            
            if (products.length > 0) {
                const sampleProduct = products[0];
                console.log('📋 Sample product structure:');
                console.log(`  SKU: ${sampleProduct.sku || 'N/A'}`);
                console.log(`  Part ID: ${sampleProduct.part_id || sampleProduct.id || 'N/A'}`);
                console.log(`  Name: ${sampleProduct.name || 'N/A'}`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Ovoko products load failed:', error.message);
            return false;
        }
    }

    async testProductAnalysis() {
        console.log('🔍 Testing product analysis...');
        try {
            // Get some sample data
            const baselinkerStates = await this.synchronizer.getCurrentInventoryStates();
            const ovokoProducts = await this.synchronizer.loadOvokoProducts();
            
            if (ovokoProducts.length === 0) {
                console.log('⚠️  No Ovoko products to analyze');
                return true;
            }
            
            // Test the analysis function
            const productsToRemove = await this.synchronizer.findProductsToRemove(baselinkerStates, ovokoProducts);
            
            console.log('✅ Product analysis successful!');
            console.log(`📊 Analysis results:`);
            console.log(`  BaseLinker products: ${Object.keys(baselinkerStates).length}`);
            console.log(`  Ovoko products: ${ovokoProducts.length}`);
            console.log(`  Products to remove: ${productsToRemove.length}`);
            
            if (productsToRemove.length > 0) {
                console.log('📋 Sample products to remove:');
                productsToRemove.slice(0, 3).forEach(product => {
                    console.log(`  ${product.sku || 'N/A'}: ${product.reason}`);
                });
            }
            
            return true;
        } catch (error) {
            console.error('❌ Product analysis failed:', error.message);
            return false;
        }
    }

    async runAllTests() {
        console.log('🧪 Starting system tests...');
        console.log('=' .repeat(50));
        
        const tests = [
            { name: 'BaseLinker Connection', test: () => this.testBaseLinkerConnection() },
            { name: 'Ovoko Connection', test: () => this.testOvokoConnection() },
            { name: 'Inventory States Fetch', test: () => this.testInventoryStatesFetch() },
            { name: 'Ovoko Products Load', test: () => this.testOvokoProductsLoad() },
            { name: 'Product Analysis', test: () => this.testProductAnalysis() }
        ];
        
        const results = [];
        
        for (const test of tests) {
            console.log(`\n🧪 Running: ${test.name}`);
            try {
                const result = await test.test();
                results.push({ name: test.name, success: result });
                console.log(`✅ ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
            } catch (error) {
                results.push({ name: test.name, success: false, error: error.message });
                console.log(`❌ ${test.name}: FAILED - ${error.message}`);
            }
        }
        
        // Summary
        console.log('\n' + '=' .repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('=' .repeat(50));
        
        const passed = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Total: ${results.length}`);
        
        if (failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! System is ready for use.');
        } else {
            console.log('\n⚠️  Some tests failed. Check the errors above.');
            console.log('💡 Fix the issues before running actual synchronization.');
        }
        
        return results;
    }

    async testDryRun() {
        console.log('🧪 Testing dry run (no actual deletion)...');
        console.log('=' .repeat(50));
        
        try {
            // Get current states
            const baselinkerStates = await this.synchronizer.getCurrentInventoryStates();
            const ovokoProducts = await this.synchronizer.loadOvokoProducts();
            
            if (ovokoProducts.length === 0) {
                console.log('⚠️  No Ovoko products found for dry run');
                return;
            }
            
            // Analyze what would be removed
            const productsToRemove = await this.synchronizer.findProductsToRemove(baselinkerStates, ovokoProducts);
            
            console.log('📊 DRY RUN RESULTS:');
            console.log(`  BaseLinker products: ${Object.keys(baselinkerStates).length}`);
            console.log(`  Ovoko products: ${ovokoProducts.length}`);
            console.log(`  Products that WOULD be removed: ${productsToRemove.length}`);
            
            if (productsToRemove.length > 0) {
                console.log('\n📋 Products that would be removed:');
                productsToRemove.forEach((product, index) => {
                    console.log(`  ${index + 1}. ${product.sku || 'N/A'}`);
                    console.log(`     Reason: ${product.reason}`);
                    console.log(`     Part ID: ${product.part_id || product.id || 'N/A'}`);
                });
            } else {
                console.log('\n✅ No products would be removed - everything is in sync!');
            }
            
            console.log('\n💡 This was a DRY RUN - no products were actually deleted.');
            console.log('🚀 To run actual synchronization, use: node run_inventory_sync.js full');
            
        } catch (error) {
            console.error('❌ Dry run failed:', error.message);
        }
    }
}

// Configuration
const CONFIG = {
    baselinkerToken: '11804-22135-DUWJWIYRACO1WDVKPLZROK7N2UWR1L0W1B7JMV3FRV1HMK70GVOHQRO7IFGWTO9F',
    ovoko: {
        username: 'bmw@bavariaparts.pl',
        password: 'Karawan1!',
        userToken: 'dcf1fb235513c6d36b7a700defdee8ab'
    }
};

// Main execution
async function main() {
    const tester = new SyncSystemTester(CONFIG);
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'all';
    
    try {
        switch (command) {
            case 'all':
                await tester.runAllTests();
                break;
                
            case 'dryrun':
                await tester.testDryRun();
                break;
                
            case 'connection':
                await tester.testBaseLinkerConnection();
                await tester.testOvokoConnection();
                break;
                
            case 'analysis':
                await tester.testProductAnalysis();
                break;
                
            default:
                console.log('Available test commands:');
                console.log('  all      - Run all tests');
                console.log('  dryrun   - Test what would be removed (no actual deletion)');
                console.log('  dryrun   - Test what would be removed (no actual deletion)');
                console.log('  connection - Test API connections only');
                console.log('  analysis - Test product analysis only');
                break;
        }
        
    } catch (error) {
        console.error('💥 Testing failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { SyncSystemTester }; 