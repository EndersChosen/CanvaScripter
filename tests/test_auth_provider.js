// Test script to verify authentication provider functionality
const sisImports = require('./sis_imports');

// Test authentication provider functionality
console.log('Testing Authentication Provider functionality...\n');

// Test 1: Users CSV with authentication provider ID
console.log('Test 1: Users CSV with authentication provider ID');
const usersWithAuth = sisImports.generateUsersCSV(3, '@school.edu', '123');
console.log(usersWithAuth);
console.log('\n' + '='.repeat(50) + '\n');

// Test 2: Users CSV without authentication provider (default)
console.log('Test 2: Users CSV without authentication provider (default)');
const usersWithoutAuth = sisImports.generateUsersCSV(3, '@school.edu', '');
console.log(usersWithoutAuth);
console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Users CSV with different auth provider
console.log('Test 3: Users CSV with different auth provider (456)');
const usersWithDifferentAuth = sisImports.generateUsersCSV(3, '@university.edu', '456');
console.log(usersWithDifferentAuth);

console.log('\nAuthentication provider tests completed successfully!');
