/* ── src/network.js — public IP check and DDNS update ───────────────────────
──────────────────────────────────────────────────────────────────────────── */

const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const config = require('../config');

const IP_CACHE_PATH = path.join(__dirname, '..', '.last_public_ip');

// ── Fetch current public IP from one of several lightweight services ────────
function getPublicIp() {
  const services = [
    'https://api.ipify.org',
    'https://icanhazip.com',
    'https://checkip.amazonaws.com',
  ];

  return services.reduce((promise, url) => {
    return promise.catch(() => new Promise((resolve, reject) => {
      https.get(url, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          const ip = d.trim();
          /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? resolve(ip) : reject(new Error('Not an IP'));
        });
      }).on('error', reject);
    }));
  }, Promise.reject(new Error('no services tried')))
    .catch(() => null);
}

// ── Hit the FreeDNS update URL to point the domain at a new IP ─────────────
function updateDdns(publicIp) {
  if (!config.FREEDNS_UPDATE_URL) return Promise.resolve();
  return new Promise((resolve) => {
    https.get(config.FREEDNS_UPDATE_URL, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(`   DDNS:    updated ${config.DOMAIN} → ${publicIp}`);
        resolve();
      });
    }).on('error', e => {
      console.log(`   DDNS:    update failed — ${e.message}`);
      resolve();
    });
  });
}

// ── Print local network addresses ──────────────────────────────────────────
function printAddresses(port) {
  const ifaces = os.networkInterfaces();
  console.log('\n köfi is running!\n');
  console.log(`   Local:   http://localhost:${port}`);
  for (const addrs of Object.values(ifaces)) {
    for (const a of addrs) {
      if (a.family === 'IPv4' && !a.internal) {
        console.log(`   Network: http://${a.address}:${port}`);
      }
    }
  }
  if (config.DOMAIN) console.log(`   Domain:  ${config.DOMAIN}`);
  console.log('');
}

// ── Run public IP check and DDNS update after server starts ────────────────
async function runIpCheck() {
  const publicIp = await getPublicIp();
  if (!publicIp) {
    console.log('   Public IP: could not determine (no internet?)\n');
    return;
  }

  const lastIp = fs.existsSync(IP_CACHE_PATH)
    ? fs.readFileSync(IP_CACHE_PATH, 'utf8').trim()
    : null;

  if (publicIp !== lastIp) {
    console.log(`\n   Public IP changed: ${lastIp || 'unknown'} → ${publicIp}`);
    if (config.FREEDNS_UPDATE_URL) {
      await updateDdns(publicIp);
    } else {
      console.log(`   Update ${config.DOMAIN || 'your DNS'} A record → ${publicIp}`);
      console.log(`   Then set FREEDNS_UPDATE_URL in config.js to automate this.\n`);
    }
    fs.writeFileSync(IP_CACHE_PATH, publicIp);
  } else {
    console.log(`   Public IP: ${publicIp} (unchanged)\n`);
  }
}

module.exports = { printAddresses, runIpCheck };
