import { Processor, Queue, QueueEvents, Worker } from 'bullmq';
import { Registry } from 'prom-client';

import { makeGuages, QueueGauges } from '../src/queueGauges';

export interface TestData {
	name: string;
	queue: Queue;
	prefix: string;
	guages: QueueGauges;
	registry: Registry;
	events: QueueEvents;
	worker?: Worker;
}

const connection = { host: process.env.REDIS_HOST ?? 'localhost', port: process.env.REDIS_PORT && parseInt(process.env.REDIS_PORT) || 6379 };

export function makeQueue(name: string = 'TestQueue', prefix: string = 'test-queue'): TestData {
	const registry = new Registry();
	const queue = new Queue(name, { connection });
	const events = new QueueEvents(name, { connection });

	return {
		name,
		queue,
		prefix,
		registry,
		guages: makeGuages('test_stat_', [registry]),
		events,
	};
}

export function makeWorker(name: string = 'TestQueue', func: Processor): Worker {
	return new Worker(name, func, { connection });
}
