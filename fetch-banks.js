const https = require('https');

async function getBanks() {
  try {
    console.log('🏦 Fetching banks from SME Plug API...');
    
    const options = {
      hostname: 'smeplug.ng',
      path: '/api/v1/transfer/banks',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ed4155359e54d7d9ee3e7b5726829ba16666aa8c074fbfde643a096cef486c7f',
        'Content-Type': 'application/json',
        'User-Agent': 'MonziApp/1.0.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          if (result.status && Array.isArray(result.banks)) {
            console.log(`✅ Found ${result.banks.length} banks`);
            console.log('First 20 banks:');
            result.banks.slice(0, 20).forEach((bank, index) => {
              console.log(`${index + 1}. ${bank.name} (Code: ${bank.code})`);
            });
            
            // Save to file for analysis
            const fs = require('fs');
            fs.writeFileSync('banks-data.json', JSON.stringify(result.banks, null, 2));
            console.log('\n💾 Saved complete bank list to banks-data.json');
            
            // Show total count
            console.log(`\nTotal banks available: ${result.banks.length}`);
          } else {
            console.error('❌ Invalid response format');
          }
        } catch (parseError) {
          console.error('❌ Error parsing response:', parseError.message);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
    });

    req.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getBanks();
