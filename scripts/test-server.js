#!/usr/bin/env node
/**
 * Test Server Startup
 *
 * Tests if the server can load without errors
 */

process.env.MODE = process.env.MODE || 'luckywheel';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('Testing server module loading...\n');
console.log('Environment:');
console.log('  MODE:', process.env.MODE);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('');

try {
  console.log('Step 1: Loading server.js...');
  require('../server.js');
  console.log('✅ Server loaded successfully');

  // Give it a moment to start
  setTimeout(() => {
    console.log('\n✅ Server started without errors');
    process.exit(0);
  }, 3000);
} catch (error) {
  console.error('\n❌ ERROR DURING LOADING:');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
