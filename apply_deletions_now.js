const fs = require('fs');
const https = require('https');
const { URLSearchParams } = require('url');

const CREDENTIALS = {
	username: 'bavarian',
	password: '5J1iod3cY6zUCkid',
	userToken: 'dcf1fb235513c6d36b7a700defdee8ab'
};

function readJson(path) {
	return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function sumStock(product) {
	if (!product || product.stock == null) return 0;
	if (typeof product.stock === 'number') return product.stock;
	if (typeof product.stock === 'object') {
		return Object.values(product.stock).reduce((a, b) => a + (b || 0), 0);
	}
	return 0;
}

async function deletePart(partId) {
	return new Promise((resolve, reject) => {
		const postData = new URLSearchParams();
		postData.append('username', CREDENTIALS.username);
		postData.append('password', CREDENTIALS.password);
		postData.append('user_token', CREDENTIALS.userToken);
		postData.append('part_id', String(partId));

		const options = {
			hostname: 'api.rrr.lt',
			path: '/crm/deletePart',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postData.toString())
			}
		};

		const req = https.request(options, (res) => {
			let body = '';
			res.on('data', (c) => (body += c));
			res.on('end', () => {
				try {
					const json = JSON.parse(body || '{}');
					if (json.status_code === 'R200') return resolve({ ok: true, json });
					return reject(new Error(json.msg || body || 'Unknown error'));
				} catch (e) {
					return reject(new Error(`Parse error: ${e.message}. Raw: ${body}`));
				}
			});
		});

		req.on('error', (e) => reject(e));
		req.write(postData.toString());
		req.end();
	});
}

async function main() {
	console.log('🚀 Applying deletions to Ovoko based on BaseLinker latest and sync_status...');
	const latest = readJson('baselinker_products_latest.json');
	const syncStatus = readJson('sync_status.json');

	const currentSkus = new Set(latest.filter(p => p.sku && p.sku.trim() !== '').map(p => p.sku));
	const outOfStockSkus = new Set(latest.filter(p => sumStock(p) === 0 && p.sku && p.sku.trim() !== '').map(p => p.sku));

	const syncedMap = syncStatus.synced_products || {};
	const candidates = [];
	for (const [sku, info] of Object.entries(syncedMap)) {
		const missingInBL = !currentSkus.has(sku);
		const isOut = outOfStockSkus.has(sku);
		if (missingInBL || isOut) {
			if (info && info.ovoko_part_id) {
				candidates.push({ sku, partId: info.ovoko_part_id, reason: missingInBL ? 'missing_in_baselinker' : 'out_of_stock' });
			}
		}
	}

	console.log(`📋 Candidates to delete: ${candidates.length}`);
	let ok = 0;
	let fail = 0;
	for (const item of candidates) {
		process.stdout.write(`🗑️  Deleting SKU ${item.sku} (part ${item.partId})... `);
		try {
			await deletePart(item.partId);
			console.log('OK');
			delete syncedMap[item.sku];
			ok += 1;
			// small delay to be nice to API
			await new Promise(r => setTimeout(r, 400));
		} catch (e) {
			console.log(`FAIL: ${e.message}`);
			fail += 1;
		}
	}

	syncStatus.synced_products = syncedMap;
	syncStatus.last_updated = new Date().toISOString();
	fs.writeFileSync('sync_status.json', JSON.stringify(syncStatus, null, 2));
	console.log(`\n✅ Done. Deleted: ${ok}, Failed: ${fail}. Updated sync_status.json.`);
}

if (require.main === module) {
	main().catch(e => {
		console.error('💥 Error:', e.message);
		process.exit(1);
	});
}