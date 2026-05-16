const { spawn, exec } = require('child_process');
const http = require('http');

const next = spawn('npx', ['next', 'dev'], { stdio: 'inherit', shell: true });

const tryOpen = () => {
  http.get('http://localhost:3000', () => {
    exec('start chrome http://localhost:3000');
  }).on('error', () => {
    setTimeout(tryOpen, 1000);
  });
};

setTimeout(tryOpen, 2000);

next.on('close', (code) => process.exit(code));
