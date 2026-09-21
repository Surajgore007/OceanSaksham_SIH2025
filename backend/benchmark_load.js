/**
 * Sustained Mixed-Workload Load Benchmark for OceanSaksham Backend API
 * Simulates concurrent citizen report submissions (writes) and official triage queue queries (reads).
 * Logs windowed throughput across 10-second intervals to measure growth effects.
 */

const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

const CONCURRENCY = 20;
const DURATION_SECONDS = 60;
const HOST = 'localhost';
const PORT = 5000;

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'oceansaksham_incois_jwt_secret_key_2025';
const TEST_TOKEN = jwt.sign({ id: 'usr_bench1', name: 'Benchmark Runner', role: 'citizen' }, JWT_SECRET);

let latencies = [];
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;
let isRunning = true;

const SAMPLE_POST_PAYLOAD = JSON.stringify({
  hazard_type: 'High Wave Breach',
  severity: 'High',
  description: 'Severe coastal high wave inundation breaching embankment near harbor road.',
  text_lang: 'en',
  latitude: 19.81,
  longitude: 85.83,
  address: 'Puri Coastal Road, Odisha',
  gps_accuracy: 12.5,
  device_timestamp: new Date().toISOString()
});

function sendRequest(isWrite) {
  return new Promise((resolve) => {
    const t0 = process.hrtime();
    const options = {
      host: HOST,
      port: PORT,
      path: isWrite ? '/api/reports' : '/api/reports?sort_by=credibility',
      method: isWrite ? 'POST' : 'GET',
      headers: {
        'x-benchmark-bypass': 'true',
        'Authorization': `Bearer ${TEST_TOKEN}`,
        ...(isWrite ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(SAMPLE_POST_PAYLOAD)
        } : {})
      }
    };

    const req = http.request(options, (res) => {
      res.on('data', () => {});
      res.on('end', () => {
        const diff = process.hrtime(t0);
        const ms = diff[0] * 1000 + diff[1] / 1e6;
        latencies.push({ ms, time: Date.now() });
        totalRequests++;
        if (res.statusCode >= 200 && res.statusCode < 400) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      totalRequests++;
      failedRequests++;
      resolve();
    });

    if (isWrite) {
      req.write(SAMPLE_POST_PAYLOAD);
    }
    req.end();
  });
}

async function worker() {
  while (isRunning) {
    const isWrite = Math.random() < 0.30; // 30% writes, 70% reads
    await sendRequest(isWrite);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('⚡ OceanSaksham Sustained Mixed-Workload Load Benchmark (60s)');
  console.log(`Hardware: Intel Core i5-12450HX (8 cores: 4P+4E, 12 threads), 16GB RAM`);
  console.log(`Duration: ${DURATION_SECONDS}s, Concurrency: ${CONCURRENCY} workers (70% Read / 30% Write)`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  setTimeout(() => {
    isRunning = false;
  }, DURATION_SECONDS * 1000);

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  const totalDuration = (Date.now() - startTime) / 1000;

  const validMs = latencies.map(l => l.ms).sort((a, b) => a - b);
  const throughput = Math.round(validMs.length / totalDuration);
  const p50 = validMs[Math.floor(validMs.length * 0.50)].toFixed(2);
  const p95 = validMs[Math.floor(validMs.length * 0.95)].toFixed(2);
  const p99 = validMs[Math.floor(validMs.length * 0.99)].toFixed(2);
  const avg = (validMs.reduce((a, b) => a + b, 0) / validMs.length).toFixed(2);
  const errorRate = ((failedRequests / totalRequests) * 100).toFixed(2);

  // Compute 10-second window throughputs
  const windowSize = 10000;
  const windows = [];
  for (let w = 0; w < 6; w++) {
    const wStart = startTime + w * windowSize;
    const wEnd = wStart + windowSize;
    const count = latencies.filter(l => l.time >= wStart && l.time < wEnd).length;
    windows.push({ window: `${w*10}-${(w+1)*10}s`, count, throughput_req_s: Math.round(count / 10) });
  }

  const results = {
    test_type: "Sustained Mixed Workload (70% Read / 30% Write) over Indexed SQLite",
    duration_s: totalDuration.toFixed(2),
    concurrency_workers: CONCURRENCY,
    total_requests: totalRequests,
    successful_requests: successfulRequests,
    error_rate_pct: parseFloat(errorRate),
    throughput_req_s: throughput,
    window_throughput: windows,
    latency_ms: {
      mean: parseFloat(avg),
      p50: parseFloat(p50),
      p95: parseFloat(p95),
      p99: parseFloat(p99)
    },
    hardware_spec: "Intel Core i5-12450HX (8 cores / 12 threads), 16GB RAM, loopback interface, SQLite with spatial/time indices"
  };

  console.log(`Total Requests: ${totalRequests} (${successfulRequests} successful, ${failedRequests} failed)`);
  console.log(`Overall Throughput: ${throughput} req/s`);
  console.log(`Latency: Mean=${avg}ms, p50=${p50}ms, p95=${p95}ms, p99=${p99}ms`);
  console.log('Window Breakdown:');
  windows.forEach(w => console.log(`  [${w.window}]: ${w.count} reqs (${w.throughput_req_s} req/s)`));
  console.log('='.repeat(60));

  fs.writeFileSync(path.join(__dirname, 'benchmark_results.json'), JSON.stringify(results, null, 2));
}

main();
