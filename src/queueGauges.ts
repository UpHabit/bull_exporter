import bull from 'bull';
import { Gauge } from 'prom-client';

export interface QueueGauges {
  completed: Gauge;
  active: Gauge;
  delayed: Gauge;
  failed: Gauge;
  waiting: Gauge;
}

export async function getStats(prefix: string, name: string, queue: bull.Queue, gauges: QueueGauges): Promise<void> {
  const { completed, active, delayed, failed, waiting } = await queue.getJobCounts();

  gauges.completed.set({ prefix, queue: name }, completed);
  gauges.active.set({ prefix, queue: name }, active);
  gauges.delayed.set({ prefix, queue: name }, delayed);
  gauges.failed.set({ prefix, queue: name }, failed);
  gauges.waiting.set({ prefix, queue: name }, waiting);
}
