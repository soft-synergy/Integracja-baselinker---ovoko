const fs = require('fs').promises;
const path = require('path');
const { checkProductChanges } = require('./check_product_changes');

const PRODUCTS_QUEUE_CONFIG = {
    interval: 10 * 60 * 1000
};

class ProductsQueue {
    constructor() {
        this.isRunning = false;
        this.lastRun = null;
        this.nextRun = null;
        this.totalRuns = 0;
        this.savedCount = 0;
        this.lastError = null;
        this.latestSourceFile = null;
    }

    start() {
        if (this.isRunning) {
            console.log('⚠️ Products queue already running');
            return;
        }
        this.isRunning = true;
        console.log('🚀 Starting Products Fetch Queue...');
        console.log(`⏰ Fetching products every ${PRODUCTS_QUEUE_CONFIG.interval / 60000} minutes`);

        this.runOnce();
        this.interval = setInterval(() => this.runOnce(), PRODUCTS_QUEUE_CONFIG.interval);
        this.updateNextRunTime();
    }

    stop() {
        if (!this.isRunning) return;
        clearInterval(this.interval);
        this.isRunning = false;
        console.log('🛑 Products Fetch Queue stopped');
    }

    async runOnce() {
        try {
            console.log(`\n📦 [${new Date().toISOString()}] Fetching latest BaseLinker products file...`);
            const latestFile = await this.findLatestBaseLinkerFile();
            if (!latestFile) {
                console.log('⚠️ No BaseLinker products file found');
                this.totalRuns += 1;
                this.lastRun = new Date();
                this.lastError = null;
                this.updateNextRunTime();
                return;
            }

            const data = await fs.readFile(latestFile, 'utf8');
            const products = JSON.parse(data);

            // Save to canonical latest file
            await fs.writeFile('baselinker_products_latest.json', JSON.stringify(products, null, 2), 'utf8');
            this.savedCount = products.length;
            this.latestSourceFile = path.basename(latestFile);
            console.log(`💾 Saved ${products.length} products to baselinker_products_latest.json (from ${this.latestSourceFile})`);

            // Check for product changes and enqueue updates
            console.log('🔍 Checking for product changes...');
            try {
                const result = await checkProductChanges();
                if (result.error) {
                    console.error('⚠️ Error checking product changes:', result.error);
                } else if (result.changesFound > 0) {
                    console.log(`✅ Found ${result.changesFound} products with changes, events enqueued.`);
                } else {
                    console.log('✅ No product changes detected.');
                }
            } catch (error) {
                console.error('⚠️ Error checking product changes:', error.message);
            }

            this.totalRuns += 1;
            this.lastRun = new Date();
            this.lastError = null;
            this.updateNextRunTime();
        } catch (error) {
            console.error('💥 Products fetch error:', error.message);
            this.totalRuns += 1;
            this.lastRun = new Date();
            this.lastError = error.message;
            this.updateNextRunTime();
        }
    }

    async findLatestBaseLinkerFile() {
        const cwd = process.cwd();
        const entries = await fs.readdir(cwd);
        const candidates = [];
        for (const name of entries) {
            if (name.startsWith('baselinker_products_') && name.endsWith('.json')) {
                const full = path.join(cwd, name);
                try {
                    const stat = await fs.stat(full);
                    candidates.push({ full, mtime: stat.mtimeMs });
                } catch (_) {}
            }
        }
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => b.mtime - a.mtime);
        return candidates[0].full;
    }

    updateNextRunTime() {
        this.nextRun = new Date(Date.now() + PRODUCTS_QUEUE_CONFIG.interval);
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            nextRun: this.nextRun,
            totalRuns: this.totalRuns,
            savedCount: this.savedCount,
            latestSourceFile: this.latestSourceFile,
            lastError: this.lastError,
            interval: PRODUCTS_QUEUE_CONFIG.interval / 60000
        };
    }
}

const productsQueue = new ProductsQueue();

process.on('SIGINT', () => {
    productsQueue.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    productsQueue.stop();
    process.exit(0);
});

module.exports = { ProductsQueue, productsQueue };

if (require.main === module) {
    console.log('🚀 Starting Products Fetch Queue...');
    productsQueue.start();
}