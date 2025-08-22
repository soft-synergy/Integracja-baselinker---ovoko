const { OvokoProductExporter } = require('./export_ovoko_products');
const { InventoryStateSynchronizer } = require('./sync_inventory_states');
const fs = require('fs').promises;

class InventorySyncManager {
    constructor(config) {
        this.config = config;
        this.exporter = new OvokoProductExporter(config.ovoko);
        this.synchronizer = new InventoryStateSynchronizer(config.baselinkerToken, config.ovoko);
    }

    async runFullSync() {
        const startTime = Date.now();
        
        try {
            console.log('🚀 Starting full inventory synchronization process...');
            console.log('📊 BaseLinker ↔ Ovoko');
            console.log('=' .repeat(50));
            
            // Step 1: Export current products from Ovoko
            console.log('\n📤 STEP 1: Exporting current products from Ovoko...');
            const exportResult = await this.exporter.exportAllProducts();
            
            if (!exportResult.success) {
                throw new Error('Failed to export products from Ovoko');
            }
            
            console.log(`✅ Exported ${exportResult.productCount} products from Ovoko`);
            console.log(`💾 Saved to: ${exportResult.filename}`);
            
            // Step 2: Synchronize inventory states
            console.log('\n🔄 STEP 2: Synchronizing inventory states...');
            const syncResult = await this.synchronizer.synchronizeInventoryStates();
            
            if (!syncResult.success) {
                throw new Error(`Synchronization failed: ${syncResult.error || syncResult.message}`);
            }
            
            // Step 3: Generate final report
            const endTime = Date.now();
            const totalDuration = Math.round((endTime - startTime) / 1000);
            
            const finalReport = {
                timestamp: new Date().toISOString(),
                total_duration: totalDuration,
                export_result: exportResult,
                sync_result: syncResult,
                summary: {
                    ovoko_products_before: syncResult.ovoko_products_before,
                    ovoko_products_after: syncResult.ovoko_products_after,
                    products_removed: syncResult.products_removed,
                    products_failed: syncResult.products_failed,
                    baselinker_products: syncResult.baselinker_products
                }
            };
            
            // Save final report
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const finalReportFilename = `full_sync_report_${timestamp}.json`;
            await fs.writeFile(finalReportFilename, JSON.stringify(finalReport, null, 2), 'utf8');
            
            console.log('\n🎉 FULL SYNCHRONIZATION COMPLETED SUCCESSFULLY!');
            console.log('=' .repeat(50));
            console.log(`⏱️  Total duration: ${totalDuration} seconds`);
            console.log(`📊 Final report saved to: ${finalReportFilename}`);
            console.log(`📦 Ovoko products: ${finalReport.summary.ovoko_products_before} → ${finalReport.summary.ovoko_products_after}`);
            console.log(`🗑️  Products removed: ${finalReport.summary.products_removed}`);
            console.log(`❌ Products failed: ${finalReport.summary.products_failed}`);
            console.log(`🔗 BaseLinker products: ${finalReport.summary.baselinker_products}`);
            
            return finalReport;
            
        } catch (error) {
            console.error('\n💥 FULL SYNCHRONIZATION FAILED!');
            console.error('Error:', error.message);
            
            const errorReport = {
                timestamp: new Date().toISOString(),
                error: error.message,
                stack: error.stack
            };
            
            const errorFilename = `sync_error_report_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            await fs.writeFile(errorFilename, JSON.stringify(errorReport, null, 2), 'utf8');
            
            console.error(`📄 Error report saved to: ${errorFilename}`);
            
            throw error;
        }
    }

    async runQuickSync() {
        try {
            console.log('⚡ Running quick synchronization (using existing Ovoko products file)...');
            
            const syncResult = await this.synchronizer.synchronizeInventoryStates();
            
            if (syncResult.success) {
                console.log('✅ Quick sync completed successfully!');
                return syncResult;
            } else {
                throw new Error(syncResult.error || syncResult.message);
            }
            
        } catch (error) {
            console.error('💥 Quick sync failed:', error.message);
            throw error;
        }
    }

    async checkSyncStatus() {
        try {
            console.log('🔍 Checking synchronization status...');
            
            // Check if we have recent files
            const files = await fs.readdir('.');
            const ovokoFiles = files.filter(f => f.startsWith('ovoko_products_') && f.endsWith('.json'));
            const baselinkerFiles = files.filter(f => f.startsWith('baselinker_products_') && f.endsWith('.json'));
            const syncReports = files.filter(f => f.startsWith('inventory_sync_report_') && f.endsWith('.json'));
            
            console.log(`📁 Found files:`);
            console.log(`  Ovoko products: ${ovokoFiles.length}`);
            console.log(`  BaseLinker products: ${baselinkerFiles.length}`);
            console.log(`  Sync reports: ${syncReports.length}`);
            
            if (ovokoFiles.length > 0) {
                const latestOvoko = ovokoFiles.sort().pop();
                const ovokoStats = await fs.stat(latestOvoko);
                const ovokoAge = Math.round((Date.now() - ovokoStats.mtime.getTime()) / (1000 * 60 * 60)); // hours
                console.log(`  Latest Ovoko export: ${latestOvoko} (${ovokoAge} hours ago)`);
            }
            
            if (baselinkerFiles.length > 0) {
                const latestBaselinker = baselinkerFiles.sort().pop();
                const baselinkerStats = await fs.stat(latestBaselinker);
                const baselinkerAge = Math.round((Date.now() - baselinkerStats.mtime.getTime()) / (1000 * 60 * 60)); // hours
                console.log(`  Latest BaseLinker export: ${latestBaselinker} (${baselinkerAge} hours ago)`);
            }
            
            if (syncReports.length > 0) {
                const latestSync = syncReports.sort().pop();
                const syncStats = await fs.stat(latestSync);
                const syncAge = Math.round((Date.now() - syncStats.mtime.getTime()) / (1000 * 60 * 60)); // hours
                console.log(`  Latest sync report: ${latestSync} (${syncAge} hours ago)`);
            }
            
            // Recommendations
            console.log('\n💡 Recommendations:');
            if (ovokoFiles.length === 0) {
                console.log('  - Run full sync to export products from Ovoko first');
            } else if (baselinkerFiles.length === 0) {
                console.log('  - Export products from BaseLinker first');
            } else {
                console.log('  - Ready for synchronization');
                console.log('  - Use "quick sync" if you have recent data');
                console.log('  - Use "full sync" for complete refresh');
            }
            
        } catch (error) {
            console.error('Error checking status:', error.message);
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
    const manager = new InventorySyncManager(CONFIG);
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0] || 'status';
    
    try {
        switch (command) {
            case 'full':
                console.log('🚀 Running FULL synchronization...');
                await manager.runFullSync();
                break;
                
            case 'quick':
                console.log('⚡ Running QUICK synchronization...');
                await manager.runQuickSync();
                break;
                
            case 'status':
            default:
                await manager.checkSyncStatus();
                break;
        }
        
    } catch (error) {
        console.error('💥 Command failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { InventorySyncManager }; 