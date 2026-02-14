#!/usr/bin/env node
/**
 * Show PM2 Errors Script
 *
 * Displays recent errors from PM2 logs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for errors...\n');

// Check PM2 status
try {
  console.log('=== PM2 Status ===');
  const status = execSync('pm2 status', { encoding: 'utf-8' });
  console.log(status);
} catch (err) {
  console.log('PM2 not available');
}

// Check error log
console.log('\n=== Error Log (last 50 lines) ===');
const errLog = path.join(__dirname, '../logs/err.log');
if (fs.existsSync(errLog)) {
  try {
    const content = fs.readFileSync(errLog, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const recent = lines.slice(-50);
      console.log(recent.join('\n'));
    } else {
      console.log('Error log is empty');
    }
  } catch (err) {
    console.log('Could not read error log:', err.message);
  }
} else {
  console.log('Error log file does not exist');
}

// Check output log for errors
console.log('\n=== Output Log (last 50 lines) ===');
const outLog = path.join(__dirname, '../logs/out.log');
if (fs.existsSync(outLog)) {
  try {
    const content = fs.readFileSync(outLog, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const recent = lines.slice(-50);
      console.log(recent.join('\n'));
    } else {
      console.log('Output log is empty');
    }
  } catch (err) {
    console.log('Could not read output log:', err.message);
  }
} else {
  console.log('Output log file does not exist');
}

// Try to get PM2 error logs directly
console.log('\n=== PM2 Error Logs (direct) ===');
try {
  const pm2Err = execSync('pm2 logs topix99-luckywheel --err --lines 30 --nostream 2>&1', { encoding: 'utf-8' });
  if (pm2Err.trim()) {
    console.log(pm2Err);
  } else {
    console.log('No PM2 error logs found');
  }
} catch (err) {
  console.log('Could not get PM2 logs:', err.message);
}

console.log('\n💡 To see live errors, run: pm2 logs topix99-luckywheel --err');
