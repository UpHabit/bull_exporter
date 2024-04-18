import { Job, Queue } from 'bullmq';
import { Gauge, Registry, Summary } from 'prom-client';

type LabelsT = 'queue' | 'prefix';
export interface QueueGauges {
	completed: Gauge<LabelsT>;
	active: Gauge<LabelsT>;
	delayed: Gauge<LabelsT>;
	failed: Gauge<LabelsT>;
	waiting: Gauge<LabelsT>;
	completeSummary: Summary<LabelsT>;
	prioritized: Gauge<LabelsT>;
}

export function makeGuages(statPrefix: string, registers: Registry[]): QueueGauges {
	return {
		completed: new Gauge({
			registers,
			name: `${statPrefix}completed`,
			help: 'Number of completed messages',
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
			help: 'Number of failed messages',
			labelNames: ['queue', 'prefix'],
		}),
		waiting: new Gauge({
			registers,
			name: `${statPrefix}waiting`,
			help: 'Number of waiting messages',
			labelNames: ['queue', 'prefix'],
		}),
		prioritized: new Gauge({
			registers,
			name: `${statPrefix}prioritized`,
			help: 'Number of prioritized messages',
			labelNames: ['queue', 'prefix'],
		}),
	};
}

export async function getJobCompleteStats(prefix: string, name: string, job: Job, gauges: QueueGauges): Promise<void> {
	if (!job.finishedOn) {
		return;
	}
	const duration = job.finishedOn - job.processedOn!;
	gauges.completeSummary.observe({ prefix, queue: name }, duration);
}

export async function getStats(prefix: string, name: string, queue: Queue, gauges: QueueGauges): Promise<void> {
	const { completed, active, delayed, failed, waiting, prioritized } = await queue.getJobCounts();

	gauges.completed.set({ prefix, queue: name }, completed);
	gauges.active.set({ prefix, queue: name }, active);
	gauges.delayed.set({ prefix, queue: name }, delayed);
	gauges.failed.set({ prefix, queue: name }, failed);
	gauges.waiting.set({ prefix, queue: name }, waiting);
	gauges.prioritized.set({ prefix, queue: name }, prioritized);
}
