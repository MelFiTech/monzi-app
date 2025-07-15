const fs = require('fs');

// Read the banks data
const banksData = JSON.parse(fs.readFileSync('banks-data.json', 'utf8'));

// Generate the TypeScript array for all banks
const bankArray = banksData.map(bank => 
  `        { code: '${bank.code}', name: '${bank.name}' }`
).join(',\n');

console.log('Generated TypeScript array for all banks:');
console.log('Copy this into the initializeAllBanks method:\n');
console.log(`      this.allBanksCache = [\n${bankArray}\n      ];`);
console.log(`\nTotal banks: ${banksData.length}`);
