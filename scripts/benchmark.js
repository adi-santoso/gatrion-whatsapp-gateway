const BASE_URL = 'http://localhost:3000/api';
const API_KEY = process.env.API_KEY || 'your-secret-api-key';

const TARGETS = {
  '/health': 20,
  '/status': 100,
  '/qr': 200,
  '/send-text': 1000,
  '/send-image': 5000
};

async function request(path, options = {}) {
  const start = performance.now();
  try {
    const response = await fetch(BASE_URL + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const end = performance.now();
    return { status: response.status, time: end - start, ok: response.ok };
  } catch (error) {
    const end = performance.now();
    return { status: 0, time: end - start, ok: false, error: error.message };
  }
}

async function benchmarkEndpoint(name, path, options = {}) {
  const runs = 5;
  const times = [];
  
  for (let i = 0; i < runs; i++) {
    const result = await request(path, options);
    if (result.time) times.push(result.time);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const target = TARGETS[path] || 1000;
  const pass = avg < target;
  
  return { name, path, avg, target, pass };
}

async function measureMemory(operation) {
  const initial = process.memoryUsage();
  
  await operation();
  
  if (global.gc) global.gc();
  
  const final = process.memoryUsage();
  
  return {
    initial: (initial.heapUsed / 1024 / 1024).toFixed(2),
    final: (final.heapUsed / 1024 / 1024).toFixed(2),
    growth: ((final.heapUsed - initial.heapUsed) / 1024 / 1024).toFixed(2)
  };
}

async function runBenchmarks() {
  console.log('='.repeat(60));
  console.log('WhatsApp Gateway Benchmark Report');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log('='.repeat(60));
  console.log();

  const results = [];

  // Benchmark health endpoint
  console.log('Benchmarking /health...');
  results.push(await benchmarkEndpoint('Health Check', '/health'));

  // Benchmark status endpoint (requires auth)
  console.log('Benchmarking /status...');
  results.push(await benchmarkEndpoint('Status', '/status', {
    headers: { 'x-api-key': API_KEY }
  }));

  // Benchmark QR endpoint (requires auth)
  console.log('Benchmarking /qr...');
  results.push(await benchmarkEndpoint('QR Code', '/qr', {
    headers: { 'x-api-key': API_KEY }
  }));

  // Benchmark send-text endpoint (requires auth)
  console.log('Benchmarking /send-text...');
  results.push(await benchmarkEndpoint('Send Text', '/send-text', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY },
    body: JSON.stringify({ to: '1234567890', message: 'benchmark test' })
  }));

  console.log();
  console.log('Endpoint Performance:');
  console.log('-'.repeat(60));
  results.forEach(r => {
    const status = r.pass ? '✓ PASS' : '✗ FAIL';
    console.log(`${status} ${r.name.padEnd(20)} ${r.avg.toFixed(2).padStart(8)}ms (target: ${r.target}ms)`);
  });

  // Memory test
  console.log();
  console.log('Memory Usage:');
  console.log('-'.repeat(60));
  
  const memory = await measureMemory(async () => {
    for (let i = 0; i < 10; i++) {
      await request('/health');
    }
  });

  console.log(`Initial:  ${memory.initial} MB`);
  console.log(`Final:    ${memory.final} MB`);
  console.log(`Growth:   ${memory.growth} MB`);

  console.log();
  console.log('='.repeat(60));
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  console.log(`Summary: ${passed}/${total} tests passed`);
  console.log('='.repeat(60));

  process.exit(passed === total ? 0 : 1);
}

runBenchmarks().catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
