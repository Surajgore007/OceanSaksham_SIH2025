/**
 * Backend Load Testing Benchmark
 * Measures concurrent throughput (req/s), p50, p95, and p99 latency against the REST & Triage API.
 */

const http = require('http');
const os = require('os');

const CONCURRENCY = 20;
const TOTAL_REQUESTS = 500;
const HOST = 'localhost';
const PORT = 5000;
const PATH = '/api/reports?sort_by=credibility';

let completed = 0;
let latencies = [];
let startTime;

function sendRequest() {
  return new Promise((resolve) => {
    const t0 = process.hrtime();
    const req = http.get({ host: HOST, port: PORT, path: PATH }, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const diff = process.hrtime(t0);
        const ms = diff[0] * 1000 + diff[1] / 1e6;
        latencies.push(ms);
        completed++;
        resolve();
      });
    });
    req.on('error', (err) => {
      latencies.push(null);
      completed++;
      resolve();
    });
  });
}

async function runPool() {
  const workers = [];
  let reqIdx = 0;

  async function worker() {
    while (reqIdx < TOTAL_REQUESTS) {
      reqIdx++;
      await sendRequest();
    }
  }

  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
}

async function main() {
  console.log('='.repeat(60));
  console.log(`OceanSaksham Backend Load Benchmark`);
  console.log(`Hardware: ${os.cpus()[0].model} (${os.cpus().length} vCPUs), ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB RAM`);
  console.log(`Testing Concurrency: ${CONCURRENCY}, Total Requests: ${TOTAL_REQUESTS}`);
  console.log('='.repeat(60));

  startTime = Date.now();
  await runPool();
  const durationSec = (Date.now() - startTime) / 1000;

  const validLatencies = latencies.filter(l => l !== null).sort((a, b) => a - b);
  const throughput = Math.round(validLatencies.length / durationSec);

  const p50 = validLatencies[Math.floor(validLatencies.length * 0.50)].toFixed(2);
  const p95 = validLatencies[Math.floor(validLatencies.length * 0.95)].toFixed(2);
  const p99 = validLatencies[Math.floor(validLatencies.length * 0.99)].toFixed(2);
  const avg = (validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length).toFixed(2);

  const results = {
    hardware: `${os.cpus()[0].model} (${os.cpus().length} cores, ${Math.round(os.totalmem() / (1024 * 1024 * 1024))}GB RAM)`,
    total_requests: TOTAL_REQUESTS,
    concurrency: CONCURRENCY,
    duration_s: durationSec.toFixed(2),
    throughput_req_s: throughput,
    latency_ms: {
      mean: avg,
      p50: p50,
      p95: p95,
      p99: p99
    }
  };

  console.log(`Completed in ${durationSec.toFixed(2)}s`);
  console.log(`Throughput: ${throughput} req/s`);
  console.log(`Latency: Mean=${avg}ms, p50=${p50}ms, p95=${p95}ms, p99=${p99}ms`);
  console.log('='.repeat(60));

  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(path.join(__dirname, 'benchmark_results.json'), JSON.stringify(results, null, 2));
}

main();
