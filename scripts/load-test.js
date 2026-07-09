async function runScenario(label, count) {
  const { spawn } = await import('node:child_process');
  const start = Date.now();
  const workers = Array.from({ length: count }, (_, index) => {
    const child = spawn('node', ['-e', "console.log('worker')"], { stdio: 'ignore' });
    return new Promise((resolve) => {
      child.on('exit', () => resolve(index));
    });
  });

  return Promise.all(workers).then(() => {
    const duration = Date.now() - start;
    console.log(`${label}: ${count} workers completed in ${duration}ms`);
  });
}

(async () => {
  await runScenario('100 concurrent users', 100);
  await runScenario('500 concurrent users', 500);
  await runScenario('1000 concurrent users', 1000);
})();
