const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');

class OvokoImporter {
    constructor() {
        // Ovoko API credentials
        this.username = 'bavarian';
        this.password = '5J1iod3cY6zUCkid';
        this.userToken = 'dcf1fb235513c6d36b7a700defdee8ab';

        // API endpoints
        this.importPartUrl = 'https://api.rrr.lt/crm/importPart';
        this.getCarsUrl = 'https://api.rrr.lt/get/cars/2020-01-01/2020-12-31';
        this.addCarUrl = 'https://api.rrr.lt/add/car';

        // Default values for required fields (may be overridden)
        this.defaultValues = {
            category_id: 55, // Placeholder, update as needed
            quality: 1,      // Used parts quality
            status: 0        // Available status
        };
    }

    /**
     * Main import function for a BaseLinker product.
     * Handles car_id logic: extracts car name, finds or creates car, then imports part.
     */
    async importProduct(baselinkerProduct) {
        try {
            console.log(`Starting import for product: ${baselinkerProduct.text_fields.name}`);

            // 1. Extract car name from product name
            const carName = this.extractCarName(baselinkerProduct.text_fields.name);
            if (!carName) throw new Error('Could not extract car name from product name.');

            // 2. Find car_id by car name (fetch all cars from 2020)
            let carId = await this.findCarIdByName(carName);

            // 3. If not found, add new car and get its id
            if (!carId) {
                console.log(`Car "${carName}" not found. Adding new car...`);
                carId = await this.addCar(carName);
                if (!carId) throw new Error('Failed to add new car.');
                console.log(`Added new car "${carName}" with id ${carId}`);
            } else {
                console.log(`Found car "${carName}" with id ${carId}`);
            }

            // 4. Map product data for import, using the found car_id
            const ovokoData = this.mapProductData(baselinkerProduct, carId);

            // 5. Make the API request to import the part
            const result = await this.makeApiRequest(this.importPartUrl, ovokoData);

            console.log('Import successful:', result);
            return result;
        } catch (error) {
            console.error('Import failed:', error.message);
            throw error;
        }
    }

    /**
     * Extracts the car name from the product name by splitting at the first occurrence of "BMW" (case-insensitive).
     * Example: "Wyświetlacz HEAD UP BMW E61 EU" => "BMW E61 EU"
     */
    extractCarName(productName) {
        if (!productName) return null;
        const match = productName.match(/(BMW.*)$/i);
        return match ? match[1].trim() : null;
    }

