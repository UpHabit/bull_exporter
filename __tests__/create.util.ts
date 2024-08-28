import { Processor, Queue, QueueEvents, Worker } from 'bullmq';
import { Registry } from 'prom-client';

import { makeGuages, Index } from '../src/queue-gauges';

export interface TestData {
	name: string;
	queue: Queue;
	prefix: string;
	guages: Index;
	registry: Registry;
	events: QueueEvents;
	worker?: Worker;
}

const connection = { host: process.env.REDIS_HOST ?? 'localhost', port: process.env.REDIS_PORT && parseInt(process.env.REDIS_PORT) || 6379 };
// console.debug(`connection: %o; wait: %s`, connection, process.env.WAIT_UNTIL_READY);

async function waitUntilReady(waitable: { waitUntilReady: () => Promise<unknown> }) {
	if (process.env.WAIT_UNTIL_READY === 'TRUE') {
		await waitable.waitUntilReady();
	}
}

export async function makeQueue(name: string = 'TestQueue', prefix: string = 'test-queue'): Promise<TestData> {
	const registry = new Registry();
	const queue = new Queue(name, { connection });
	const events = new QueueEvents(name, { connection });

	await Promise.all([
		waitUntilReady(queue),
		waitUntilReady(events),
	]);

	return {
		name,
		queue,
		prefix,
		registry,
		guages: makeGuages('test_stat_', [registry]),
		events,
	};
}

export async function makeWorker(name: string = 'TestQueue', func: Processor): Promise<Worker> {
	const worker = new Worker(name, func, { connection });
	await waitUntilReady(worker);
	return worker;
}
