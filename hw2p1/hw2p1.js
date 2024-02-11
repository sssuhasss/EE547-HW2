const http = require('http');
const fs = require('fs');
const url = require('url');

let requestCount = 0;
let errorCount = 0;

const factorial = (n) => {
  let result = BigInt(1);
  for (let i = BigInt(2); i <= n; i++) {
    result *= i;
  }
  return result;
};

const countAnagrams = (p) => {
  if (!p || /[^a-zA-Z]+/.test(p)) return null; 

  const frequency = {};
  for (const char of p) {
    frequency[char] = (frequency[char] || 0) + 1;
  }
  
  let denominator = BigInt(1);
  Object.values(frequency).forEach(count => {
    denominator *= factorial(BigInt(count));
  });
  
  return (factorial(BigInt(p.length)) / denominator).toString();
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  requestCount++;

  switch (path) {
    case '/ping':
      res.writeHead(204);
      res.end();
      break;
    case '/anagram':
      const { p } = parsedUrl.query;
      const totalAnagrams = countAnagrams(p);;
      if (totalAnagrams === null) {
        res.writeHead(400);
        res.end();
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ p, total: totalAnagrams }));
      }
      break;
    case '/secret':
      fs.readFile('/tmp/secret.key', (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end();
          errorCount++;
        } else {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(data);
        }
      });
      break;
    case '/status':
      const now = new Date();
      const time = now.toISOString().replace(/\.\d{3}/, ''); 

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ time, req: requestCount, err: errorCount }));
      break;
    default:
      res.writeHead(404);
      res.end();
      errorCount++;
      break;
  }
});

server.listen(8088, () => {
  console.log('Server running on port 8088');
});
