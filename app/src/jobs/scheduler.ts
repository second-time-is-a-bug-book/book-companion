// A tiny scheduler: run a job now and then every intervalMs,
// one run at a time. A run that throws is logged and the
// schedule continues.
export function every(
  intervalMs: number,
  job: () => void | Promise<void>,
): () => void {
  let running = false;
  const tick = async () => {
    if (running) return; // never overlap runs
    running = true;
    try {
      await job();
    } catch (error) {
      console.error('scheduled job failed:', error);
    } finally {
      running = false;
    }
  };
  void tick();
  const timer = setInterval(tick, intervalMs);
  return () => clearInterval(timer);
}
