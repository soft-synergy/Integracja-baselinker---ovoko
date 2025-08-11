const https = require('https');

async function testWebLogin() {
    console.log('🌐 Testing web login to Ovoko...');
    
    const credentials = [
        { username: 'bmw@bavariaparts.pl', password: 'Karawan1!' },
        { username: 'bmw@bavariaparts.pl', password: 'Karawan1' },
        { username: 'bavariaparts', password: 'Karawan1!' }
    ];
    
    for (const cred of credentials) {
        try {
            console.log(`\n🔄 Testing: ${cred.username} / ${cred.password}`);
            
            // Try to access the web interface
            const result = await makeWebRequest('https://bavarian.rrr.lt/v2', {
                username: cred.username,
                password: cred.password
            });
            
            console.log(`📥 Response status: ${result.statusCode}`);
            if (result.data.includes('error') || result.data.includes('Error')) {
                console.log('❌ Login failed');
            } else if (result.data.includes('dashboard') || result.data.includes('welcome')) {
                console.log('✅ Login successful!');
            } else {
                console.log('⚠️ Unknown response');
            }
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
}

function makeWebRequest(url, data) {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams();
        postData.append('username', data.username);
        postData.append('password', data.password);
        
        const options = {
            hostname: 'bavarian.rrr.lt',
            path: '/v2',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData.toString()),
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        };
        
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: responseData
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.write(postData.toString());
        req.end();
    });
}

// Also try to get API documentation
async function getApiDocs() {
    console.log('\n📚 Trying to get API documentation...');
    
    try {
        const result = await makeWebRequest('https://api.rrr.lt/docs', {});
        console.log('API docs response:', result);
    } catch (error) {
        console.log('Could not get API docs:', error.message);
    }
}

async function main() {
    await testWebLogin();
    await getApiDocs();
    console.log('\n🏁 Web login test completed');
}

if (require.main === module) {
    main();
} 