const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[36m%s\x1b[0m', ' 🚀 KHỞI ĐỘNG HỆ THỐNG N_QTD (BACKEND + FRONTEND) ');
console.log('\x1b[36m%s\x1b[0m', '==================================================\n');

function startProcess(name, colorCode, cwd, args) {
  const p = spawn(npmCmd, args, {
    cwd: path.resolve(__dirname, cwd),
    stdio: 'pipe',
    shell: isWin,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  const color = `\x1b[${colorCode}m`;
  const reset = '\x1b[0m';

  const logWithPrefix = (data) => {
    const text = data.toString();
    const lines = text.split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim().length > 0) {
        console.log(`${color}[${name}]${reset} ${line}`);
      }
    });
  };

  p.stdout.on('data', logWithPrefix);
  p.stderr.on('data', logWithPrefix);

  p.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${color}[${name}]${reset} Tiến trình dừng với mã thoát: ${code}`);
    }
  });

  return p;
}

// Khởi chạy Backend và Frontend song song
const backendProcess = startProcess('BACKEND', '34;1', 'backend', ['run', 'dev']);
const frontendProcess = startProcess('FRONTEND', '32;1', 'frontend', ['run', 'dev']);

let isCleaningUp = false;

function cleanup() {
  if (isCleaningUp) return;
  isCleaningUp = true;

  console.log('\n\x1b[33m%s\x1b[0m', '🛑 Đang dừng toàn bộ tiến trình Backend và Frontend...');

  if (isWin) {
    if (backendProcess.pid) {
      try {
        spawn('taskkill', ['/pid', backendProcess.pid.toString(), '/f', '/t']);
      } catch (e) {}
    }
    if (frontendProcess.pid) {
      try {
        spawn('taskkill', ['/pid', frontendProcess.pid.toString(), '/f', '/t']);
      } catch (e) {}
    }
  } else {
    try {
      backendProcess.kill('SIGINT');
      frontendProcess.kill('SIGINT');
    } catch (e) {}
  }

  setTimeout(() => {
    console.log('\x1b[32m%s\x1b[0m', '✅ Đã dừng hệ thống thành công. Tạm biệt!');
    process.exit(0);
  }, 500);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