    /**
     * Fetches all cars from 2020 and tries to find a car with the given name (case-insensitive).
     * Returns the car id if found, otherwise null.
     */
    async findCarIdByName(carName) {
        const postData = new URLSearchParams({
            username: this.username,
            password: this.password,
            user_token: this.userToken
        });

        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.rrr.lt',
                path: '/get/cars/2020-01-01/2020-12-31',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData.toString())
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        if (response.status_code === 'R200' && Array.isArray(response.list)) {
                            // Try to find car by name (case-insensitive, trimmed)
                            const found = response.list.find(car =>
                                car.car_model_name && car.car_model_name.trim().toLowerCase() === carName.trim().toLowerCase()
                            );
                            resolve(found ? found.id : null);
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        console.error('Error parsing get cars response:', responseData);
                        resolve(null);
                    }
                });
            });
            req.on('error', err => {
                console.error('Error fetching cars:', err.message);
                resolve(null);
            });
            req.write(postData.toString());
            req.end();
        });
    }

    /**
     * Adds a new car with the given name. Returns the new car's id if successful.
     * Only car_model_name is set, other fields are filled with example values.
     */
    async addCar(carName) {
        const postData = new URLSearchParams({
            username: this.username,
            password: this.password,
            user_token: this.userToken,
            car_model_name: carName,
            car_model: 6, // Example model id
            car_years: '2000', // Example year
            status: 0
            // Other fields can be added as needed
        });

        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.rrr.lt',
                path: '/add/car',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData.toString())
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        if (response.status_code === 'R200' && response.id) {
                            resolve(response.id);
                        } else {
                            console.error('Add car failed:', responseData);
                            resolve(null);
                        }
                    } catch (e) {
                        console.error('Error parsing add car response:', responseData);
                        resolve(null);
                    }
                });
            });
            req.on('error', err => {
                console.error('Error adding car:', err.message);
                resolve(null);
            });
            req.write(postData.toString());
            req.end();
        });
    }

    /**
     * Maps a BaseLinker product to Ovoko importPart API format.
     * Uses the provided car_id.
     */
    mapProductData(product, car_id) {
        // Extract price (using the first available price)
        const prices = Object.values(product.prices || {});
        const price = prices.length > 0 ? prices[0] : null;

        // Extract images
        const images = Object.values(product.images || {});
        const mainPhoto = images.length > 0 ? images[0] : null;

        // Extract manufacturer code from features
        const manufacturerCode = product.text_fields.features?.['Numer katalogowy części'] || '';

        // Prepare the data for Ovoko API
        const ovokoData = {
            // Required authentication
            username: this.username,
            password: this.password,
            user_token: this.userToken,

            // Required fields
            category_id: this.defaultValues.category_id,
            car_id: car_id,
            quality: this.defaultValues.quality,
            status: this.defaultValues.status,

            // Optional but important fields
            external_id: product.sku, // Use BaseLinker SKU as external ID
            manufacturer_code: manufacturerCode,
            visible_code: product.sku,
            notes: this.extractNotes(product),
            internal_notes: `Imported from BaseLinker. Original category: ${product.category_id}`,

            // Price
            price: price,
            original_currency: 'EUR',

            // Main photo
            photo: mainPhoto
        };

        // Add additional photos if available
        if (images.length > 0) {
            images.forEach((imageUrl, index) => {
                ovokoData[`photos[${index}]`] = imageUrl;
            });
        }

        // Add optional codes if we have them
        if (product.ean) {
            ovokoData['optional_codes[0]'] = product.ean;
        }

        return ovokoData;
    }

    /**
     * Extracts notes from product features.
     */
    extractNotes(product) {
        const features = product.text_fields.features || {};
        const notes = [];

        if (features['Stan']) notes.push(`Stan: ${features['Stan']}`);
        if (features['Producent części']) notes.push(`Producent: ${features['Producent części']}`);
        if (features['Strona zabudowy']) notes.push(`Strona zabudowy: ${features['Strona zabudowy']}`);
        if (features['Kolor']) notes.push(`Kolor: ${features['Kolor']}`);
        if (features['Typ samochodu']) notes.push(`Typ: ${features['Typ samochodu']}`);

        notes.push(`Nazwa: ${product.text_fields.name}`);
        if (product.weight > 0) notes.push(`Waga: ${product.weight}kg`);

        return notes.join('; ');
    }

    /**
     * Makes a POST request to the given API endpoint with the provided data.
     */
    async makeApiRequest(apiUrl, data) {
        const url = new URL(apiUrl);
        const postData = new URLSearchParams();

        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== undefined) {
                postData.append(key, data[key].toString());
            }
        });

        return new Promise((resolve, reject) => {
            const options = {
                hostname: url.hostname,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData.toString())
                }
            };

            console.log(`Making request to ${apiUrl}...`);
            // console.log('Request data:', JSON.stringify(data, null, 2));

            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(responseData);
                        if (response.status_code === 'R200') {
                            resolve(response);
                        } else {
                            reject(new Error(`Ovoko API Error: ${response.msg || JSON.stringify(response)}`));
                        }
                    } catch (error) {
                        console.error('Raw response:', responseData);
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
}

async function main() {
    try {
        console.log('Loading BaseLinker products...');

        // Read the BaseLinker products file
        const data = await fs.readFile('baselinker_products_2025-08-09T06-31-13-827Z.json', 'utf8');
        const products = JSON.parse(data);

        if (products.length === 0) {
            console.log('No products found in the file');
            return;
        }

        // Get the first product
        const firstProduct = products[0];
        console.log(`Found ${products.length} products. Importing first product:`);
        console.log(`- SKU: ${firstProduct.sku}`);
        console.log(`- Name: ${firstProduct.text_fields.name}`);
        console.log(`- Images: ${Object.keys(firstProduct.images || {}).length}`);

        // Create importer and import the first product
        const importer = new OvokoImporter();

        console.log('\n⚠️  IMPORTANT: Before running this script, you need to:');
        console.log('1. Get the user_token from Ovoko API');
        console.log('2. Verify the correct category_id for this type of part');
        console.log('3. Update any example values for car creation if needed');
        console.log('4. Update these values in the script\n');

        // For testing purposes, let's show what would be sent
        const carName = importer.extractCarName(firstProduct.text_fields.name);
        let carId = await importer.findCarIdByName(carName);
        if (!carId) {
            console.log(`Car "${carName}" not found. Would add new car...`);
            // Uncomment to actually add car:
            // carId = await importer.addCar(carName);
        } else {
            console.log(`Found car "${carName}" with id ${carId}`);
        }
        const mappedData = importer.mapProductData(firstProduct, carId || 0);
        console.log('Mapped data that would be sent to Ovoko:');
        console.log(JSON.stringify(mappedData, null, 2));

        // Uncomment the line below when you have the correct token and IDs
        // const result = await importer.importProduct(firstProduct);

        console.log('\nTest completed. Update the script with correct values and uncomment the import line to actually import.');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { OvokoImporter };