const fs = require('fs').promises;
const https = require('https');
const { URLSearchParams } = require('url');

class OvokoImporter {
    constructor() {
        // Ovoko API credentials
        this.username = 'bmw@bavariaparts.pl';
        this.password = 'Karawan1!';
        this.apiUrl = 'https://api.rrr.lt/crm/importPart';
        
        // You'll need to get this token from Ovoko
        // For now, using placeholder - you'll need to obtain the actual token
        this.userToken = 'YOUR_USER_TOKEN_HERE';
        
        // Default values for required fields (you may need to adjust these)
        this.defaultValues = {
            category_id: 55, // You'll need to get the correct category ID for car parts
            car_id: 291,     // You'll need to get the correct car ID for BMW
            quality: 1,      // Used parts quality
            status: 0        // Available status
        };
    }

    async importProduct(baselinkerProduct) {
        try {
            console.log(`Starting import for product: ${baselinkerProduct.text_fields.name}`);
            
            // Map BaseLinker product to Ovoko format
            const ovokoData = this.mapProductData(baselinkerProduct);
            
            // Make the API request
            const result = await this.makeApiRequest(ovokoData);
            
            console.log('Import successful:', result);
            return result;
            
        } catch (error) {
            console.error('Import failed:', error.message);
            throw error;
        }
    }

    mapProductData(product) {
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
            car_id: this.defaultValues.car_id,
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

    extractNotes(product) {
        const features = product.text_fields.features || {};
        const notes = [];
        
        // Add key features as notes
        if (features['Stan']) notes.push(`Stan: ${features['Stan']}`);
        if (features['Producent części']) notes.push(`Producent: ${features['Producent części']}`);
        if (features['Strona zabudowy']) notes.push(`Strona zabudowy: ${features['Strona zabudowy']}`);
        if (features['Kolor']) notes.push(`Kolor: ${features['Kolor']}`);
        if (features['Typ samochodu']) notes.push(`Typ: ${features['Typ samochodu']}`);
        
        // Add product name and weight
        notes.push(`Nazwa: ${product.text_fields.name}`);
        if (product.weight > 0) notes.push(`Waga: ${product.weight}kg`);
        
        return notes.join('; ');
    }

    async makeApiRequest(data) {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams();
            
            // Add all data to POST parameters
            Object.keys(data).forEach(key => {
                if (data[key] !== null && data[key] !== undefined) {
                    postData.append(key, data[key].toString());
                }
            });

            const options = {
                hostname: 'api.rrr.lt',
                path: '/crm/importPart',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData.toString())
                }
            };

            console.log('Making request to Ovoko API...');
            console.log('Request data:', JSON.stringify(data, null, 2));

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

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
        console.log('3. Verify the correct car_id for BMW vehicles');
        console.log('4. Update these values in the script\n');
        
        // For testing purposes, let's show what would be sent
        const mappedData = importer.mapProductData(firstProduct);
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