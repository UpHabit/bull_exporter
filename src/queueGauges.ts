import bull from 'bull';
import { Gauge, Registry, Summary, Counter } from 'prom-client';

type LabelsT = 'queue' | 'prefix';
export interface QueueGauges {
  completed: Gauge<LabelsT>;
  active: Gauge<LabelsT>;
  delayed: Gauge<LabelsT>;
  failed: Gauge<LabelsT>;
  waiting: Gauge<LabelsT>;
  completeSummary: Summary<LabelsT>;
  totalFailed: Counter<LabelsT>;
  totalCompleted: Counter<LabelsT>;
}

export function makeGuages(statPrefix: string, registers: Registry[]): QueueGauges {
  return {
    completed: new Gauge({
      registers,
      name: `${statPrefix}completed`,
      help: 'Number of completed messages (not yet deleted)',
      labelNames: ['queue', 'prefix'],
    }),
    completeSummary: new Summary({
      registers,
      name: `${statPrefix}complete_duration`,
      help: 'Time to complete jobs',
      labelNames: ['queue', 'prefix'],
      maxAgeSeconds: 300,
      ageBuckets: 13,
    }),
    active: new Gauge({
      registers,
      name: `${statPrefix}active`,
      help: 'Number of active messages',
      labelNames: ['queue', 'prefix'],
    }),
    delayed: new Gauge({
      registers,
      name: `${statPrefix}delayed`,
      help: 'Number of delayed messages',
      labelNames: ['queue', 'prefix'],
    }),
    failed: new Gauge({
      registers,
      name: `${statPrefix}failed`,
      help: 'Number of failed messages (not yet deleted)',
      labelNames: ['queue', 'prefix'],
    }),
    waiting: new Gauge({
      registers,
      name: `${statPrefix}waiting`,
      help: 'Number of waiting messages',
      labelNames: ['queue', 'prefix'],
    }),
    totalFailed: new Counter({
      registers,
      name: `${statPrefix}total_failed`,
      help: 'Total number of failed messages',
      labelNames: ['queue', 'prefix'],
    }),
    totalCompleted: new Counter({
      registers,
      name: `${statPrefix}total_completed`,
      help: 'Total number of completed messages',
      labelNames: ['queue', 'prefix'],
    }),
  };
}

export async function getJobCompleteStats(prefix: string, name: string, job: bull.Job, gauges: QueueGauges): Promise<void> {
  if (!job.finishedOn) {
    return;
  }
  const duration = job.finishedOn - job.processedOn!;
  gauges.completeSummary.observe({ prefix, queue: name }, duration);
}

export async function incrementJobTotalCompletedCounter(prefix: string, name: string, gauges: QueueGauges): Promise<void> {

  gauges.totalCompleted.inc({ prefix, queue: name }, 1);
}

export async function incrementJobTotalFailedCounter(prefix: string, name: string, gauges: QueueGauges): Promise<void> {

  gauges.totalFailed.inc({ prefix, queue: name }, 1);
}

export async function getStats(prefix: string, name: string, queue: bull.Queue, gauges: QueueGauges): Promise<void> {
  const { completed, active, delayed, failed, waiting } = await queue.getJobCounts();

  gauges.completed.set({ prefix, queue: name }, completed);
  gauges.active.set({ prefix, queue: name }, active);
  gauges.delayed.set({ prefix, queue: name }, delayed);
  gauges.failed.set({ prefix, queue: name }, failed);
  gauges.waiting.set({ prefix, queue: name }, waiting);
}
