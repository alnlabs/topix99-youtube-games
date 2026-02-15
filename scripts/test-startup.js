#!/usr/bin/env node
/**
 * Test Startup Script
 *
 * Tests if the server can start without errors
 */

process.env.MODE = process.env.MODE || 'luckywheel';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('Testing server startup...\n');
console.log('Environment:');
console.log('  MODE:', process.env.MODE);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  TOPIX99_API_TOKEN:', process.env.TOPIX99_API_TOKEN ? 'SET' : 'NOT SET');
console.log('  REDIS_URL:', process.env.REDIS_URL || 'redis://127.0.0.1:6379');
console.log('');

try {
  console.log('Loading server.js...');
  require('../src/entry/server.js');
  console.log('✅ Server loaded successfully');

  // Give it a moment to start, then exit
  setTimeout(() => {
    console.log('\n✅ Startup test passed - server started without errors');
    process.exit(0);
  }, 2000);
} catch (error) {
  console.error('\n❌ Startup failed:');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
