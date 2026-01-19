// Test script to verify email domain functionality
const sisImports = require('./sis_imports');

// Test custom email domain functionality
console.log('Testing SIS Imports with custom email domain...\n');

// Test 1: Default domain
console.log('Test 1: Default domain (@school.edu)');
const defaultUsers = sisImports.generateUsersCSV(3);
console.log(defaultUsers);
console.log('\n' + '='.repeat(50) + '\n');

// Test 2: Custom domain without @
console.log('Test 2: Custom domain without @ (example.com)');
const customUsers1 = sisImports.generateUsersCSV(3, 'example.com');
console.log(customUsers1);
console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Custom domain with @
console.log('Test 3: Custom domain with @ (@university.edu)');
const customUsers2 = sisImports.generateUsersCSV(3, '@university.edu');
console.log(customUsers2);
console.log('\n' + '='.repeat(50) + '\n');

// Test 4: Corporate domain
console.log('Test 4: Corporate domain (@mycompany.com)');
const customUsers3 = sisImports.generateUsersCSV(3, '@mycompany.com');
console.log(customUsers3);

console.log('\nAll tests completed successfully!');
