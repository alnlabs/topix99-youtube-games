const { exec } = require('child_process');
const fs = require('fs');

const logFile = 'env_check_results.txt';
let output = '';

const run = (cmd) => new Promise(resolve => {
  exec(cmd, (error, stdout, stderr) => {
    output += `\n--- COMMAND: ${cmd} ---\n`;
    if (error) output += `ERROR: ${error.message}\n`;
    if (stdout) output += `STDOUT:\n${stdout}\n`;
    if (stderr) output += `STDERR:\n${stderr}\n`;
    resolve();
  });
});

async function check() {
  await run('ffmpeg -version');
  await run('brew --version');
  await run('/opt/homebrew/bin/brew --version');

  fs.writeFileSync(logFile, output);
  console.log('Check complete, results written to ' + logFile);
}

check();
