const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const base = 'https://advalle-46fc1873b63d.herokuapp.com/';
const htmlPath = path.join(__dirname, '..', 'prod_index.html');
const outDir = process.cwd();
const patterns = [
  /<iframe/i,
  /eval\(/i,
  /document.write/i,
  /atob\(/i,
  /unescape\(/i,
  /fromCharCode/i,
  /base64,/i,
  /<script\s+src=\"https?:\/\//i,
  /window.location/i,
  /location\.href/i,
  /open\(/i,
  /download=/i,
  /data:text\/html/i
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error('HTTP ' + res.statusCode));
        return;
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async function(){
  if (!fs.existsSync(htmlPath)) {
    console.error('prod_index.html not found at', htmlPath);
    process.exit(1);
  }
  const html = fs.readFileSync(htmlPath,'utf8');
  const re = /<script[^>]+src=["']([^"']+)["']/g;
  const urls = [];
  let m;
  while ((m = re.exec(html)) !== null) urls.push(m[1]);
  if (urls.length === 0) { console.log('No script srcs found'); process.exit(0); }
  if (fs.existsSync('prod_scan_results.txt')) fs.unlinkSync('prod_scan_results.txt');
  for (const src of urls) {
    const url = src.match(/^https?:\/\//) ? src : (base + src.replace(/^\/*/,'') );
    const safeName = 'prod_' + src.replace(/[^A-Za-z0-9_.-]/g,'_');
    try {
      console.log('Fetching', url);
      const content = await fetchUrl(url);
      fs.writeFileSync(safeName, content, 'utf8');
      // scan
      for (const p of patterns) {
        const lines = content.split(/\r?\n/).filter(l => p.test(l));
        for (const L of lines) fs.appendFileSync('prod_scan_results.txt', `${safeName}: ${L}\n`);
      }
    } catch (err) {
      console.error('Failed', url, err.message);
      fs.appendFileSync('prod_scan_results.txt', `FAILED ${url}: ${err.message}\n`);
    }
  }
  console.log('Done. Results in prod_scan_results.txt');
})();
