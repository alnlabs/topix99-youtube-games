#!/usr/bin/env node
/**
 * Status Check Script
 *
 * Checks PM2 status and shows recent logs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== PM2 Status ===\n');
try {
  const status = execSync('pm2 status', { encoding: 'utf-8' });
  console.log(status);
} catch (err) {
  console.log('PM2 not running or error:', err.message);
}

console.log('\n=== Recent Output Logs (last 20 lines) ===\n');
try {
  const outLog = path.join(__dirname, '../logs/out.log');
  if (fs.existsSync(outLog)) {
    const content = fs.readFileSync(outLog, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const recent = lines.slice(-20);
    console.log(recent.join('\n'));
  } else {
    console.log('No output log file found');
  }
} catch (err) {
  console.log('Error reading output log:', err.message);
}

console.log('\n=== Recent Error Logs (last 20 lines) ===\n');
try {
  const errLog = path.join(__dirname, '../logs/err.log');
  if (fs.existsSync(errLog)) {
    const content = fs.readFileSync(errLog, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    const recent = lines.slice(-20);
    console.log(recent.join('\n'));
  } else {
    console.log('No error log file found');
  }
} catch (err) {
  console.log('Error reading error log:', err.message);
}

console.log('\n=== Quick Commands ===\n');
console.log('View live logs: npm run pm2:logs');
console.log('Restart: npm run pm2:restart');
console.log('Status: npm run pm2:status');
