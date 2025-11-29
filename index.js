const { program } = require('commander');
const http = require('http');
const fs = require('fs');

program
  .requiredOption('-h, --host <address>', 'host address')
  .requiredOption('-p, --port <number>', 'server port')
  .requiredOption('-c, --cache <path>', 'path to cache directory');

program.parse();
const options = program.opts();

const dir = `./${options.cache}`;
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

const origin = `http://${options.host}:${options.port}`;

const server = http.createServer();

server.listen(options.port, options.host, () => {
  console.log(`Server running at ${origin}/`);
});

