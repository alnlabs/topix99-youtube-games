#!/usr/bin/env node
/**
 * Diagnostic Script
 *
 * Checks application status and helps diagnose issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Topix99 YouTube Games - Diagnostic Check\n');
console.log('='.repeat(60));

// Check PM2
console.log('\n📊 PM2 Status:');
try {
  const status = execSync('pm2 status', { encoding: 'utf-8' });
  console.log(status);

  // Check if process is running
  if (status.includes('topix99-luckywheel')) {
    const isOnline = status.includes('online');
    console.log(`\n✅ Process found: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);

    if (isOnline) {
      try {
        const info = execSync('pm2 describe topix99-luckywheel', { encoding: 'utf-8' });
        console.log('\n📋 Process Details:');
        console.log(info);
      } catch (e) {
        console.log('⚠️  Could not get process details');
      }
    }
  } else {
    console.log('❌ Process not found in PM2');
    console.log('💡 Run: npm run pm2:start');
  }
} catch (err) {
  console.log('❌ PM2 not available or error:', err.message);
  console.log('💡 Install PM2: npm install -g pm2');
}

// Check log files
console.log('\n📁 Log Files:');
const logsDir = path.join(__dirname, '../logs');
if (fs.existsSync(logsDir)) {
  const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
  if (files.length > 0) {
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(2);
      const modified = stats.mtime.toISOString();
      console.log(`  ${file}: ${size} KB (modified: ${modified})`);

      // Show last few lines
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          console.log(`    Last line: ${lines[lines.length - 1].substring(0, 100)}...`);
        }
      } catch (e) {
        console.log(`    Could not read file`);
      }
    });
  } else {
    console.log('  ⚠️  No log files found');
  }
} else {
  console.log('  ⚠️  Logs directory does not exist');
  console.log('  💡 Logs will be created when PM2 starts');
}

// Check if port is in use
console.log('\n🌐 Port Check:');
try {
  const portCheck = execSync('lsof -i :4001 2>&1', { encoding: 'utf-8' });
  if (portCheck.includes('node') || portCheck.includes('LISTEN')) {
    console.log('  ✅ Port 4001 is in use (application likely running)');
  } else {
    console.log('  ⚠️  Port 4001 is not in use (application may not be running)');
  }
} catch (err) {
  console.log('  ⚠️  Could not check port (lsof not available)');
}

// Check Redis
console.log('\n💾 Redis Check:');
try {
  const redisCheck = execSync('redis-cli ping 2>&1', { encoding: 'utf-8' });
  if (redisCheck.includes('PONG')) {
    console.log('  ✅ Redis is running');
  } else {
    console.log('  ⚠️  Redis may not be running');
  }
} catch (err) {
  console.log('  ⚠️  Redis not accessible:', err.message);
  console.log('  💡 Start Redis: redis-server');
}

// Check FFmpeg
console.log('\n🎥 FFmpeg Check:');
try {
  const ffmpegCheck = execSync('ffmpeg -version 2>&1 | head -1', { encoding: 'utf-8' });
  console.log('  ✅ FFmpeg installed:', ffmpegCheck.trim());
} catch (err) {
  console.log('  ❌ FFmpeg not found');
  console.log('  💡 Install FFmpeg: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)');
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 Quick Commands:');
console.log('  View logs:     npm run pm2:logs');
console.log('  Check status:  npm run pm2:status');
console.log('  Restart:       npm run pm2:restart');
console.log('  Start:         npm run pm2:start');
console.log('  Stop:          npm run pm2:stop');
